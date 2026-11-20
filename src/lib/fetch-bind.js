// cross-fetch (bundlé dans @inrupt/solid-client-authn-browser) récupère fetch via
// le prototype d'un objet ponyfill (exports.fetch = ctx.fetch) → fetch NON bindé →
// « TypeError: Illegal invocation » dans Chromium quand la lib appelle fetchJwks.
// On bind globalThis.fetch AVANT l'initialisation de la librairie : ce module doit
// rester le PREMIER import de src/index.ts.
if (typeof globalThis.fetch === 'function' && !globalThis.fetch.__sibBound) {
  const bound = globalThis.fetch.bind(globalThis);
  try { Object.defineProperty(bound, '__sibBound', { value: true }); } catch { /* noop */ }
  globalThis.fetch = bound;
}
