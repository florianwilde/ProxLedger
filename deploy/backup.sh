#!/usr/bin/env bash
# Sichert Datenbank, hochgeladene PDFs und die Konfiguration von ProxLedger.
# Erkennt selbst, ob die Installation mit Docker oder als Dienst im Container läuft.
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
VERZEICHNIS="${COMPOSE_VERZEICHNIS:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"

mkdir -p "$ZIEL"
cd "$VERZEICHNIS"

# Siehe deploy/update.sh – der Dienst ist das eindeutigere Merkmal.
if systemctl cat proxledger.service >/dev/null 2>&1; then
  ART="dienst"
else
  ART="docker"
fi

echo "Sichere ProxLedger (${ART}) nach ${ZIEL} …"

if [ "$ART" = "docker" ]; then
  echo "Sichere Datenbank …"
  docker compose exec -T postgres pg_dump --clean --if-exists \
    -U "${POSTGRES_USER:-proxledger}" "${POSTGRES_DB:-proxledger}" \
    | gzip > "${ZIEL}/datenbank-${STAND}.sql.gz"

  echo "Sichere hochgeladene Dateien …"
  docker compose run --rm -T --entrypoint tar web -czf - /data/uploads > "${ZIEL}/uploads-${STAND}.tar.gz" 2>/dev/null || true
else
  # DATABASE_URL steht in der .env; pg_dump versteht sie direkt.
  # shellcheck disable=SC1091
  set -o allexport
  . ./.env
  set +o allexport

  [ -n "${DATABASE_URL:-}" ] || {
    echo "DATABASE_URL fehlt in der .env – ohne sie keine Sicherung." >&2
    exit 1
  }

  echo "Sichere Datenbank …"
  pg_dump --clean --if-exists "$DATABASE_URL" | gzip > "${ZIEL}/datenbank-${STAND}.sql.gz"

  echo "Sichere hochgeladene Dateien …"
  UPLOADS="${UPLOAD_DIR:-${VERZEICHNIS}/data/uploads}"
  if [ -d "$UPLOADS" ]; then
    tar -czf "${ZIEL}/uploads-${STAND}.tar.gz" -C "$(dirname "$UPLOADS")" "$(basename "$UPLOADS")"
  else
    echo "  (kein Upload-Verzeichnis unter ${UPLOADS})"
  fi
fi

echo "Sichere Konfiguration …"
cp .env "${ZIEL}/env-${STAND}.txt"
chmod 600 "${ZIEL}/env-${STAND}.txt"

echo "Entferne Sicherungen älter als ${AUFBEWAHRUNG_TAGE} Tage …"
find "$ZIEL" -maxdepth 1 -name "*-*.sql.gz" -mtime "+${AUFBEWAHRUNG_TAGE}" -delete
find "$ZIEL" -maxdepth 1 -name "*-*.tar.gz" -mtime "+${AUFBEWAHRUNG_TAGE}" -delete
find "$ZIEL" -maxdepth 1 -name "env-*.txt" -mtime "+${AUFBEWAHRUNG_TAGE}" -delete

echo "Fertig: ${ZIEL}"
ls -lh "$ZIEL" | tail -n 5
