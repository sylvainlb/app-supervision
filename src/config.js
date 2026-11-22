// Environment config (front spec §1.4, §13.6): nothing hard-coded.
// POD_URL / OIDC_ISSUER / OIDC_CLIENT_ID injected at build time from env (Vite define).
// Fallbacks for running under Node (tests): import.meta.env does not exist there.
const env = (typeof import.meta !== 'undefined' && import.meta.env) || {};

export const config = {
  podUrl: env.POD_URL ?? '',
  oidcIssuer: env.OIDC_ISSUER ?? 'http://localhost/auth/realms/fap-light',
  // Front client statically pre-registered in the Keycloak realm (decision D-7).
  oidcClientId: env.OIDC_CLIENT_ID ?? 'fap-light-ui',
  // Demo fixtures active unless VITE_FIXTURES=0 (fallback if the back does not answer).
  fixtures: env.VITE_FIXTURES ?? '1',
};
