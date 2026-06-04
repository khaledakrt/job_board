#!/usr/bin/env bash
# Recharge la config Nginx (aaPanel) après changement du template dans le dépôt.
# Ne remplace pas update.sh — à lancer en complément si vous avez modifié
# deploy/nginx-aapanel.conf.template ou deploy/nginx-jobboard.conf.
#
#   export SERVER_NAME=5.189.190.131
#   cd /var/www/jobboard
#   sudo bash deploy/update.sh
#   SKIP_GIT_PULL=1 sudo -E bash deploy/update-nginx.sh

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=deploy/lib/update-common.sh
source "$SCRIPT_DIR/lib/update-common.sh"

jb_require_app_root

if [[ "${SKIP_GIT_PULL:-0}" != "1" ]]; then
  jb_git_pull
fi

[[ -n "${SERVER_NAME:-}" ]] || jb_die "Définissez SERVER_NAME (ex: export SERVER_NAME=5.189.190.131)"

if [[ -d "${AAPANEL_NGINX_DIR:-/www/server/panel/vhost/nginx}" ]]; then
  jb_log "Nginx aaPanel"
  sudo -E bash "$APP_ROOT/deploy/scripts/08-nginx-aapanel.sh"
else
  jb_log "Nginx standalone"
  sudo bash "$APP_ROOT/deploy/scripts/08-nginx-standalone.sh"
fi

echo "OK — Nginx rechargé."
