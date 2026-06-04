#!/usr/bin/env bash
# Mise à jour frontend uniquement (git pull + build + site/).
# Backend et PM2 non touchés — utile si seul Angular a changé et l’API est stable.
#
# Seul :
#   cd /var/www/jobboard
#   sudo bash deploy/update-frontend-only.sh
#
# Après update.sh (évite un second pull) :
#   sudo bash deploy/update.sh
#   SKIP_GIT_PULL=1 sudo bash deploy/update-frontend-only.sh
#   (en pratique redondant si update.sh vient d’être lancé)

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=deploy/lib/update-common.sh
source "$SCRIPT_DIR/lib/update-common.sh"

jb_require_app_root
jb_git_pull
jb_frontend_build_deploy
echo "OK — Frontend publié (API non redémarrée)."
