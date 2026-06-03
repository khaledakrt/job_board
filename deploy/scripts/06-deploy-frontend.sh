#!/usr/bin/env bash
# Étape 6 — Build Angular production → /var/www/jobboard/site
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"
require_app_root

log "Build frontend (configuration production)"
cd "$APP_ROOT/frontend"
npm ci
npm run build -- --configuration=production

OUT="$APP_ROOT/frontend/dist/job-board-frontend"
[[ -d "$OUT" ]] || die "Build introuvable: $OUT"

log "Publication fichiers statiques dans $SITE_ROOT"
mkdir -p "$SITE_ROOT"
rm -rf "${SITE_ROOT:?}"/*
if [[ -d "$OUT/browser" ]]; then
  cp -r "$OUT/browser"/* "$SITE_ROOT"/
else
  cp -r "$OUT"/* "$SITE_ROOT"/
fi

[[ -f "$SITE_ROOT/index.html" ]] || die "index.html manquant dans $SITE_ROOT"

if grep -rq 'localhost:3000' "$SITE_ROOT" 2>/dev/null; then
  die "Le build contient encore localhost:3000 — vérifiez frontend/angular.json (fileReplacements)"
fi

echo "OK — Étape 6 terminée"
