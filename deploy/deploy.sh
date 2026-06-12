#!/usr/bin/env bash
# Déploiement complet Job Board sur VM Ubuntu
#
# Usage (sur la VM, après connexion SSH) :
#
#   export PUBLIC_URL=https://tun-job-board.com
#   export SERVER_NAME=tun-job-board.com
#   export DB_PASSWORD='VotreMotDePasseDB'
#   cd /var/www/jobboard   # ou clone d'abord dans ce dossier
#   sudo -E bash deploy/deploy.sh
#
# Variables optionnelles : APP_ROOT, REPO_URL, USE_AAPANEL=yes|no, RUN_SEED=0|1

set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPTS="$ROOT/scripts"

export APP_ROOT="${APP_ROOT:-/var/www/jobboard}"
export SITE_ROOT="${SITE_ROOT:-/var/www/jobboard/site}"
USE_AAPANEL="${USE_AAPANEL:-no}"

[[ -n "${DB_PASSWORD:-}" ]] || { echo "ERREUR: export DB_PASSWORD='...'"; exit 1; }
[[ -n "${PUBLIC_URL:-}" ]] || { echo "ERREUR: export PUBLIC_URL=https://VOTRE_DOMAINE"; exit 1; }
[[ -n "${SERVER_NAME:-}" ]] || export SERVER_NAME="${PUBLIC_URL#http://}"; SERVER_NAME="${SERVER_NAME#https://}"; SERVER_NAME="${SERVER_NAME%%/*}"

chmod +x "$SCRIPTS"/*.sh "$SCRIPTS"/lib/*.sh 2>/dev/null || true

bash "$SCRIPTS/01-install-system.sh"
bash "$SCRIPTS/02-setup-mysql.sh"
bash "$SCRIPTS/03-clone-project.sh"
bash "$SCRIPTS/04-init-env.sh"
bash "$SCRIPTS/05-deploy-backend.sh"
bash "$SCRIPTS/06-deploy-frontend.sh"
bash "$SCRIPTS/07-start-pm2.sh"

if [[ "$USE_AAPANEL" == "yes" ]] && [[ -d /www/server/panel/vhost/nginx ]]; then
  bash "$SCRIPTS/08-nginx-aapanel.sh"
else
  bash "$SCRIPTS/08-nginx-standalone.sh"
fi

echo ""
echo "=============================================="
echo " Déploiement terminé"
echo " Site    : $PUBLIC_URL"
echo " API     : $PUBLIC_URL/api/health"
echo "=============================================="
