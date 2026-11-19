// Build Vite (spec front §4) : POD_URL / OIDC_ISSUER / OIDC_CLIENT_ID injectés au build
// par env (define), lus via import.meta.env dans src/config.ts (§13.6).
import { defineConfig } from 'vite';

export default defineConfig({
  define: {
    'import.meta.env.POD_URL': JSON.stringify(process.env.POD_URL ?? ''),
    'import.meta.env.OIDC_ISSUER': JSON.stringify(process.env.OIDC_ISSUER ?? ''),
    'import.meta.env.OIDC_CLIENT_ID': JSON.stringify(process.env.OIDC_CLIENT_ID ?? ''),
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
