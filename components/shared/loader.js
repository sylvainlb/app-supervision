// Loader v2 — hot loading of distant features (app-store-spec.md
// Part 2 §2.2). Decision O-A1 adopted: fetch + MANUAL SHA-384 check before
// import() (the integrity attribute does not apply to import() — a compromised CDN
// would otherwise sign its own XSS).
//
//   const mod = await loadRemoteModule({ cdnUrl, sri, tag });
//   → fetch(cdnUrl) → crypto.subtle.digest('SHA-384') → compare with `sri` →
//     import via URL.createObjectURL(new Blob([src], {type:'text/javascript'}))
//   → CA-A5: sri missing/invalid → SriMismatchError, NO import.
//
// Cache: moduleCache[cdnUrl] = { src, module, blobUrl } ; evictModule(cdnUrl)
// revokes (revocation §2.2.4: remove from cache + revoke the blob URL).
//
// In tests, inject { fetchFn, importFn } (node --test, no browser).

export class SriMismatchError extends Error {
  constructor(message = 'Invalid SRI — import refused (CA-A5)') {
    super(message);
    this.name = 'SriMismatchError';
    this.code = 'sri_mismatch';
  }
}

export class MissingSriError extends SriMismatchError {
  constructor(message = 'No sri in the catalogue — import refused (CA-A5)') {
    super(message);
    this.name = 'MissingSriError';
    this.code = 'sri_missing';
  }
}

// sha384 of an ArrayBuffer → base64 (integrity attribute format: "sha384-<b64>").
export async function sha384Base64(buffer) {
  const digest = await crypto.subtle.digest('SHA-384', buffer);
  return btoa(String.fromCharCode(...new Uint8Array(digest)));
}

// Checks a binary against a "sha384-<base64>" fingerprint. Throws MissingSriError
// if sri is absent, SriMismatchError if the hash differs.
export async function checkSri(buffer, sri) {
  if (!sri || typeof sri !== 'string') throw new MissingSriError();
  const m = sri.match(/^sha384-([A-Za-z0-9+/]+={0,2})$/);
  if (!m) throw new SriMismatchError(`invalid sri format (expected sha384-<base64>): ${sri}`);
  const actual = await sha384Base64(buffer);
  // constant-time comparison
  if (actual.length !== m[1].length || !timingSafeEqual(actual, m[1])) {
    throw new SriMismatchError(`expected sha384 ${m[1]}, got ${actual}`);
  }
  return true;
}

function timingSafeEqual(a, b) {
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

// Cache of already imported modules (by cdnUrl): { src, sri, module, blobUrl }.
// The sri is kept: a cache hit does NOT skip the check —
// if the catalogue announces an sri different from the cached module → SriMismatchError
// (the upgrade goes through evictModule + explicit re-fetch, upgradeFeature).
const moduleCache = new Map();

export function cachedModule(cdnUrl) {
  return moduleCache.get(cdnUrl) ?? null;
}

// Revocation (§2.2.4): removes the module from the cache and revokes the blob URL.
// (A custom element cannot be "unregistered" in JS — we remove the DOM
// instances via <dynamic-feature> and block re-mounting via the cache.)
export function evictModule(cdnUrl) {
  const entry = moduleCache.get(cdnUrl);
  if (entry?.blobUrl) { try { URL.revokeObjectURL(entry.blobUrl); } catch { /* noop */ } }
  moduleCache.delete(cdnUrl);
  return !!entry;
}

/**
 * Loads a distant module with SRI verification (O-A1).
 * @param {{cdnUrl:string, sri:string, tag?:string}} feature — cdn_url + sri from the v2 catalogue
 * @param {{fetchFn?:Function, importFn?:Function}} [deps] — injectable for tests
 * @returns {Promise<{module:object, src:string, blobUrl:string}>} imported module
 * @throws {MissingSriError|SriMismatchError} CA-A5 — no import if sri invalid
 */
export async function loadRemoteModule(feature, deps = {}) {
  const { cdnUrl, sri, tag } = feature ?? {};
  if (!cdnUrl) throw new Error('loadRemoteModule: missing cdnUrl (distant feature without cdn_url)');
  const hit = moduleCache.get(cdnUrl);
  if (hit) {
    if (sri && hit.sri && sri !== hit.sri) {
      throw new SriMismatchError(`catalogue sri (${sri}) ≠ cached module sri (${hit.sri}) — evictModule + re-fetch required`);
    }
    return { module: hit.module, src: hit.src, blobUrl: hit.blobUrl };
  }

  // The tag is already registered (e.g. the dashboard bundle also embeds <anomaly-list>):
  // do NOT re-import — CustomElementRegistry.define would throw "already defined".
  if (tag && typeof customElements !== 'undefined' && customElements.get(tag)) {
    moduleCache.set(cdnUrl, { src: null, sri, module: null, blobUrl: null, alreadyRegistered: tag });
    return { module: null, src: null, blobUrl: null, alreadyRegistered: true };
  }

  const fetchFn = deps.fetchFn ?? ((...a) => fetch(...a));
  const res = await fetchFn(cdnUrl);
  if (!res || !res.ok) throw new Error(`fetch ${cdnUrl} → ${res?.status ?? 'ERR'}`);
  const src = await res.text();
  const buf = new TextEncoder().encode(src).buffer;
  await checkSri(buf, sri); // CA-A5: throws before any import

  // dynamic import() via blob URL (the integrity attribute does not apply to import())
  const blobUrl = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
  const importFn = deps.importFn ?? ((u) => import(/* @vite-ignore */ u));
  let module;
  try {
    module = await importFn(blobUrl);
  } catch (e) {
    try { URL.revokeObjectURL(blobUrl); } catch { /* noop */ }
    throw e;
  }
  if (tag && typeof customElements !== 'undefined' && !customElements.get(tag)) {
    try { URL.revokeObjectURL(blobUrl); } catch { /* noop */ }
    throw new Error(`module ${cdnUrl} did not register <${tag}>`);
  }
  moduleCache.set(cdnUrl, { src, sri, module, blobUrl });
  return { module, src, blobUrl };
}
