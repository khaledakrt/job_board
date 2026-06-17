#!/usr/bin/env bash
# Installe le cron hebdomadaire des alertes emploi candidat.
# Usage : sudo bash deploy/scripts/09-install-job-alert-cron.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"
require_root
require_app_root

CRON_FILE="/etc/cron.d/jobboard-weekly-alerts"
CRON_USER="${JOBBOARD_CRON_USER:-jobboard}"
CRON_HOUR="${JOBBOARD_ALERT_CRON_HOUR:-9}"
CRON_MINUTE="${JOBBOARD_ALERT_CRON_MINUTE:-0}"
LOG_FILE="${JOBBOARD_ALERT_LOG_FILE:-/var/log/jobboard-weekly-alerts.log}"

cat > "$CRON_FILE" <<EOF
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

${CRON_MINUTE} ${CRON_HOUR} * * 0 ${CRON_USER} cd ${APP_ROOT}/backend && npm run jobs:scheduled-alerts >> ${LOG_FILE} 2>&1
EOF

chmod 0644 "$CRON_FILE"
touch "$LOG_FILE"
chown "$CRON_USER":"$CRON_USER" "$LOG_FILE" 2>/dev/null || true

echo "Cron installé: $CRON_FILE"
echo "Planification: dimanche ${CRON_HOUR}:${CRON_MINUTE} (${CRON_USER})"
