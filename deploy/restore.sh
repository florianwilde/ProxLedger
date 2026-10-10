#!/usr/bin/env bash
# ProxLedger aus einer Sicherung wiederherstellen (#046).
#
#   bash deploy/restore.sh /var/backups/proxledger            # jüngste Sicherung
#   bash deploy/restore.sh /var/backups/proxledger 20261010-192437
#   bash deploy/restore.sh … --ja                             # ohne Rückfrage
#
# Spielt Datenbank und hochgeladene PDFs zurück. Die `.env` wird **nicht** angefasst:
# Sie trägt APP_SECRET, und ein falscher Wert dort macht gespeicherte Zugangsdaten unlesbar.
# Die passende Fassung liegt als env-<Stand>.txt in der Sicherung – im Zweifel von Hand vergleichen.

set -o errexit
set -o nounset
set -o pipefail

VERZEICHNIS=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
cd "$VERZEICHNIS"

blau() { printf '\033[1;36m› %s\033[0m\n' "$*"; }
gruen() { printf '\033[1;32m✓ %s\033[0m\n' "$*"; }
fehler() {
  printf '\033[1;31m✗ %s\033[0m\n' "$*" >&2
  exit 1
}

QUELLE="${1:-/var/backups/proxledger}"
STAND="${2:-}"
[ "${2:-}" = "--ja" ] && STAND=""
OHNE_RUECKFRAGE="nein"
for argument in "$@"; do [ "$argument" = "--ja" ] && OHNE_RUECKFRAGE="ja"; done

[ -d "$QUELLE" ] || fehler "Kein Sicherungsordner unter ${QUELLE}."

# Jüngste Sicherung nehmen, wenn kein Stand angegeben ist.
if [ -z "$STAND" ]; then
  DATENBANK=$(ls -1t "${QUELLE}"/datenbank-*.sql.gz 2>/dev/null | head -n1 || true)
else
  DATENBANK="${QUELLE}/datenbank-${STAND}.sql.gz"
fi

[ -n "${DATENBANK:-}" ] && [ -f "$DATENBANK" ] || fehler "Keine Datenbanksicherung in ${QUELLE} gefunden."
UPLOADS="${DATENBANK/datenbank-/uploads-}"
UPLOADS="${UPLOADS/.sql.gz/.tar.gz}"

# Siehe deploy/update.sh – der Dienst ist das eindeutigere Merkmal.
if systemctl cat proxledger.service >/dev/null 2>&1; then
  ART="dienst"
else
  ART="docker"
fi

printf '\033[1;33m! Achtung: Der aktuelle Datenbestand wird durch die Sicherung ersetzt.\033[0m\n'
echo "  Installationsart: ${ART}"
echo "  Datenbank:        $(basename "$DATENBANK")"
echo "  Uploads:          $([ -f "$UPLOADS" ] && basename "$UPLOADS" || echo 'keine in dieser Sicherung')"

if [ "$OHNE_RUECKFRAGE" != "ja" ]; then
  read -r -p "Wirklich zurückspielen? [tippen Sie ja] " antwort
  [ "$antwort" = "ja" ] || fehler "Abgebrochen."
fi

# ---------------------------------------------------------------- Datenbank
blau "Datenbank zurückspielen …"
if [ "$ART" = "docker" ]; then
  # Web und Worker anhalten: Sie würden während des Einspielens weiterschreiben.
  docker compose stop web worker >/dev/null 2>&1 || true
  docker compose up -d postgres >/dev/null
  # Kurz warten, bis Postgres Verbindungen annimmt.
  for _ in $(seq 1 30); do
    docker compose exec -T postgres pg_isready -U "${POSTGRES_USER:-proxledger}" >/dev/null 2>&1 && break
    sleep 1
  done
  gunzip -c "$DATENBANK" | docker compose exec -T postgres psql -U "${POSTGRES_USER:-proxledger}" \
    -d "${POSTGRES_DB:-proxledger}" >/dev/null
else
  systemctl stop proxledger proxledger-worker >/dev/null 2>&1 || true
  # shellcheck disable=SC1091
  set -o allexport
  . ./.env
  set +o allexport
  [ -n "${DATABASE_URL:-}" ] || fehler "DATABASE_URL fehlt in der .env."
  gunzip -c "$DATENBANK" | psql "$DATABASE_URL" >/dev/null
fi
gruen "Datenbank zurückgespielt."

# ---------------------------------------------------------------- Uploads
if [ -f "$UPLOADS" ]; then
  blau "Hochgeladene PDFs zurückspielen …"
  if [ "$ART" = "docker" ]; then
    # Das Archiv enthält den Pfad /data/uploads – deshalb nach / entpacken.
    docker compose run --rm -T --entrypoint tar web -xzf - -C / < "$UPLOADS"
  else
    ZIEL_UPLOADS="${UPLOAD_DIR:-${VERZEICHNIS}/data/uploads}"
    mkdir -p "$(dirname "$ZIEL_UPLOADS")"
    tar -xzf "$UPLOADS" -C "$(dirname "$ZIEL_UPLOADS")"
  fi
  gruen "PDFs zurückgespielt."
fi

# ---------------------------------------------------------------- Starten und prüfen
blau "Dienste starten …"
if [ "$ART" = "docker" ]; then
  docker compose up -d >/dev/null
else
  systemctl start proxledger proxledger-worker
fi

PORT="${PORT:-3000}"
for versuch in $(seq 1 45); do
  if [ "$ART" = "docker" ]; then
    erreichbar=$(docker compose exec -T web wget -qO- "http://127.0.0.1:3000/api/gesundheit" >/dev/null 2>&1 && echo ja || echo nein)
  else
    erreichbar=$(curl -fsS -o /dev/null --max-time 2 "http://localhost:${PORT}/api/gesundheit" && echo ja || echo nein)
  fi

  if [ "$erreichbar" = "ja" ]; then
    gruen "ProxLedger läuft wieder (nach ${versuch} s)."
    echo
    echo "Bitte jetzt anmelden und stichprobenartig prüfen, ob die Daten vollständig sind."
    echo "Passt das Passwort nicht, stammt die Sicherung aus einer Zeit vor der letzten Änderung –"
    echo "dann hilft: npm run benutzer -- passwort <email>"
    exit 0
  fi
  sleep 1
done

fehler "Das Dashboard antwortet nicht. Protokoll ansehen: docker compose logs -n 50 web"
