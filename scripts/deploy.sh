#!/usr/bin/env bash
# One-command publish of the local tree to the public host.
#
# Usage:
#   scripts/deploy.sh                 # build web + sync + bun install + restart + healthcheck
#   SKIP_WEB=1 scripts/deploy.sh      # backend/config-only change (no web build)
#   SKIP_INSTALL=1 scripts/deploy.sh  # dependencies unchanged (no bun install)
#   SKIP_RESTART=1 scripts/deploy.sh  # sync only
#
# Overridable env:
#   REMOTE=webserver           ssh host/alias
#   DIR=/opt/connectedpapers   remote install dir
#   VITE_BASE=/papers/         frontend base path (must match the nginx sub-path)
#   SERVICE=connectedpapers    systemd unit name
#   PUBLIC_URL=https://watchdeep.net/papers/
set -euo pipefail

REMOTE="${REMOTE:-webserver}"
DIR="${DIR:-/opt/connectedpapers}"
VITE_BASE="${VITE_BASE:-/papers/}"
SERVICE="${SERVICE:-connectedpapers}"
PUBLIC_URL="${PUBLIC_URL:-https://watchdeep.net/papers/}"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ "${SKIP_WEB:-0}" != "1" ]; then
  echo "==> build frontend (VITE_BASE=$VITE_BASE)"
  VITE_BASE="$VITE_BASE" pnpm --dir academic-paper-explorer build
else
  echo "==> skip frontend build (SKIP_WEB=1)"
fi

echo "==> rsync -> $REMOTE:$DIR"
rsync -az --delete \
  --exclude '.git' \
  --exclude '.omo' \
  --exclude 'node_modules' \
  --exclude 'academic-paper-explorer/node_modules' \
  --exclude 'data' \
  --exclude 'server/.env' \
  --exclude 'sub_tasks' \
  --exclude 'user_input_files' \
  --exclude 'docs' \
  ./ "$REMOTE:$DIR/"

# The server now has a runtime dependency (unpdf, for the PDF text fallback) and
# node_modules is excluded from the sync, so the remote installs it itself.
if [ "${SKIP_INSTALL:-0}" != "1" ]; then
  echo "==> bun install on $REMOTE"
  ssh "$REMOTE" "cd $DIR && bun install --frozen-lockfile --production"
else
  echo "==> skip bun install (SKIP_INSTALL=1)"
fi

if [ "${SKIP_RESTART:-0}" != "1" ]; then
  echo "==> restart $SERVICE"
  ssh "$REMOTE" "systemctl restart $SERVICE && sleep 1 && systemctl is-active $SERVICE"
else
  echo "==> skip restart (SKIP_RESTART=1)"
fi

echo "==> healthcheck"
ssh "$REMOTE" "curl -s -o /dev/null -w '  $PUBLIC_URL -> %{http_code}\n' '$PUBLIC_URL' || true"
echo "done."
