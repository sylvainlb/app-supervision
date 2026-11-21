// Loader v2 — chargement à chaud des features distantes (spec app-store-spec.md
// Partie 2 §2.2). Décision O-A1 retenue : fetch + vérification SHA-384 MANUELLE avant
// import() (l'attribut integrity ne s'applique pas à import() — un CDN compromis
// signerait sinon son propre XSS).
//
//   const mod = await loadRemoteModule({ cdnUrl, sri, tag });
//   → fetch(cdnUrl) → crypto.subtle.digest('SHA-384') → compare à `sri` →
//     import via URL.createObjectURL(new Blob([src], {type:'text/javascript'}))
//   → CA-A5 : sri absent/invalide → SriMismatchError, AUCUN import.
//
// Cache : moduleCache[cdnUrl] = { src, module, blobUrl } ; evictModule(cdnUrl)
// révoque (révocation §2.2.4 : retire du cache + révoque le blob URL).
//
// En test, injecter { fetchFn, importFn } (node --test, sans navigateur).

export class SriMismatchError extends Error {
  constructor(message = 'SRI invalide — import refusé (CA-A5)') {
    super(message);
    this.name = 'SriMismatchError';
    this.code = 'sri_mismatch';
  }
}

export class MissingSriError extends SriMismatchError {
  constructor(message = 'Pas de sri dans le catalogue — import refusé (CA-A5)') {
    super(message);
    this.name = 'MissingSriError';
    this.code = 'sri_missing';
  }
}

// sha384 d'un ArrayBuffer → base64 (format de l'attribut integrity : "sha384-<b64>").
export async function sha384Base64(buffer) {
  const digest = await crypto.subtle.digest('SHA-384', buffer);
  return btoa(String.fromCharCode(...new Uint8Array(digest)));
}

// Vérifie un binaire contre une empreinte "sha384-<base64>". Lève MissingSriError
// si sri est absent, SriMismatchError si le hash diffère.
export async function checkSri(buffer, sri) {
  if (!sri || typeof sri !== 'string') throw new MissingSriError();
  const m = sri.match(/^sha384-([A-Za-z0-9+/]+={0,2})$/);
  if (!m) throw new SriMismatchError(`format sri invalide (attendu sha384-<base64>) : ${sri}`);
  const actual = await sha384Base64(buffer);
  // comparaison en temps constant
  if (actual.length !== m[1].length || !timingSafeEqual(actual, m[1])) {
    throw new SriMismatchError(`sha384 attendu ${m[1]}, obtenu ${actual}`);
  }
  return true;
}

function timingSafeEqual(a, b) {
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

// Cache des modules déjà importés (par cdnUrl) : { src, sri, module, blobUrl }.
// Le sri est conservé : un hit de cache ne dispense PAS de la vérification —
// si le catalogue annonce un sri différent du module caché → SriMismatchError
// (l'upgrade passe par evictModule + re-fetch explicite, upgradeFeature).
const moduleCache = new Map();

export function cachedModule(cdnUrl) {
  return moduleCache.get(cdnUrl) ?? null;
}

// Révocation (§2.2.4) : retire le module du cache et révoque le blob URL.
// (Un custom element ne peut pas être « désenregistré » en JS — on retire les
// instances du DOM via <dynamic-feature> et on bloque le re-montage via le cache.)
export function evictModule(cdnUrl) {
  const entry = moduleCache.get(cdnUrl);
  if (entry?.blobUrl) { try { URL.revokeObjectURL(entry.blobUrl); } catch { /* noop */ } }
  moduleCache.delete(cdnUrl);
  return !!entry;
}

/**
 * Charge un module distant avec vérification SRI (O-A1).
 * @param {{cdnUrl:string, sri:string, tag?:string}} feature — cdn_url + sri du catalogue v2
 * @param {{fetchFn?:Function, importFn?:Function}} [deps] — injectables pour les tests
 * @returns {Promise<{module:object, src:string, blobUrl:string}>} module importé
 * @throws {MissingSriError|SriMismatchError} CA-A5 — aucun import si sri invalide
 */
export async function loadRemoteModule(feature, deps = {}) {
  const { cdnUrl, sri, tag } = feature ?? {};
  if (!cdnUrl) throw new Error('loadRemoteModule: cdnUrl manquant (feature distante sans cdn_url)');
  const hit = moduleCache.get(cdnUrl);
  if (hit) {
    if (sri && hit.sri && sri !== hit.sri) {
      throw new SriMismatchError(`sri du catalogue (${sri}) ≠ sri du module en cache (${hit.sri}) — evictModule + re-fetch requis`);
    }
    return { module: hit.module, src: hit.src, blobUrl: hit.blobUrl };
  }

  // Le tag est déjà enregistré (ex. le bundle dashboard embarque aussi <anomaly-list>) :
  // ne PAS réimporter — CustomElementRegistry.define lèverait « already defined ».
  if (tag && typeof customElements !== 'undefined' && customElements.get(tag)) {
    moduleCache.set(cdnUrl, { src: null, sri, module: null, blobUrl: null, alreadyRegistered: tag });
    return { module: null, src: null, blobUrl: null, alreadyRegistered: true };
  }

  const fetchFn = deps.fetchFn ?? ((...a) => fetch(...a));
  const res = await fetchFn(cdnUrl);
  if (!res || !res.ok) throw new Error(`fetch ${cdnUrl} → ${res?.status ?? 'ERR'}`);
  const src = await res.text();
  const buf = new TextEncoder().encode(src).buffer;
  await checkSri(buf, sri); // CA-A5 : lève avant tout import

  // import() dynamique via blob URL (l'attribut integrity ne joue pas sur import())
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
    throw new Error(`le module ${cdnUrl} n'a pas enregistré <${tag}>`);
  }
  moduleCache.set(cdnUrl, { src, sri, module, blobUrl });
  return { module, src, blobUrl };
}
