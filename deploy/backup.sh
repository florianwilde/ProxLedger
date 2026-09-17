#!/usr/bin/env bash
# Sichert Datenbank und hochgeladene PDFs von ProxLedger.
#
#   ./backup.sh /pfad/zum/sicherungsordner
#
# Für regelmäßige Sicherungen in die Crontab eintragen, z. B. täglich um 02:30 Uhr:
#   30 2 * * * /opt/proxledger/deploy/backup.sh /var/backups/proxledger

set -o errexit
set -o nounset
set -o pipefail

ZIEL="${1:-/var/backups/proxledger}"
AUFBEWAHRUNG_TAGE="${AUFBEWAHRUNG_TAGE:-30}"
STAND=$(date +%Y%m%d-%H%M%S)
COMPOSE_VERZEICHNIS="${COMPOSE_VERZEICHNIS:-/opt/proxledger}"

mkdir -p "$ZIEL"
cd "$COMPOSE_VERZEICHNIS"

echo "Sichere Datenbank …"
docker compose exec -T postgres pg_dump -U "${POSTGRES_USER:-proxledger}" "${POSTGRES_DB:-proxledger}" \
  | gzip > "${ZIEL}/datenbank-${STAND}.sql.gz"

echo "Sichere hochgeladene Dateien …"
docker compose run --rm -T --entrypoint tar web -czf - /data/uploads > "${ZIEL}/uploads-${STAND}.tar.gz" 2>/dev/null || true

echo "Sichere Konfiguration …"
cp .env "${ZIEL}/env-${STAND}.txt"
chmod 600 "${ZIEL}/env-${STAND}.txt"

echo "Entferne Sicherungen älter als ${AUFBEWAHRUNG_TAGE} Tage …"
find "$ZIEL" -maxdepth 1 -name "*-*.sql.gz" -mtime "+${AUFBEWAHRUNG_TAGE}" -delete
find "$ZIEL" -maxdepth 1 -name "*-*.tar.gz" -mtime "+${AUFBEWAHRUNG_TAGE}" -delete
find "$ZIEL" -maxdepth 1 -name "env-*.txt" -mtime "+${AUFBEWAHRUNG_TAGE}" -delete

echo "Fertig: ${ZIEL}"
ls -lh "$ZIEL" | tail -n 5
