// Config par environnement (spec front §1.4, §13.6) : rien en dur.
// POD_URL / OIDC_ISSUER / OIDC_CLIENT_ID injectés au build par env (Vite define).
// Fallbacks pour exécution sous Node (tests) : import.meta.env n'y existe pas.
const env = (typeof import.meta !== 'undefined' && import.meta.env) || {};

export const config = {
  podUrl: env.POD_URL ?? '',
  oidcIssuer: env.OIDC_ISSUER ?? 'http://localhost/auth/realms/fap-light',
  // Client front pré-enregistré statiquement dans le realm Keycloak (décision D-7).
  oidcClientId: env.OIDC_CLIENT_ID ?? 'fap-light-ui',
  // Fixtures de démo actives sauf VITE_FIXTURES=0 (repli si le back ne répond pas).
  fixtures: env.VITE_FIXTURES ?? '1',
};
