#!/usr/bin/env bash
# Étape 4 — Créer backend/.env depuis le modèle
# Usage : PUBLIC_URL=https://tun-job-board.com DB_PASSWORD=xxx bash deploy/scripts/04-init-env.sh
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"
require_app_root

ENV_FILE="$APP_ROOT/backend/.env"
EXAMPLE="$APP_ROOT/deploy/env.production.example"

if [[ -f "$ENV_FILE" ]]; then
  echo "backend/.env existe déjà — aucune modification."
  exit 0
fi

[[ -n "$DB_PASSWORD" ]] || die "DB_PASSWORD requis pour générer .env"
[[ -n "$PUBLIC_URL" ]] || die "PUBLIC_URL requis (ex: https://tun-job-board.com)"

JWT_ACCESS="${JWT_ACCESS:-$(openssl rand -hex 32)}"
JWT_REFRESH="${JWT_REFRESH:-$(openssl rand -hex 32)}"

cp "$EXAMPLE" "$ENV_FILE"

sed -i "s|^CLIENT_URL=.*|CLIENT_URL=${PUBLIC_URL}|" "$ENV_FILE"
sed -i "s|^API_PUBLIC_URL=.*|API_PUBLIC_URL=${PUBLIC_URL}|" "$ENV_FILE"
sed -i "s|^DB_NAME=.*|DB_NAME=${DB_NAME}|" "$ENV_FILE"
sed -i "s|^DB_USER=.*|DB_USER=${DB_USER}|" "$ENV_FILE"
sed -i "s|^DB_PASSWORD=.*|DB_PASSWORD=${DB_PASSWORD}|" "$ENV_FILE"
sed -i "s|^JWT_ACCESS_SECRET=.*|JWT_ACCESS_SECRET=${JWT_ACCESS}|" "$ENV_FILE"
sed -i "s|^JWT_REFRESH_SECRET=.*|JWT_REFRESH_SECRET=${JWT_REFRESH}|" "$ENV_FILE"

if [[ "$PUBLIC_URL" == https://* ]]; then
  sed -i 's|^COOKIE_SECURE=.*|COOKIE_SECURE=true|' "$ENV_FILE"
else
  sed -i 's|^COOKIE_SECURE=.*|COOKIE_SECURE=false|' "$ENV_FILE"
fi

echo "Fichier créé : $ENV_FILE"
echo "Complétez SMTP (EMAIL_USER / EMAIL_PASS) si besoin : nano $ENV_FILE"
echo "OK — Étape 4 terminée"
