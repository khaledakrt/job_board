#!/usr/bin/env bash
# Mise à jour après git push (code + build + restart API)
#
# Usage sur la VM :
#   cd /var/www/jobboard
#   sudo bash deploy/update.sh

set -euo pipefail
APP_ROOT="${APP_ROOT:-/var/www/jobboard}"
SITE_ROOT="${SITE_ROOT:-/var/www/jobboard/site}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/jobboard}"
PM2_SERVICE="${PM2_SERVICE:-pm2-jobboard}"
PM2_APP_NAME="${PM2_APP_NAME:-jobboard-api}"
PM2_USER="${PM2_USER:-jobboard}"
API_HEALTH_URL="${API_HEALTH_URL:-http://127.0.0.1:3001/api/health}"
HEALTH_RETRIES="${HEALTH_RETRIES:-20}"
HEALTH_SLEEP_SECONDS="${HEALTH_SLEEP_SECONDS:-2}"

if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
  echo "Ce script doit etre lance avec sudo/root pour redemarrer $PM2_SERVICE." >&2
  exit 1
fi

backup_database() {
  if [[ ! -f "$APP_ROOT/backend/.env" ]]; then
    echo "backend/.env introuvable, backup DB impossible." >&2
    exit 1
  fi

  env_value() {
    local key="$1"
    local line
    line="$(grep -E "^${key}=" "$APP_ROOT/backend/.env" | tail -n 1 || true)"
    line="${line#*=}"
    line="${line%\"}"
    line="${line#\"}"
    line="${line%\'}"
    line="${line#\'}"
    printf '%s' "$line"
  }

  local db_host db_port db_user db_password db_name
  db_host="$(env_value DB_HOST)"
  db_port="$(env_value DB_PORT)"
  db_user="$(env_value DB_USER)"
  db_password="$(env_value DB_PASSWORD)"
  db_name="$(env_value DB_NAME)"

  mkdir -p "$BACKUP_DIR"
  local backup_file="$BACKUP_DIR/${db_name:-job_board}-$(date +%F-%H%M%S).sql"
  local files_backup="$BACKUP_DIR/files-$(date +%F-%H%M%S).tar.gz"
  echo ">>> Backup DB: $backup_file"
  mysqldump \
    --single-transaction \
    --no-tablespaces \
    --routines \
    --triggers \
    -h "${db_host:-127.0.0.1}" \
    -P "${db_port:-3306}" \
    -u "${db_user:?DB_USER manquant}" \
    "-p${db_password:?DB_PASSWORD manquant}" \
    "${db_name:?DB_NAME manquant}" > "$backup_file"
  echo ">>> Backup fichiers: $files_backup"
  tar -czf "$files_backup" -C "$APP_ROOT/backend" .env uploads 2>/dev/null || true
}

health_check() {
  echo ">>> Health check: $API_HEALTH_URL"
  for attempt in $(seq 1 "$HEALTH_RETRIES"); do
    if curl -sf "$API_HEALTH_URL"; then
      echo ""
      return 0
    fi

    echo "Health check not ready yet ($attempt/$HEALTH_RETRIES)."
    sleep "$HEALTH_SLEEP_SECONDS"
  done

  echo "Health check failed after $HEALTH_RETRIES attempts." >&2
  return 1
}

cd "$APP_ROOT"
PREVIOUS_SHA="$(git rev-parse HEAD)"
echo ">>> SHA actuel: $PREVIOUS_SHA"
git pull --ff-only

echo ">>> Backend"
cd backend
npm ci --omit=dev
backup_database
npm run db:migrate

echo ">>> Frontend"
cd ../frontend
npm ci
npm run build -- --configuration=production
OUT=dist/job-board-frontend
TMP_SITE="$(mktemp -d)"
if [[ -d "$OUT/browser" ]]; then
  cp -r "$OUT/browser"/* "$TMP_SITE"/
else
  cp -r "$OUT"/* "$TMP_SITE"/
fi
[[ -f "$TMP_SITE/index.html" ]] || {
  echo "Build frontend invalide: index.html absent." >&2
  rm -rf "$TMP_SITE"
  exit 1
}
mkdir -p "$SITE_ROOT"
rm -rf "${SITE_ROOT:?}"/*
cp -r "$TMP_SITE"/* "$SITE_ROOT"/
rm -rf "$TMP_SITE"

echo ">>> PM2"
cd "$APP_ROOT"
systemctl restart "$PM2_SERVICE"
systemctl status "$PM2_SERVICE" --no-pager
runuser -u "$PM2_USER" -- pm2 list

health_check
echo "Mise à jour terminée. Rollback code possible vers: $PREVIOUS_SHA"
