#!/usr/bin/env bash
# Étape 2 — MySQL 8 + base job_board + utilisateur jobboard
# Usage : DB_PASSWORD='MotDePasseFort' sudo -E bash deploy/scripts/02-setup-mysql.sh
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"
require_root

[[ -n "$DB_PASSWORD" ]] || die "Définissez DB_PASSWORD (ex: export DB_PASSWORD='MonMotDePasse')"

log "Installation MySQL (si absent)"
apt-get install -y -qq mysql-server || true

mkdir -p /etc/mysql/conf.d /var/log/mysql /var/run/mysqld
chown mysql:mysql /var/log/mysql /var/run/mysqld 2>/dev/null || true

if [[ ! -f /etc/mysql/my.cnf ]] || ! grep -q 'mysqld.sock' /etc/mysql/my.cnf 2>/dev/null; then
  cat > /etc/mysql/my.cnf <<'EOF'
[mysqld]
user            = mysql
pid-file        = /var/run/mysqld/mysqld.pid
socket          = /var/run/mysqld/mysqld.sock
port            = 3306
datadir         = /var/lib/mysql
log-error       = /var/log/mysql/error.log
[client]
socket=/var/run/mysqld/mysqld.sock
port=3306
EOF
fi

systemctl enable mysql 2>/dev/null || true
systemctl start mysql 2>/dev/null || true

# Socket attendu par aaPanel
[[ -e /tmp/mysql.sock ]] || ln -sf /var/run/mysqld/mysqld.sock /tmp/mysql.sock

log "Création base et utilisateur MySQL"
mysql -u root <<SQL
CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';
ALTER USER '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';
GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'localhost';
FLUSH PRIVILEGES;
SQL

mysql -u root -e "SHOW DATABASES LIKE '${DB_NAME}';"
echo "OK — Étape 2 terminée (base: ${DB_NAME}, user: ${DB_USER})"
