#!/usr/bin/env bash
# ProxLedger-Agent installieren.
#
#   curl -fsSL https://dashboard.example.de/install.sh | bash -s -- --token plx_e_...
#
# Optionen:
#   --token <TOKEN>   Enrollment-Token aus dem Dashboard (erforderlich)
#   --url <URL>       Adresse des Dashboards (Standard: Herkunft dieses Skripts)
#   --ca-cert <DATEI> eigenes CA-Zertifikat für TLS
#   --auto-update     Agent aktualisiert sich selbst, wenn das Dashboard eine neuere Version meldet
#   --uninstall       Agent vollständig entfernen
#   --help            diese Hilfe

set -o errexit
set -o nounset
set -o pipefail

DASHBOARD_URL="${PROXLEDGER_URL:-@@DASHBOARD_URL@@}"
# Melderhythmus und Streuung setzt das Dashboard beim Ausliefern ein (Einstellungen → System).
# Wird das Skript unverändert aus dem Quelltext ausgeführt, bleiben die Platzhalter stehen;
# dann gelten die Vorgaben.
TIMER_ONCALENDAR="@@TIMER_ONCALENDAR@@"
TIMER_STREUUNG="@@TIMER_STREUUNG@@"
case "$TIMER_ONCALENDAR" in *@@*) TIMER_ONCALENDAR="daily" ;; esac
case "$TIMER_STREUUNG" in *@@*) TIMER_STREUUNG="4h" ;; esac
TOKEN=""
CA_CERT=""
AUTO_UPDATE="@@AUTO_UPDATE@@"
case "$AUTO_UPDATE" in yes | no) ;; *) AUTO_UPDATE="no" ;; esac
AKTION="install"

CONFIG_VERZEICHNIS="/etc/proxledger"
CONFIG_DATEI="${CONFIG_VERZEICHNIS}/agent.conf"
AGENT_PFAD="/usr/local/bin/proxledger-agent"
SPOOL_VERZEICHNIS="/var/lib/proxledger/spool"
SYSTEMD_VERZEICHNIS="/etc/systemd/system"

hinweis() { printf '\033[1;36m›\033[0m %s\n' "$*"; }
erfolg() { printf '\033[1;32m✓\033[0m %s\n' "$*"; }
fehler() {
  printf '\033[1;31m✗\033[0m %s\n' "$*" >&2
  exit 1
}

hilfe() {
  sed -n '2,15p' "$0" | sed 's/^# \{0,1\}//'
}

while [ $# -gt 0 ]; do
  case "$1" in
    --token)
      TOKEN="${2:-}"
      shift 2
      ;;
    --url)
      DASHBOARD_URL="${2:-}"
      shift 2
      ;;
    --ca-cert)
      CA_CERT="${2:-}"
      shift 2
      ;;
    --auto-update)
      AUTO_UPDATE="yes"
      shift
      ;;
    --uninstall)
      AKTION="uninstall"
      shift
      ;;
    --help | -h)
      hilfe
      exit 0
      ;;
    *) fehler "Unbekannte Option: $1" ;;
  esac
done

[ "$(id -u)" -eq 0 ] || fehler "Bitte als root ausführen."

deinstallieren() {
  hinweis "Entferne ProxLedger-Agent …"
  systemctl disable --now proxledger.timer >/dev/null 2>&1 || true
  systemctl stop proxledger.service >/dev/null 2>&1 || true
  rm -f "${SYSTEMD_VERZEICHNIS}/proxledger.service" "${SYSTEMD_VERZEICHNIS}/proxledger.timer"
  systemctl daemon-reload
  rm -f "$AGENT_PFAD"
  rm -rf "$CONFIG_VERZEICHNIS" "$(dirname "$SPOOL_VERZEICHNIS")"
  erfolg "Agent entfernt. Der Host bleibt im Dashboard erhalten; dort ggf. den Token widerrufen."
}

if [ "$AKTION" = "uninstall" ]; then
  deinstallieren
  exit 0
fi

[ -n "$TOKEN" ] || fehler "Enrollment-Token fehlt (--token)."
[ -n "$DASHBOARD_URL" ] || fehler "Dashboard-Adresse fehlt (--url)."
DASHBOARD_URL=${DASHBOARD_URL%/}

command -v curl >/dev/null 2>&1 || fehler "curl ist nicht installiert."
command -v systemctl >/dev/null 2>&1 || fehler "systemd wird benötigt."

produkt_erkennen() {
  if command -v pvesubscription >/dev/null 2>&1; then
    printf 'pve'
  elif command -v proxmox-backup-manager >/dev/null 2>&1; then
    printf 'pbs'
  elif command -v pmgsubscription >/dev/null 2>&1; then
    printf 'pmg'
  fi
}

PRODUKT=$(produkt_erkennen)
[ -n "$PRODUKT" ] || fehler "Kein Proxmox-Produkt gefunden (VE, Backup Server oder Mail Gateway)."
hinweis "Produkt erkannt: ${PRODUKT}"

# Stabile Agent-Kennung: bleibt auch nach Hardwaretausch gleich, solange das System dasselbe ist.
maschinen_id() {
  local id=""
  [ -r /etc/machine-id ] && id=$(cat /etc/machine-id)
  [ -z "$id" ] && [ -r /var/lib/dbus/machine-id ] && id=$(cat /var/lib/dbus/machine-id)
  [ -z "$id" ] && id=$(hostname -f 2>/dev/null || hostname)
  printf '%s' "$id"
}

AGENT_ID=$(maschinen_id)
HOSTNAME_KURZ=$(hostname -s 2>/dev/null || hostname)
FQDN=$(hostname -f 2>/dev/null || printf '')

