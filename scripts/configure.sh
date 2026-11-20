#!/usr/bin/env bash
# configure.sh — configure le client app-supervision pour un back donné.
# Le client est AUTONOME du serveur backend : il tourne depuis ce répertoire
# (npm run dev → http://localhost:5173) et appelle le back en absolu, cross-origin
# (CORS géré par le back ; /auth par Keycloak via webOrigins).
#
# Usage : ./scripts/configure.sh [POD_URL]
#   défaut (dev, back local lancé par ../app-supervision-backend/scripts/start.sh) :
#     ./scripts/configure.sh                 # → http://localhost
#   staging/prod : ./scripts/configure.sh https://fap.example.com
#
# Écrit .env (POD_URL/OIDC_ISSUER/OIDC_CLIENT_ID/VITE_FIXTURES) et rend orbit.json
# depuis orbit.json.example (placeholder https://<pod>).
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

echo "[configure] client configuré pour le back : $POD_URL"
echo "[configure]   POD_URL      = $POD_URL   (le BACK — appels LDP/DSP/proxy en absolu, cross-origin)"
echo "[configure]   OIDC_ISSUER  = $POD_URL/auth/realms/fap-light"
echo "[configure] lancer le client : cd $HERE && npm run dev"
echo "[configure]   → http://app.localhost/  (port 80, via caddy → vite) ou http://app.localhost:5173 en direct"
