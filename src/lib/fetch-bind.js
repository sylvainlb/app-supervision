// Preload to import FIRST in src/index.ts.
//
// 1. cross-fetch (bundled in @inrupt/solid-client-authn-browser) grabs fetch via
//    the prototype of a ponyfill object (exports.fetch = ctx.fetch) → fetch NOT bound →
//    "TypeError: Illegal invocation" in Chromium. We bind globalThis.fetch BEFORE
//    the library initializes.
//
// 2. The lib reads the OIDC JWKS with `keys[0]` without filtering (fetchJwks2 from
//    solid-client-authn-core). But Keycloak lists the ENCRYPTION key (use:enc,
//    RSA-OAEP) first → id_token signature verification fails
//    (JWSSignatureVerificationFailed). We rewrite the /certs response to keep only
//    the signature keys (use:sig), so that keys[0] is the right one.
if (typeof globalThis.fetch === 'function' && !globalThis.fetch.__sibBound) {
  const nativeFetch = globalThis.fetch.bind(globalThis);
  const wrapped = async (input, init) => {
    const res = await nativeFetch(input, init);
    try {
      const url = typeof input === 'string' ? input : input?.url ?? '';
      if (url.includes('/protocol/openid-connect/certs') && res.ok) {
        const body = await res.json();
        const sig = (body?.keys ?? []).filter((k) => k.use === 'sig');
        if (sig.length > 0 && sig.length !== body.keys.length) {
          return new Response(JSON.stringify({ keys: sig }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          });
        }
      }
    } catch { /* not a JWKS → let it through */ }
    return res;
  };
  try { Object.defineProperty(wrapped, '__sibBound', { value: true }); } catch { /* noop */ }
  globalThis.fetch = wrapped;
}
