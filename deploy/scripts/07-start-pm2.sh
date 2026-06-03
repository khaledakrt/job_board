#!/usr/bin/env bash
# Étape 7 — Démarrer l'API avec PM2
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"
require_app_root

cd "$APP_ROOT"
pm2 delete jobboard-api 2>/dev/null || true
pm2 start deploy/pm2.ecosystem.config.cjs
pm2 save

if command -v systemctl >/dev/null; then
  pm2 startup systemd -u root --hp /root 2>/dev/null | tail -1 || true
fi

sleep 2
curl -sf http://127.0.0.1:3000/api/health | head -c 200
echo ""
echo "OK — Étape 7 terminée (pm2 list)"
