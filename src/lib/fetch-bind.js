// Pré-chargement à importer EN PREMIER dans src/index.ts.
//
// 1. cross-fetch (bundlé dans @inrupt/solid-client-authn-browser) récupère fetch via
//    le prototype d'un objet ponyfill (exports.fetch = ctx.fetch) → fetch NON bindé →
//    « TypeError: Illegal invocation » dans Chromium. On bind globalThis.fetch AVANT
//    l'initialisation de la librairie.
//
// 2. La lib lit le JWKS OIDC avec `keys[0]` sans filtrer (fetchJwks2 de
//    solid-client-authn-core). Or Keycloak liste la clé de CHIFFREMENT (use:enc,
//    RSA-OAEP) en premier → vérification de signature de l'id_token échoue
//    (JWSSignatureVerificationFailed). On réécrit la réponse /certs pour ne garder
//    que les clés de signature (use:sig), pour que keys[0] soit la bonne.
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
    } catch { /* pas un JWKS → on laisse passer */ }
    return res;
  };
  try { Object.defineProperty(wrapped, '__sibBound', { value: true }); } catch { /* noop */ }
  globalThis.fetch = wrapped;
}
