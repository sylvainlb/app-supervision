// Build Vite (spec front §4) : POD_URL / OIDC_ISSUER / OIDC_CLIENT_ID injectés au build
// par env (.env via loadEnv, ou process.env), lus via import.meta.env dans src/config.ts (§13.6).
// En dev (npm run dev) : proxy same-origin vers le back local (évite CORS/mixed-content).
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env };
  const podUrl = env.POD_URL ?? '';
  return {
    define: {
      'import.meta.env.POD_URL': JSON.stringify(podUrl),
      'import.meta.env.OIDC_ISSUER': JSON.stringify(env.OIDC_ISSUER ?? ''),
      'import.meta.env.OIDC_CLIENT_ID': JSON.stringify(env.OIDC_CLIENT_ID ?? ''),
    },
    server: {
      port: 5173,
      proxy: podUrl
        ? {
            '/tickets': { target: podUrl, changeOrigin: true, secure: false },
            '/buildings': { target: podUrl, changeOrigin: true, secure: false },
            '/users': { target: podUrl, changeOrigin: true, secure: false },
            '/gold': { target: podUrl, changeOrigin: true, secure: false },
            '/app/query': { target: podUrl, changeOrigin: true, secure: false },
            '/auth': { target: podUrl, changeOrigin: true, secure: false },
          }
        : {},
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
    },
  };
});
