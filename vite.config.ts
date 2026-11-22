// Vite build (front spec §4): POD_URL / OIDC_ISSUER / OIDC_CLIENT_ID injected at build
// time from env (.env via loadEnv, or process.env), read via import.meta.env in src/config.ts (§13.6).
// The client is SELF-CONTAINED from the server: NO vite proxy to the back. In dev (npm run dev,
// port 5173) as in prod, all calls go ABSOLUTE to POD_URL (cross-origin) —
// CORS is handled by the back (Access-Control-Allow-Origin) and /auth by Keycloak (webOrigins).
// A vite proxy would break DPoP (the URL signed in the token endpoint would no longer match
// the URL received by Keycloak → "DPoP HTTP URL mismatch").
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
