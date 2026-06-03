#!/usr/bin/env bash
# Étape 8 bis — Nginx système (sans aaPanel)
# Usage : SERVER_NAME=5.189.190.131 sudo -E bash deploy/scripts/08-nginx-standalone.sh
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"
require_root
require_app_root

apt-get install -y -qq nginx

sed "s|5.189.190.131|${SERVER_NAME}|g; s|/var/www/jobboard/frontend|${SITE_ROOT}|g" \
  "$APP_ROOT/deploy/nginx-jobboard.conf" > /etc/nginx/sites-available/jobboard

ln -sf /etc/nginx/sites-available/jobboard /etc/nginx/sites-enabled/jobboard
rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true

nginx -t
systemctl enable nginx
systemctl reload nginx

echo "OK — Nginx standalone configuré"
