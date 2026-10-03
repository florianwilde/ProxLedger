#!/usr/bin/env bash
# ProxLedger aktualisieren – erkennt selbst, ob die Installation mit Docker
# oder als Dienst im Container (Node + PostgreSQL direkt) läuft.
#
#   bash deploy/update.sh                 # sichern, holen, bauen, migrieren, neu starten
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

# Wohin gesichert wird. Der Standardort gehört root; wer anders arbeitet, setzt SICHERUNG_ZIEL.
SICHERUNG_ZIEL="${SICHERUNG_ZIEL:-/var/backups/proxledger}"

# ---------------------------------------------------------------- Art der Installation
#
# Der systemd-Dienst ist das eindeutigere Merkmal: Die docker-compose.yml liegt auch im
# Quelltext der Dienst-Installation, ein Dienst namens proxledger aber nur dort.
installationsart() {
  if systemctl cat proxledger.service >/dev/null 2>&1; then
    printf 'dienst'
  elif command -v docker >/dev/null 2>&1 && [ -f docker-compose.yml ]; then
    printf 'docker'
  fi
}

ART=$(installationsart)
[ -n "$ART" ] || fehler "Keine Installation gefunden – weder der Dienst proxledger noch Docker mit docker-compose.yml."

blau "Installationsart: ${ART}"

# ---------------------------------------------------------------- Sicherung
if [ "$SICHERN" = "ja" ]; then
  blau "Sicherung anlegen nach ${SICHERUNG_ZIEL} …"
  if ! bash deploy/backup.sh "$SICHERUNG_ZIEL"; then
    fehler "Die Sicherung ist fehlgeschlagen – deshalb wird nicht aktualisiert.
  Häufigste Ursache: fehlende Rechte am Zielordner. Mögliche Wege:
    sudo bash deploy/update.sh
    SICHERUNG_ZIEL=/pfad/mit/rechten bash deploy/update.sh
    bash deploy/update.sh --ohne-sicherung   (nur wenn anderweitig gesichert ist)"
  fi
  gruen "Sicherung abgeschlossen."
else
  printf '\033[1;33m! Ohne Sicherung – auf eigenes Risiko.\033[0m\n'
fi

# ---------------------------------------------------------------- Quelltext
if [ -d .git ]; then
  blau "Neuen Stand holen …"
  git pull --ff-only
else
  printf '\033[1;33m! Kein Git-Verzeichnis – der Quelltext bleibt wie er ist.\033[0m\n'
fi

# ---------------------------------------------------------------- Aktualisieren
if [ "$ART" = "docker" ]; then
  [ -f .env ] || fehler "Keine .env gefunden – wird dieses Skript im richtigen Verzeichnis ausgeführt?"

  blau "Abbilder neu bauen …"
  docker compose build --pull

  blau "Datenbank migrieren …"
  docker compose run --rm migrate

  blau "Dienste neu starten …"
  docker compose up -d
else
  command -v npm >/dev/null 2>&1 || fehler "npm nicht gefunden – gehört zur Installation als Dienst."
  [ -f .env ] || fehler "Keine .env gefunden (erwartet in ${VERZEICHNIS})."

  # Die .env trägt APP_SECRET; ein git pull fasst sie nicht an, aber sicher ist sicher.
  cp .env "/tmp/proxledger-env-$(date +%s).sicherung"

  blau "Abhängigkeiten installieren …"
  npm ci

  blau "Datenbank migrieren …"
  npx prisma generate
  npx prisma migrate deploy

  blau "Anwendung bauen …"
  npm run build
  npm run build:worker

  blau "Dienste neu starten …"
  systemctl restart proxledger proxledger-worker
fi

# ---------------------------------------------------------------- Prüfen
blau "Warte auf das Dashboard …"
PORT="${PORT:-3000}"

for versuch in $(seq 1 45); do
  if [ "$ART" = "docker" ]; then
    erreichbar=$(docker compose exec -T web wget -qO- "http://127.0.0.1:3000/api/gesundheit" >/dev/null 2>&1 && echo ja || echo nein)
  else
    erreichbar=$(curl -fsS -o /dev/null --max-time 2 "http://localhost:${PORT}/api/gesundheit" && echo ja || echo nein)
  fi

  if [ "$erreichbar" = "ja" ]; then
    gruen "ProxLedger läuft wieder (nach ${versuch} s)."
    [ "$ART" = "docker" ] && docker compose ps
    [ "$ART" = "dienst" ] && systemctl --no-pager --lines=0 status proxledger proxledger-worker | grep -E "●|Active:"
    exit 0
  fi
  sleep 1
done

if [ "$ART" = "docker" ]; then
  fehler "Das Dashboard antwortet nicht. Protokoll ansehen: docker compose logs -n 50 web"
else
  fehler "Das Dashboard antwortet nicht. Protokoll ansehen: journalctl -u proxledger -n 50"
fi
