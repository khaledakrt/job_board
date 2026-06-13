#!/usr/bin/env bash
# Mise à jour backend uniquement (git pull + npm + migrations + PM2).
# Pas de build Angular.
#
# Seul :
#   cd /var/www/jobboard
#   sudo bash deploy/update-backend-only.sh
#
# Après update.sh :
#   SKIP_GIT_PULL=1 sudo bash deploy/update-backend-only.sh

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=deploy/lib/update-common.sh
source "$SCRIPT_DIR/lib/update-common.sh"

jb_require_app_root
jb_git_pull
jb_backend_install
jb_backup_database
jb_db_migrate
jb_pm2_restart
jb_health_check
echo "OK — Backend mis à jour."
