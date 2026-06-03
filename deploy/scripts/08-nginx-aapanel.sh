#!/usr/bin/env bash
# Étape 8 — Nginx aaPanel (recommandé si aaPanel est installé)
# Usage : SERVER_NAME=5.189.190.131 sudo -E bash deploy/scripts/08-nginx-aapanel.sh
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"
require_root
require_app_root

[[ -d "$AAPANEL_NGINX_DIR" ]] || die "aaPanel nginx introuvable: $AAPANEL_NGINX_DIR"

CONF_NAME="${SERVER_NAME}.conf"
if [[ "$SERVER_NAME" == "_" ]]; then
  die "Définissez SERVER_NAME avec l'IP ou le domaine (ex: export SERVER_NAME=5.189.190.131)"
fi

TARGET="$AAPANEL_NGINX_DIR/$CONF_NAME"
TEMPLATE="$APP_ROOT/deploy/nginx-aapanel.conf.template"

[[ -f "$TARGET" ]] && cp "$TARGET" "${TARGET}.bak.$(date +%s)"

sed "s/__SERVER_NAME__/${SERVER_NAME}/g" "$TEMPLATE" > "$TARGET"

/www/server/nginx/sbin/nginx -t
/www/server/nginx/sbin/nginx -s reload

curl -sf -o /dev/null -w "Site HTTP %{http_code}\n" "http://127.0.0.1/" || true
curl -sf "http://127.0.0.1/api/health" | head -c 120
echo ""
echo "OK — Étape 8 terminée ($TARGET)"
