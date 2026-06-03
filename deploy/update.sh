#!/usr/bin/env bash
# Mise à jour après git push (code + build + restart API)
#
# Usage sur la VM :
#   cd /var/www/jobboard
#   sudo bash deploy/update.sh

set -euo pipefail
APP_ROOT="${APP_ROOT:-/var/www/jobboard}"
SITE_ROOT="${SITE_ROOT:-/var/www/jobboard/site}"

cd "$APP_ROOT"
git pull

echo ">>> Backend"
cd backend
npm ci --omit=dev
npm run db:migrate 2>/dev/null || true

echo ">>> Frontend"
cd ../frontend
npm ci
npm run build -- --configuration=production
OUT=dist/job-board-frontend
rm -rf "${SITE_ROOT:?}"/*
if [[ -d "$OUT/browser" ]]; then
  cp -r "$OUT/browser"/* "$SITE_ROOT"/
else
  cp -r "$OUT"/* "$SITE_ROOT"/
fi

echo ">>> PM2"
cd "$APP_ROOT"
pm2 restart jobboard-api

curl -sf http://127.0.0.1:3000/api/health
echo ""
echo "Mise à jour terminée."
