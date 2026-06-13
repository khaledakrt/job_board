#!/usr/bin/env bash
# Bibliothèque partagée pour deploy/update_*.sh (compléments à update.sh)
# Usage dans un script :
#   SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
#   # shellcheck source=deploy/lib/update-common.sh
#   source "$SCRIPT_DIR/lib/update-common.sh"

APP_ROOT="${APP_ROOT:-/var/www/jobboard}"
SITE_ROOT="${SITE_ROOT:-/var/www/jobboard/site}"
PM2_APP_NAME="${PM2_APP_NAME:-jobboard-api}"
API_HEALTH_URL="${API_HEALTH_URL:-http://127.0.0.1:3000/api/health}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/jobboard}"

# Après update.sh : éviter un second git pull
#   SKIP_GIT_PULL=1 sudo bash deploy/update_exemple.sh
SKIP_GIT_PULL="${SKIP_GIT_PULL:-0}"

jb_log() { echo ""; echo ">>> $*"; }
jb_die() { echo "ERREUR: $*" >&2; exit 1; }

jb_require_app_root() {
  [[ -d "$APP_ROOT/deploy" ]] || jb_die "Projet introuvable: $APP_ROOT"
}

jb_git_pull() {
  if [[ "$SKIP_GIT_PULL" == "1" ]]; then
    jb_log "git pull ignoré (SKIP_GIT_PULL=1)"
    return 0
  fi
  jb_log "git pull"
  cd "$APP_ROOT"
  git pull
}

jb_backend_install() {
  jb_log "Backend — dépendances"
  cd "$APP_ROOT/backend"
  npm ci --omit=dev
}

jb_env_value() {
  local key="$1"
  local env_file="$APP_ROOT/backend/.env"
  local line
  line="$(grep -E "^${key}=" "$env_file" | tail -n 1 || true)"
  line="${line#*=}"
  line="${line%\"}"
  line="${line#\"}"
  line="${line%\'}"
  line="${line#\'}"
  printf '%s' "$line"
}

jb_backup_database() {
  [[ -f "$APP_ROOT/backend/.env" ]] || jb_die "backend/.env introuvable, backup DB impossible."

  local db_host db_port db_user db_password db_name backup_file files_backup
  db_host="$(jb_env_value DB_HOST)"
  db_port="$(jb_env_value DB_PORT)"
  db_user="$(jb_env_value DB_USER)"
  db_password="$(jb_env_value DB_PASSWORD)"
  db_name="$(jb_env_value DB_NAME)"

  mkdir -p "$BACKUP_DIR"
  backup_file="$BACKUP_DIR/${db_name:-job_board}-$(date +%F-%H%M%S).sql"
  files_backup="$BACKUP_DIR/files-$(date +%F-%H%M%S).tar.gz"
  jb_log "Backup DB: $backup_file"
  mysqldump \
    --single-transaction \
    --routines \
    --triggers \
    -h "${db_host:-127.0.0.1}" \
    -P "${db_port:-3306}" \
    -u "${db_user:?DB_USER manquant}" \
    "-p${db_password:?DB_PASSWORD manquant}" \
    "${db_name:?DB_NAME manquant}" > "$backup_file"
  jb_log "Backup fichiers: $files_backup"
  tar -czf "$files_backup" -C "$APP_ROOT/backend" .env uploads 2>/dev/null || true
}

jb_db_migrate() {
  jb_log "Backend — migrations"
  cd "$APP_ROOT/backend"
  npm run db:migrate
}

jb_frontend_build_deploy() {
  jb_log "Frontend — build production"
  cd "$APP_ROOT/frontend"
  npm ci
  npm run build -- --configuration=production

  local out="$APP_ROOT/frontend/dist/job-board-frontend"
  [[ -d "$out" ]] || jb_die "Build introuvable: $out"

  jb_log "Frontend — publication vers $SITE_ROOT"
  mkdir -p "$SITE_ROOT"
  rm -rf "${SITE_ROOT:?}"/*
  if [[ -d "$out/browser" ]]; then
    cp -r "$out/browser"/* "$SITE_ROOT"/
  else
    cp -r "$out"/* "$SITE_ROOT"/
  fi

  [[ -f "$SITE_ROOT/index.html" ]] || jb_die "index.html manquant dans $SITE_ROOT"
}

jb_pm2_restart() {
  jb_log "PM2 — restart $PM2_APP_NAME"
  cd "$APP_ROOT"
  pm2 restart "$PM2_APP_NAME"
}

jb_health_check() {
  jb_log "Santé API"
  curl -sf "$API_HEALTH_URL"
  echo ""
}
