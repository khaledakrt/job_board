#!/usr/bin/env bash
# Modèle pour créer un script de mise à jour complémentaire.
#
# update.sh reste le script principal (git pull + backend + frontend + PM2).
# Ce fichier sert de base pour les cas que update.sh ne couvre pas seul.
#
# Usage typique (après update.sh) :
#   cd /var/www/jobboard
#   sudo bash deploy/update.sh
#   SKIP_GIT_PULL=1 sudo bash deploy/update_exemple.sh
#
# Usage seul (sans update.sh) :
#   cd /var/www/jobboard
#   sudo bash deploy/update_exemple.sh
#
# Pour un nouveau script : copier ce fichier, renommer, adapter les étapes.
#   cp deploy/update_exemple.sh deploy/update-mon-cas.sh
#   chmod +x deploy/update-mon-cas.sh

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=deploy/lib/update-common.sh
source "$SCRIPT_DIR/lib/update-common.sh"

jb_require_app_root
cd "$APP_ROOT"

jb_log "update_exemple.sh — modèle (à personnaliser ou copier)"

# Décommenter / adapter selon le besoin :

# jb_git_pull

# jb_backend_install
# jb_db_migrate

# jb_frontend_build_deploy

# jb_pm2_restart

# jb_health_check

# --- Exemples d’étapes supplémentaires (non gérées par update.sh) ---

# Nginx aaPanel après changement de deploy/nginx-aapanel.conf.template :
# export SERVER_NAME=5.189.190.131
# sudo -E bash deploy/scripts/08-nginx-aapanel.sh

# Seed (attention : données de test, pas en prod avec vrais comptes) :
# cd "$APP_ROOT/backend" && npm run db:seed

# Vider un cache applicatif, recréer un dossier uploads, etc. :
# mkdir -p "$APP_ROOT/backend/uploads"
# chmod 755 "$APP_ROOT/backend/uploads"

jb_log "update_exemple.sh terminé (aucune action par défaut)"
