#!/usr/bin/env bash
# dev.sh — runs the client in dev (vite), self-contained from the backend server.
# The client is served on http://app.localhost/ (port 80: the back's caddy proxies
# app.localhost → this vite server on the host) and also directly on
# http://app.localhost:5173. Vite listens on 0.0.0.0 to be reachable from
# the caddy container (host.docker.internal).
# On first launch (or if .env is absent), automatically configures the client
# to the given back:  ./scripts/dev.sh [POD_URL]   (default: http://localhost)
# Afterwards, a simple `npm run dev` is enough — .env is kept as is.
set -euo pipefail
HERE="$(cd "$(dirname "$0")/.." && pwd)"
if [ ! -f "$HERE/.env" ]; then
  bash "$HERE/scripts/configure.sh" "${1:-http://localhost}"
fi
cd "$HERE"
echo "[dev] open http://app.localhost/  (port 80: the back's caddy proxies app.localhost → this vite server)"
echo "[dev] direct vite access also possible: http://app.localhost:${VITE_PORT:-5173}/"
echo "[dev] (the 'Local: http://localhost:5173/' printed by vite is just its default display when listening on 0.0.0.0)"
exec npx vite --host "${VITE_HOST:-0.0.0.0}" --port "${VITE_PORT:-5173}" --strictPort "$@"
