#!/usr/bin/env bash
# Étape 5 — npm backend + migrations + seed
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"
require_app_root

[[ -f "$APP_ROOT/backend/.env" ]] || die "backend/.env manquant — lancez 04-init-env.sh"

log "Installation dépendances backend"
cd "$APP_ROOT/backend"
npm ci --omit=dev

log "Base de données"
npm run db:setup
npm run db:migrate 2>/dev/null || true
npm run db:seed

mkdir -p "$APP_ROOT/backend/uploads"
chmod 755 "$APP_ROOT/backend/uploads"

echo "OK — Étape 5 terminée"
echo "Comptes test : candidate@test.com / recruiter@test.com — mot de passe Test1234!"
