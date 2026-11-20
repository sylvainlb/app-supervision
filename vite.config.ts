// Build Vite (spec front §4) : POD_URL / OIDC_ISSUER / OIDC_CLIENT_ID injectés au build
// par env (.env via loadEnv, ou process.env), lus via import.meta.env dans src/config.ts (§13.6).
// Le client est AUTONOME du serveur : AUCUN proxy vite vers le back. En dev (npm run dev,
// port 5173) comme en prod, tous les appels partent en ABSOLU vers POD_URL (cross-origin) —
// le CORS est géré par le back (Access-Control-Allow-Origin) et /auth par Keycloak (webOrigins).
// Un proxy vite casserait le DPoP (l'URL signée du token endpoint ne correspondrait plus
// à l'URL reçue par Keycloak → « DPoP HTTP URL mismatch »).
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env };
  return {
    define: {
      'import.meta.env.POD_URL': JSON.stringify(env.POD_URL ?? ''),
      'import.meta.env.OIDC_ISSUER': JSON.stringify(env.OIDC_ISSUER ?? ''),
      'import.meta.env.OIDC_CLIENT_ID': JSON.stringify(env.OIDC_CLIENT_ID ?? ''),
      'import.meta.env.VITE_FIXTURES': JSON.stringify(env.VITE_FIXTURES ?? '1'),
    },
    server: {
      port: 5173,
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
    },
  };
});