server_id() {
  case "$PRODUKT" in
    pve) pvesubscription get 2>/dev/null | sed -n 's/^serverid:[[:space:]]*//p' | head -n1 ;;
    pbs) proxmox-backup-manager subscription get 2>/dev/null | sed -n 's/^serverid:[[:space:]]*//p' | head -n1 ;;
    pmg) pmgsubscription get 2>/dev/null | sed -n 's/^serverid:[[:space:]]*//p' | head -n1 ;;
  esac
}

SERVER_ID=$(server_id)

hinweis "Registriere Host beim Dashboard …"
ANFRAGE=$(
  cat <<JSON
{"agentId":"${AGENT_ID}","hostname":"${HOSTNAME_KURZ}","fqdn":$([ -n "$FQDN" ] && printf '"%s"' "$FQDN" || printf 'null'),"produkt":"${PRODUKT}","serverId":$([ -n "$SERVER_ID" ] && printf '"%s"' "$SERVER_ID" || printf 'null'),"agentVersion":"@@AGENT_VERSION@@"}
JSON
)

ANTWORT=$(curl --silent --show-error --max-time 30 \
  ${CA_CERT:+--cacert "$CA_CERT"} \
  --header "Content-Type: application/json" \
  --header "Authorization: Bearer ${TOKEN}" \
  --write-out '\n%{http_code}' \
  --request POST --data "$ANFRAGE" "${DASHBOARD_URL}/api/agent/v1/enroll") || fehler "Dashboard nicht erreichbar."

HTTP_CODE=$(printf '%s' "$ANTWORT" | tail -n1)
KOERPER=$(printf '%s' "$ANTWORT" | sed '$d')

case "$HTTP_CODE" in
  200 | 201) ;;
  401) fehler "Enrollment-Token wurde abgelehnt (abgelaufen, widerrufen oder aufgebraucht)." ;;
  429) fehler "Zu viele Registrierungsversuche. Bitte später erneut versuchen." ;;
  *) fehler "Registrierung fehlgeschlagen (HTTP ${HTTP_CODE}): ${KOERPER}" ;;
esac

HOST_TOKEN=$(printf '%s' "$KOERPER" | sed -n 's/.*"token"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -n1)
[ -n "$HOST_TOKEN" ] || fehler "Dashboard hat keinen Host-Token geliefert."
erfolg "Host registriert."

hinweis "Installiere Agent nach ${AGENT_PFAD} …"
curl --silent --show-error --fail --max-time 60 \
  ${CA_CERT:+--cacert "$CA_CERT"} \
  "${DASHBOARD_URL}/agent.sh" -o "${AGENT_PFAD}.neu" || fehler "Agent-Skript konnte nicht geladen werden."
head -n1 "${AGENT_PFAD}.neu" | grep -q '^#!/usr/bin/env bash' || fehler "Heruntergeladene Datei ist kein Agent-Skript."
install -m 755 "${AGENT_PFAD}.neu" "$AGENT_PFAD"
rm -f "${AGENT_PFAD}.neu"

mkdir -p "$CONFIG_VERZEICHNIS" "$SPOOL_VERZEICHNIS"
chmod 700 "$CONFIG_VERZEICHNIS"
umask 077
cat >"$CONFIG_DATEI" <<CONF
# ProxLedger-Agent – Konfiguration (von install.sh erzeugt)
DASHBOARD_URL="${DASHBOARD_URL}"
TOKEN="${HOST_TOKEN}"
AGENT_ID="${AGENT_ID}"
# Eigenes CA-Zertifikat, falls das Dashboard ein privates Zertifikat nutzt:
CA_CERT="${CA_CERT}"
# Agent aktualisiert sich selbst, sobald das Dashboard eine neuere Version meldet:
AUTO_UPDATE="${AUTO_UPDATE}"
# TLS-Prüfung niemals dauerhaft abschalten – nur für Tests:
TLS_PRUEFEN="yes"
CONF
chmod 600 "$CONFIG_DATEI"
erfolg "Konfiguration geschrieben (${CONFIG_DATEI}, Rechte 600)."

cat >"${SYSTEMD_VERZEICHNIS}/proxledger.service" <<'UNIT'
[Unit]
Description=ProxLedger-Agent – meldet den Subscription-Status an das Dashboard
Documentation=https://github.com/proxledger
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
ExecStart=/usr/local/bin/proxledger-agent --report
Nice=10
# Der Agent liest nur Systeminformationen und braucht keine erweiterten Rechte.
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ProtectHome=true
UNIT

cat >"${SYSTEMD_VERZEICHNIS}/proxledger.timer" <<UNIT
[Unit]
Description=ProxLedger-Report

[Timer]
OnCalendar=${TIMER_ONCALENDAR}
# Verteilt die Meldungen aller Hosts über diesen Zeitraum.
RandomizedDelaySec=${TIMER_STREUUNG}
Persistent=true
Unit=proxledger.service

[Install]
WantedBy=timers.target
UNIT

systemctl daemon-reload
systemctl enable --now proxledger.timer >/dev/null
erfolg "systemd-Timer aktiviert (${TIMER_ONCALENDAR}, zufällig um bis zu ${TIMER_STREUUNG} versetzt)."

hinweis "Sende ersten Report …"
if "$AGENT_PFAD" --report; then
  erfolg "Erster Report übertragen."
else
  printf '\033[1;33m!\033[0m Erster Report fehlgeschlagen – er wird beim nächsten Lauf nachgesendet.\n'
fi

printf '\n'
erfolg "Fertig. Status prüfen mit: systemctl list-timers proxledger.timer"
printf '  Log ansehen:      journalctl -t proxledger -n 50\n'
printf '  Verbindung testen: %s --test\n' "$AGENT_PFAD"
printf '  Entfernen:        curl -fsSL %s/install.sh | bash -s -- --uninstall\n' "$DASHBOARD_URL"
