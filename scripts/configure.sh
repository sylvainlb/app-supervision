#!/usr/bin/env bash
# configure.sh — configures the app-supervision client for a given back.
# The client is SELF-CONTAINED from the backend server: it runs from this directory
# (npm run dev → http://localhost:5173) and calls the back absolute, cross-origin
# (CORS handled by the back; /auth by Keycloak via webOrigins).
#
# Usage: ./scripts/configure.sh [POD_URL]
#   default (dev, local back started by ../app-supervision-backend/scripts/start.sh):
#     ./scripts/configure.sh                 # → http://localhost
#   staging/prod: ./scripts/configure.sh https://fap.example.com
#
# Writes .env (POD_URL/OIDC_ISSUER/OIDC_CLIENT_ID/VITE_FIXTURES) and renders orbit.json
# from orbit.json.example (placeholder https://<pod>).
set -euo pipefail
HERE="$(cd "$(dirname "$0")/.." && pwd)"
POD_URL="${1:-http://localhost}"
POD_URL="${POD_URL%/}"

cat > "$HERE/.env" <<EOF
POD_URL=$POD_URL
OIDC_ISSUER=$POD_URL/auth/realms/fap-light
OIDC_CLIENT_ID=fap-light-ui
VITE_FIXTURES=0
EOF

sed "s|https://<pod>|$POD_URL|g" "$HERE/orbit.json.example" > "$HERE/orbit.json"

echo "[configure] client configured for back: $POD_URL"
echo "[configure]   POD_URL      = $POD_URL   (the BACK — LDP/DSP/proxy calls absolute, cross-origin)"
echo "[configure]   OIDC_ISSUER  = $POD_URL/auth/realms/fap-light"
echo "[configure] run the client: cd $HERE && npm run dev"
echo "[configure]   → http://app.localhost/  (port 80, via caddy → vite) or http://app.localhost:5173 direct"
