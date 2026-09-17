#!/bin/sh
# Startet Dashboard oder Worker. Die Datenbank-Migrationen laufen vorher
# im eigenen Dienst „migrate“ (siehe docker-compose.yml).
set -e

rolle="${1:-web}"

case "$rolle" in
  web)
    echo "Starte Dashboard auf Port ${PORT:-3000}."
    exec node server.js
    ;;
  worker)
    echo "Starte Worker."
    exec node dist/worker.mjs
    ;;
  *)
    echo "Unbekannte Rolle: $rolle (erwartet: web oder worker)" >&2
    exit 64
    ;;
esac
