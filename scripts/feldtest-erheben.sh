#!/usr/bin/env bash
# Sammelt auf einem Proxmox-Host alle Ausgaben, die der ProxLedger-Agent auswertet.
# Es wird nichts installiert und nichts verändert – das Skript liest nur.
#
#   bash feldtest-erheben.sh              # Ausgabe anonymisiert (Empfehlung zum Weitergeben)
#   bash feldtest-erheben.sh --vollstaendig   # ohne Anonymisierung, nur für den eigenen Gebrauch
#
# Ergebnis: eine Textdatei im aktuellen Verzeichnis, die weitergegeben werden kann.

set -o nounset
set -o pipefail

ANONYM="ja"
[ "${1:-}" = "--vollstaendig" ] && ANONYM="nein"

AUSGABE="proxledger-feldtest-$(hostname -s 2>/dev/null || echo host)-$(date +%Y%m%d-%H%M%S).txt"

# Ersetzt Subscription-Keys, Server-IDs, Hostnamen und IP-Adressen durch Platzhalter.
anonymisieren() {
  if [ "$ANONYM" = "nein" ]; then
    cat
    return
  fi
  sed -E \
    -e 's/(pve[0-9]?[a-z]|pbs[a-z]|pmg[a-z])-[A-Za-z0-9]+/\1-KEY-ANONYMISIERT/g' \
    -e 's/([Ss]erverid:[[:space:]]*)[A-Za-z0-9]+/\1SERVERID-ANONYMISIERT/g' \
    -e 's/\b([0-9]{1,3}\.){3}[0-9]{1,3}\b/IP-ANONYMISIERT/g' \
    -e "s/$(hostname -s 2>/dev/null || echo unbekannt)/HOSTNAME-ANONYMISIERT/g"
}

abschnitt() {
  printf '\n===== %s =====\n' "$1"
}

# Führt einen Befehl aus und hält fest, ob es ihn überhaupt gibt.
zeige() {
  local befehl="$1"
  abschnitt "$befehl"
  if ! command -v "${befehl%% *}" >/dev/null 2>&1; then
    printf '(Befehl nicht vorhanden)\n'
    return
  fi
  eval "$befehl" 2>&1 | head -n 40
  printf '[Rückgabewert: %s]\n' "$?"
}

{
  printf 'ProxLedger – Erhebung für den Feldtest\n'
  printf 'Erstellt am: %s\n' "$(date -Is)"
  printf 'Anonymisiert: %s\n' "$ANONYM"

  abschnitt "Betriebssystem"
  cat /etc/os-release 2>/dev/null | head -n 5
  printf 'Kernel: %s\n' "$(uname -r)"

  abschnitt "Erkanntes Produkt"
  for befehl in pvesubscription proxmox-backup-manager pmgsubscription; do
    if command -v "$befehl" >/dev/null 2>&1; then
      printf 'gefunden: %s\n' "$befehl"
    fi
  done

  zeige "pvesubscription get"
  zeige "proxmox-backup-manager subscription get"
  zeige "pmgsubscription get"

  # Einige Fassungen können JSON – das wäre die stabilere Quelle.
  zeige "pvesubscription get --output-format json"
  zeige "proxmox-backup-manager subscription get --output-format json"

  zeige "pveversion"
  zeige "proxmox-backup-manager version"
  zeige "pmgversion"

  zeige "lscpu | grep -E 'Socket|Model name|Sockel|Modellname'"
  zeige "ip -o addr show scope global"
  zeige "hostname -f"
  zeige "pvecm status"
  zeige "apt list --upgradable 2>/dev/null | grep -c 'upgradable from'"

  abschnitt "Vorhandene Werkzeuge"
  for befehl in curl systemctl logger jq awk sed; do
    printf '%-12s %s\n' "$befehl" "$(command -v "$befehl" || echo 'FEHLT')"
  done

  abschnitt "Ende"
} 2>&1 | anonymisieren > "$AUSGABE"

printf 'Fertig: %s\n' "$AUSGABE"
printf 'Anonymisiert: %s (mit --vollstaendig ohne Anonymisierung)\n' "$ANONYM"
printf 'Bitte vor dem Weitergeben kurz durchsehen.\n'
