// Config par environnement (spec front §1.4, §13.6) : rien en dur.
// POD_URL / OIDC_ISSUER / OIDC_CLIENT_ID injectés au build par env (Vite).
export const config = {
  podUrl: import.meta.env.POD_URL as string,
  oidcIssuer: import.meta.env.OIDC_ISSUER as string,
  // Client front pré-enregistré statiquement dans le realm Keycloak (décision D-7).
  oidcClientId: (import.meta.env.OIDC_CLIENT_ID as string) ?? 'fap-light-ui',
  // Fixtures de démo actives sauf VITE_FIXTURES=0 (repli si le back ne répond pas).
  fixtures: (import.meta.env.VITE_FIXTURES as string) ?? '1',
};
