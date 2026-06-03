#!/usr/bin/env bash
# Étape 3 — Clone ou mise à jour GitHub
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

log "Projet dans $APP_ROOT"
mkdir -p "$APP_ROOT"

if [[ -d "$APP_ROOT/.git" ]]; then
  cd "$APP_ROOT"
  git pull --ff-only
else
  git clone "$REPO_URL" "$APP_ROOT"
fi

require_app_root
echo "OK — Étape 3 terminée"
