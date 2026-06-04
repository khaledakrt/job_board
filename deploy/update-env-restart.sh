#!/usr/bin/env bash
# Redémarrage API après modification de backend/.env (sans rebuild).
# Ne fait pas git pull. À lancer seul ou après édition manuelle du .env.
#
#   nano /var/www/jobboard/backend/.env
#   cd /var/www/jobboard
#   sudo bash deploy/update-env-restart.sh

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=deploy/lib/update-common.sh
source "$SCRIPT_DIR/lib/update-common.sh"

jb_require_app_root
[[ -f "$APP_ROOT/backend/.env" ]] || jb_die "backend/.env introuvable"

jb_log "Redémarrage après changement .env"
jb_pm2_restart
jb_health_check
echo "OK — API redémarrée."
