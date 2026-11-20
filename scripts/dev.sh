#!/usr/bin/env bash
# dev.sh — lance le client en dev (vite), autonome du serveur backend.
# Le client est servi sur http://app.localhost/ (port 80 : caddy du back proxifie
# app.localhost → ce serveur vite sur l'hôte) et aussi en direct sur
# http://app.localhost:5173. Vite écoute sur 0.0.0.0 pour être atteignable depuis
# le conteneur caddy (host.docker.internal).
# Au premier lancement (ou si .env est absent), configure automatiquement le client
# vers le back indiqué :  ./scripts/dev.sh [POD_URL]   (défaut: http://localhost)
# Ensuite, un simple `npm run dev` suffit — .env est conservé tel quel.
set -euo pipefail
HERE="$(cd "$(dirname "$0")/.." && pwd)"
if [ ! -f "$HERE/.env" ]; then
  bash "$HERE/scripts/configure.sh" "${1:-http://localhost}"
fi
cd "$HERE"
echo "[dev] ouvre http://app.localhost/  (port 80 : caddy du back proxifie app.localhost → ce serveur vite)"
echo "[dev] accès direct vite aussi possible : http://app.localhost:${VITE_PORT:-5173}/"
echo "[dev] (le 'Local: http://localhost:5173/' affiché par vite est juste son affichage par défaut quand il écoute sur 0.0.0.0)"
exec npx vite --host "${VITE_HOST:-0.0.0.0}" --port "${VITE_PORT:-5173}" --strictPort "$@"
