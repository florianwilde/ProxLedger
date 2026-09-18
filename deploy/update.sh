#!/usr/bin/env bash
# ProxLedger aktualisieren (Docker-Installation).
#
#   bash deploy/update.sh            # Quelltext holen, neu bauen, migrieren, neu starten
#   bash deploy/update.sh --ohne-sicherung
#
# Vor dem Aktualisieren wird gesichert – das dauert Sekunden und erspart schlechte Abende.

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

SICHERN="ja"
[ "${1:-}" = "--ohne-sicherung" ] && SICHERN="nein"

command -v docker >/dev/null 2>&1 || fehler "Docker nicht gefunden."
[ -f .env ] || fehler "Keine .env gefunden – wird dieses Skript im richtigen Verzeichnis ausgeführt?"

if [ "$SICHERN" = "ja" ]; then
  blau "Sicherung anlegen …"
  bash deploy/backup.sh
  gruen "Sicherung abgeschlossen."
fi

if [ -d .git ]; then
  blau "Neuen Stand holen …"
  git pull --ff-only
fi

blau "Abbilder neu bauen …"
docker compose build --pull

blau "Datenbank migrieren …"
docker compose run --rm migrate

blau "Dienste neu starten …"
docker compose up -d

# Kurz warten und nachsehen, ob das Dashboard wieder antwortet.
blau "Warte auf das Dashboard …"
for versuch in $(seq 1 30); do
  if docker compose exec -T web wget -qO- http://localhost:3000/api/gesundheit >/dev/null 2>&1; then
    gruen "ProxLedger läuft wieder (nach ${versuch} s)."
    docker compose ps
    exit 0
  fi
  sleep 1
done

fehler "Das Dashboard antwortet nicht. Protokoll ansehen: docker compose logs -n 50 web"
