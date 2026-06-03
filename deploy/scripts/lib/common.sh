#!/usr/bin/env bash
# Variables partagées — source par les autres scripts : source "$(dirname "$0")/lib/common.sh"

APP_ROOT="${APP_ROOT:-/var/www/jobboard}"
SITE_ROOT="${SITE_ROOT:-/var/www/jobboard/site}"
PUBLIC_URL="${PUBLIC_URL:-http://127.0.0.1}"
SERVER_NAME="${SERVER_NAME:-_}"
DB_NAME="${DB_NAME:-job_board}"
DB_USER="${DB_USER:-jobboard}"
DB_PASSWORD="${DB_PASSWORD:-}"
REPO_URL="${REPO_URL:-https://github.com/khaledakrt/job_board.git}"
AAPANEL_NGINX_DIR="${AAPANEL_NGINX_DIR:-/www/server/panel/vhost/nginx}"

log() { echo ""; echo ">>> $*"; }
die() { echo "ERREUR: $*" >&2; exit 1; }

require_root() {
  [[ "$(id -u)" -eq 0 ]] || die "Exécutez ce script en root (sudo)."
}

require_app_root() {
  [[ -d "$APP_ROOT/deploy" ]] || die "Dossier projet introuvable: $APP_ROOT (git clone d'abord?)"
}
