#!/usr/bin/env bash
# Raccourci — délègue à deploy.sh (anciennement install-linux.sh)
# Usage : voir deploy/README-DEPLOIEMENT.md
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "Utilisez plutôt: sudo -E bash $DIR/deploy.sh"
echo "(avec PUBLIC_URL, SERVER_NAME, DB_PASSWORD définis)"
exit 1
