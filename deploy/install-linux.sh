#!/usr/bin/env bash
# Installation Job Board sur Ubuntu/Debian (VM PVS ou autre).
# Usage : sudo bash deploy/install-linux.sh
# Prérequis : code déjà copié dans /var/www/jobboard (git clone ou scp).

set -euo pipefail

APP_ROOT="${APP_ROOT:-/var/www/jobboard}"
DOMAIN="${DOMAIN:-}"

echo "==> Mise à jour paquets système"
apt-get update -qq
DEBIAN_FRONTEND=noninteractive apt-get install -y -qq \
  curl git nginx mysql-server \
  build-essential

if ! command -v node >/dev/null 2>&1 || [[ "$(node -v | cut -d. -f1 | tr -d v)" -lt 18 ]]; then
  echo "==> Installation Node.js 20 LTS"
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y -qq nodejs
fi

if ! command -v pm2 >/dev/null 2>&1; then
  echo "==> Installation PM2"
  npm install -g pm2
fi

cd "$APP_ROOT"

if [[ ! -f backend/.env ]]; then
  echo "==> Créer backend/.env à partir de deploy/env.production.example"
  cp deploy/env.production.example backend/.env
  echo "    Éditez backend/.env (CLIENT_URL, DB_*, JWT, SMTP) puis relancez ce script."
  exit 1
fi

echo "==> Dépendances backend"
cd "$APP_ROOT/backend"
npm ci --omit=dev

echo "==> Base de données (si MySQL prêt)"
npm run db:setup || echo "WARN: db:setup a échoué — vérifiez DB_* dans .env"

echo "==> Build frontend production"
cd "$APP_ROOT/frontend"
npm ci
npm run build -- --configuration=production

echo "==> Déploiement fichiers statiques"
mkdir -p /var/www/jobboard/frontend
rm -rf /var/www/jobboard/frontend/*
cp -r dist/job-board-frontend/browser/* /var/www/jobboard/frontend/

echo "==> Dossier uploads"
mkdir -p "$APP_ROOT/backend/uploads"
chown -R www-data:www-data "$APP_ROOT/backend/uploads" 2>/dev/null || true

echo "==> PM2 API"
cd "$APP_ROOT"
pm2 start deploy/pm2.ecosystem.config.cjs || pm2 restart jobboard-api
pm2 save
pm2 startup systemd -u root --hp /root 2>/dev/null || true

if [[ -n "$DOMAIN" ]]; then
  sed "s/votre-domaine.fr/${DOMAIN}/g" deploy/nginx-jobboard.conf > /etc/nginx/sites-available/jobboard
else
  cp deploy/nginx-jobboard.conf /etc/nginx/sites-available/jobboard
fi
ln -sf /etc/nginx/sites-available/jobboard /etc/nginx/sites-enabled/jobboard
rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true
nginx -t && systemctl reload nginx

echo ""
echo "OK — Prochaines étapes :"
echo "  1. Ouvrir ports 80/443 sur le pare-feu PVS + redirection IP publique"
echo "  2. DNS A record -> IP de la VM"
echo "  3. SSL : certbot --nginx -d $DOMAIN"
echo "  4. Vérifier CLIENT_URL et API_PUBLIC_URL dans backend/.env (https://...)"
