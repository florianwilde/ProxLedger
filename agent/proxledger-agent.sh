#!/usr/bin/env bash
# ProxLedger-Agent – meldet den Subscription-Status eines Proxmox-Hosts an das Dashboard.
# Läuft ohne zusätzliche Abhängigkeiten: nur curl und Bordmittel von Proxmox.
#
# Aufrufe:
#   proxledger-agent            Report erzeugen und senden (Standard, vom systemd-Timer aufgerufen)
#   proxledger-agent --dry-run  Report nur ausgeben, nichts senden
#   proxledger-agent --test     Verbindung zum Dashboard prüfen
#   proxledger-agent --update   Agent auf die vom Dashboard gemeldete Version aktualisieren
#   proxledger-agent --version  Version ausgeben

set -o nounset
set -o pipefail

AGENT_VERSION="0.2.2"
CONFIG_DATEI="${PROXLEDGER_CONFIG:-/etc/proxledger/agent.conf}"
SPOOL_VERZEICHNIS="${PROXLEDGER_SPOOL:-/var/lib/proxledger/spool}"
SPOOL_MAXIMUM=30
# Wartezeiten zwischen den Versuchen; für Tests über PROXLEDGER_WARTEZEITEN kürzbar.
read -r -a WARTEZEITEN <<<"${PROXLEDGER_WARTEZEITEN:-30 120 480}"

# --------------------------------------------------------------------- Protokoll

protokoll() {
  local stufe="$1"
  shift
  if command -v logger >/dev/null 2>&1; then
    logger -t proxledger -p "daemon.${stufe}" -- "$*" 2>/dev/null || true
  fi
  printf '%s [%s] %s\n' "$(datum_jetzt)" "$stufe" "$*" >&2
}

datum_jetzt() {
  date -u '+%Y-%m-%dT%H:%M:%SZ'
}

# --------------------------------------------------------------------- JSON-Hilfen

# Maskiert einen Wert für JSON (ohne jq, das auf Proxmox nicht überall vorhanden ist).
json_text() {
  local wert="$1"
  if [ -z "$wert" ]; then
    printf 'null'
    return
  fi
  wert=${wert//\\/\\\\}
  wert=${wert//\"/\\\"}
  wert=${wert//$'\t'/\\t}
  wert=${wert//$'\r'/}
  wert=${wert//$'\n'/\\n}
  # Übrige Steuerzeichen entfernen, damit immer gültiges JSON entsteht.
  wert=$(printf '%s' "$wert" | tr -d '\000-\010\013\014\016-\037')
  printf '"%s"' "$wert"
}

# Gibt eine Zahl aus oder null, wenn der Wert leer bzw. keine Zahl ist.
json_zahl() {
  local wert="$1"
  if [[ "$wert" =~ ^-?[0-9]+$ ]]; then
    printf '%s' "$wert"
  else
    printf 'null'
  fi
}

# Baut aus Zeilen eine JSON-Liste; leere Eingabe ergibt [].
json_liste() {
  local ausgabe="[" erste=1 zeile
  while IFS= read -r zeile; do
    [ -z "$zeile" ] && continue
    if [ $erste -eq 0 ]; then ausgabe+=","; fi
    ausgabe+=$(json_text "$zeile")
    erste=0
  done
  printf '%s]' "$ausgabe"
}

# --------------------------------------------------------------------- Konfiguration

konfiguration_laden() {
  DASHBOARD_URL=""
  TOKEN=""
  CA_CERT=""
  AUTO_UPDATE="no"
  # Steht in der Konfiguration, die der Installer schreibt; der Agent selbst liest sie nicht.
  # shellcheck disable=SC2034
  AGENT_ID=""
  TLS_PRUEFEN="yes"

  if [ -r "$CONFIG_DATEI" ]; then
    # shellcheck disable=SC1090
    . "$CONFIG_DATEI"
  fi
}

# --------------------------------------------------------------------- Datensammlung

produkt_erkennen() {
  if command -v pvesubscription >/dev/null 2>&1; then
    printf 'pve'
  elif command -v proxmox-backup-manager >/dev/null 2>&1; then
    printf 'pbs'
  elif command -v pmgsubscription >/dev/null 2>&1; then
    printf 'pmg'
  else
    printf ''
  fi
}

subscription_ausgabe() {
  local ausgabe=""
  case "$1" in
    # PVE kennt --output-format nicht (geprueft auf 9.2), liefert aber "feld: wert".
    pve) pvesubscription get 2>/dev/null ;;
    # PBS gibt ohne --output-format eine Rahmentabelle aus, aus der sich schlecht lesen laesst.
    # JSON kann es (geprueft auf 4.2); aeltere Fassungen faengt die Tabellenauswertung ab.
    pbs)
      ausgabe=$(proxmox-backup-manager subscription get --output-format json 2>/dev/null)
      [ -n "$ausgabe" ] || ausgabe=$(proxmox-backup-manager subscription get 2>/dev/null)
      printf '%s' "$ausgabe"
      ;;
    pmg) pmgsubscription get 2>/dev/null ;;
    *) printf '' ;;
  esac
}

# Liest ein Feld aus der Subscription-Ausgabe. Unterstuetzt "feld: wert", JSON und die
# Rahmentabelle von PBS ("| feld | wert |" mit Unicode-Strichen).
feld_lesen() {
  local feld="$1" text="$2" wert
  wert=$(printf '%s\n' "$text" | sed -n "s/^[[:space:]]*${feld}[[:space:]]*:[[:space:]]*//p" | head -n1)
  if [ -z "$wert" ]; then
    wert=$(printf '%s\n' "$text" |
      sed -n "s/.*\"${feld}\"[[:space:]]*:[[:space:]]*\"\{0,1\}\([^\",}]*\)\"\{0,1\}.*/\1/p" | head -n1)
  fi
  if [ -z "$wert" ]; then
    # Tabellenzeile: Trennzeichen ist U+2502; awk zerlegt daran und liefert die zweite Spalte.
    wert=$(printf '%s\n' "$text" |
      awk -F'\xe2\x94\x82' -v feld="$feld" '
        NF >= 3 {
          name = $2; gsub(/^[ \t]+|[ \t]+$/, "", name)
          if (name == feld) { wert = $3; gsub(/^[ \t]+|[ \t]+$/, "", wert); print wert; exit }
        }')
  fi
  # Umschließende Anführungszeichen und Leerzeichen entfernen.
  wert=${wert%\"}
  wert=${wert#\"}
  printf '%s' "$wert" | sed 's/[[:space:]]*$//'
}

produkt_version() {
  # Bei PVE hängt die Kernel-Angabe mit im String ("… (running kernel: …)").
  # Der Kernel wird separat gemeldet, deshalb hier abschneiden.
  case "$1" in
    pve) pveversion 2>/dev/null | head -n1 | sed 's/ (running kernel.*//' ;;
    # PBS haengt die laufende Fassung an ("… 4.2.6-1 running version: 4.2.1");
    # gemeldet wird die installierte.
    pbs) proxmox-backup-manager version 2>/dev/null | head -n1 | sed 's/ running version.*//' ;;
    pmg) pmgversion 2>/dev/null | head -n1 ;;
    *) printf '' ;;
  esac
}

ip_adressen() {
  if command -v ip >/dev/null 2>&1; then
    ip -o addr show scope global 2>/dev/null | awk '{print $4}' | cut -d/ -f1
  else
    hostname -I 2>/dev/null | tr ' ' '\n'
  fi
}

cluster_name() {
  if command -v pvecm >/dev/null 2>&1; then
    pvecm status 2>/dev/null | sed -n 's/^[[:space:]]*Name:[[:space:]]*//p' | head -n1
  fi
}

# Namen aller Cluster-Mitglieder laut corosync. Auch Knoten ohne Agent stehen hier –
# daraus erkennt das Dashboard vergessene Knoten (#022).
# Namen aller Cluster-Knoten aus `pvecm nodes`.
#
# Die Spaltenzahl ist nicht fest: Mit einem QDevice steht zwischen Votes und Name noch dessen
# Zustand (A,V,NMW oder NR). Deshalb wird die Spalte "Name" aus der Kopfzeile bestimmt, statt
# blind die dritte zu nehmen. Die Zeile des QDevice selbst traegt die Nodeid 0 und ist kein Knoten.
cluster_mitglieder() {
  if command -v pvecm >/dev/null 2>&1; then
    pvecm nodes 2>/dev/null | awk '
      /Nodeid/ {
        for (i = 1; i <= NF; i++) if ($i == "Name") spalte = i
        next
      }
      /^[[:space:]]*[0-9]+[[:space:]]+[0-9]+/ {
        if ($1 == 0) next
        name = (spalte ? $spalte : $3)
        sub(/\(.*/, "", name)
        if (name != "") print name
      }'
  fi
}

node_name() {
  if command -v pvecm >/dev/null 2>&1 && pvecm status >/dev/null 2>&1; then
    hostname -s 2>/dev/null
  fi
}

cpu_sockets() {
  if command -v lscpu >/dev/null 2>&1; then
    lscpu 2>/dev/null | sed -n 's/^Socket(s):[[:space:]]*//p' | head -n1
  fi
}

cpu_modell() {
  if command -v lscpu >/dev/null 2>&1; then
    lscpu 2>/dev/null | sed -n 's/^Model name:[[:space:]]*//p' | head -n1
  fi
}

uptime_sekunden() {
  if [ -r /proc/uptime ]; then
    cut -d. -f1 /proc/uptime
  fi
}

paket_updates() {
  if command -v apt >/dev/null 2>&1; then
    # Die Kopfzeile "Auflistung..." zählt nicht mit.
    apt list --upgradable 2>/dev/null | grep -c 'upgradable from' || true
  fi
}

report_id() {
  if [ -r /proc/sys/kernel/random/uuid ]; then
    cat /proc/sys/kernel/random/uuid
  else
    printf 'report-%s-%s' "$(date -u '+%Y%m%d%H%M%S')" "$RANDOM$RANDOM"
  fi
}

# Erzeugt den vollständigen Report als JSON. Fehlende Werte werden zu null.
report_erzeugen() {
  local produkt subscription key status level productname sockets serverid regdate nextduedate checktime
  produkt=$(produkt_erkennen)
  subscription=$(subscription_ausgabe "$produkt")

  key=$(feld_lesen "key" "$subscription")
  status=$(feld_lesen "status" "$subscription")
  level=$(feld_lesen "level" "$subscription")
  productname=$(feld_lesen "productname" "$subscription")
  sockets=$(feld_lesen "sockets" "$subscription")
  serverid=$(feld_lesen "serverid" "$subscription")
  regdate=$(feld_lesen "regdate" "$subscription")
  nextduedate=$(feld_lesen "nextduedate" "$subscription")
  checktime=$(feld_lesen "checktime" "$subscription")

  # Proxmox liefert Datumsangaben teils mit Uhrzeit; das Dashboard erwartet nur den Tag.
  regdate=${regdate%% *}
  nextduedate=${nextduedate%% *}

  cat <<JSON
{
  "reportId": $(json_text "$(report_id)"),
  "agentVersion": $(json_text "$AGENT_VERSION"),
  "erhobenAm": $(json_text "$(datum_jetzt)"),
  "host": {
    "hostname": $(json_text "$(hostname -s 2>/dev/null)"),
    "fqdn": $(json_text "$(hostname -f 2>/dev/null)"),
    "ips": $(ip_adressen | json_liste),
    "clusterName": $(json_text "$(cluster_name)"),
    "nodeName": $(json_text "$(node_name)"),
    "clusterMitglieder": $(cluster_mitglieder | json_liste),
    "kernel": $(json_text "$(uname -r 2>/dev/null)"),
    "uptimeSekunden": $(json_zahl "$(uptime_sekunden)"),
    "cpuModell": $(json_text "$(cpu_modell)"),
    "sockets": $(json_zahl "$(cpu_sockets)"),
    "paketUpdates": $(json_zahl "$(paket_updates)")
  },
  "produkt": {
    "typ": $(json_text "$produkt"),
    "version": $(json_text "$(produkt_version "$produkt")")
  },
  "subscription": {
    "key": $(json_text "$key"),
    "status": $(json_text "$status"),
    "level": $(json_text "$level"),
    "productname": $(json_text "$productname"),
    "sockets": $(json_zahl "$sockets"),
    "serverid": $(json_text "$serverid"),
    "regdate": $(json_text "$regdate"),
    "nextduedate": $(json_text "$nextduedate"),
    "checktime": $(json_text "$checktime")
  }
}
JSON
}

# --------------------------------------------------------------------- Versand

curl_optionen() {
  local optionen=(--silent --show-error --max-time 30 --header "Content-Type: application/json")
  optionen+=(--header "Authorization: Bearer ${TOKEN}")
  optionen+=(--header "User-Agent: proxledger-agent/${AGENT_VERSION}")
  if [ -n "$CA_CERT" ]; then
    optionen+=(--cacert "$CA_CERT")
  fi
  if [ "$TLS_PRUEFEN" = "no" ]; then
    # Nur für Testumgebungen; die Konfiguration warnt davor.
    optionen+=(--insecure)
  fi
  printf '%s\n' "${optionen[@]}"
}

# Sendet einen Report; 0 = erfolgreich, 1 = Fehler.
report_senden() {
  local nutzdaten="$1" antwort http_code
  local -a optionen
  mapfile -t optionen < <(curl_optionen)

  antwort=$(curl "${optionen[@]}" --write-out '\n%{http_code}' \
    --request POST --data "$nutzdaten" "${DASHBOARD_URL}/api/agent/v1/report" 2>&1)
  http_code=$(printf '%s' "$antwort" | tail -n1)

  case "$http_code" in
    200 | 201)
      neueste_version_merken "$antwort"
      return 0
      ;;
    401 | 403)
      protokoll err "Dashboard lehnt den Token ab (HTTP $http_code). Agent neu registrieren."
      return 1
      ;;
    "")
      protokoll warning "Dashboard nicht erreichbar."
      return 1
      ;;
    *)
      protokoll warning "Dashboard antwortet mit HTTP ${http_code}."
      return 1
      ;;
  esac
}

neueste_version_merken() {
  NEUESTE_VERSION=$(printf '%s' "$1" |
    sed -n 's/.*"agentVersion"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -n1)
}

# Versucht den Versand mehrfach mit wachsenden Wartezeiten.
mit_wiederholung_senden() {
  local nutzdaten="$1" versuch=0

  if report_senden "$nutzdaten"; then
    return 0
  fi

  for wartezeit in "${WARTEZEITEN[@]}"; do
    versuch=$((versuch + 1))
    protokoll info "Neuer Versuch ${versuch} in ${wartezeit} s."
    sleep "$wartezeit"
    if report_senden "$nutzdaten"; then
      return 0
    fi
  done

  return 1
}

spool_ablegen() {
  local nutzdaten="$1" datei
  mkdir -p "$SPOOL_VERZEICHNIS" 2>/dev/null || return 1
  datei="${SPOOL_VERZEICHNIS}/$(date -u '+%Y%m%d%H%M%S')-$$.json"
  printf '%s\n' "$nutzdaten" >"$datei"
  chmod 600 "$datei" 2>/dev/null || true
  protokoll info "Report zwischengespeichert: $datei"
  spool_begrenzen
}

# Bewahrt nur die neuesten Dateien auf, damit der Spool nicht unbegrenzt wächst.
spool_begrenzen() {
  local anzahl
  anzahl=$(find "$SPOOL_VERZEICHNIS" -maxdepth 1 -name '*.json' 2>/dev/null | wc -l)
  if [ "$anzahl" -gt "$SPOOL_MAXIMUM" ]; then
    find "$SPOOL_VERZEICHNIS" -maxdepth 1 -name '*.json' -printf '%T@ %p\n' 2>/dev/null |
      sort -n | head -n "$((anzahl - SPOOL_MAXIMUM))" | cut -d' ' -f2- |
      while IFS= read -r alt; do rm -f "$alt"; done
  fi
}

# Sendet zwischengespeicherte Reports nach; erfolgreiche werden gelöscht.
spool_nachsenden() {
  [ -d "$SPOOL_VERZEICHNIS" ] || return 0
  local datei inhalt
  for datei in "$SPOOL_VERZEICHNIS"/*.json; do
    [ -e "$datei" ] || continue
    inhalt=$(cat "$datei")
    if report_senden "$inhalt"; then
      rm -f "$datei"
      protokoll info "Nachgesendeter Report übertragen: $(basename "$datei")"
    else
      protokoll info "Nachsenden verschoben, Dashboard nicht erreichbar."
      return 0
    fi
  done
}

# --------------------------------------------------------------------- Aktionen

aktion_report() {
  konfiguration_pruefen
  spool_nachsenden

  local nutzdaten
  nutzdaten=$(report_erzeugen)

  if mit_wiederholung_senden "$nutzdaten"; then
    protokoll info "Report übertragen (Agent ${AGENT_VERSION})."
    version_pruefen
    return 0
  fi

  spool_ablegen "$nutzdaten"
  return 1
}

aktion_test() {
  konfiguration_pruefen
  local -a optionen
  mapfile -t optionen < <(curl_optionen)
  local antwort
  antwort=$(curl "${optionen[@]}" --write-out '\n%{http_code}' "${DASHBOARD_URL}/api/agent/v1/ping")
  printf '%s\n' "$antwort"
  [ "$(printf '%s' "$antwort" | tail -n1)" = "200" ]
}

# Ist $1 eine neuere Fassung als $2? `sort -V` vergleicht Versionsnummern der Reihe nach.
version_neuer() {
  [ "$1" != "$2" ] && [ "$(printf '%s\n%s\n' "$1" "$2" | sort -V | tail -n1)" = "$1" ]
}

version_pruefen() {
  # Nur melden, wenn das Dashboard wirklich eine neuere Fassung kennt. Sonst warnt ein Agent,
  # der einer Testinstallation vorauseilt, gegen sich selbst (im Feldtest #023 aufgefallen).
  if [ -n "${NEUESTE_VERSION:-}" ] && version_neuer "$NEUESTE_VERSION" "$AGENT_VERSION"; then
    protokoll notice "Neue Agent-Version verfügbar: ${NEUESTE_VERSION} (installiert: ${AGENT_VERSION})."
    if [ "$AUTO_UPDATE" = "yes" ]; then
      aktion_update
    fi
  fi
}

aktion_update() {
  konfiguration_pruefen
  local ziel="/usr/local/bin/proxledger-agent" temp
  temp=$(mktemp)
  if curl --silent --show-error --fail --max-time 60 \
    ${CA_CERT:+--cacert "$CA_CERT"} \
    "${DASHBOARD_URL}/agent.sh" -o "$temp"; then
    if head -n1 "$temp" | grep -q '^#!/usr/bin/env bash'; then
      install -m 755 "$temp" "$ziel"
      rm -f "$temp"
      protokoll notice "Agent aktualisiert auf $("$ziel" --version)."
      return 0
    fi
    protokoll err "Heruntergeladene Datei ist kein Agent-Skript – Update abgebrochen."
  else
    protokoll err "Update fehlgeschlagen: Dashboard nicht erreichbar."
  fi
  rm -f "$temp"
  return 1
}

konfiguration_pruefen() {
  if [ -z "$DASHBOARD_URL" ] || [ -z "$TOKEN" ]; then
    protokoll err "Konfiguration unvollständig (${CONFIG_DATEI}). Bitte neu installieren."
    exit 2
  fi
  DASHBOARD_URL=${DASHBOARD_URL%/}
}

# --------------------------------------------------------------------- Einstieg

konfiguration_laden

case "${1:---report}" in
  --report | "")
    aktion_report
    ;;
  --dry-run)
    report_erzeugen
    ;;
  --test)
    aktion_test
    ;;
  --update)
    aktion_update
    ;;
  --version)
    printf '%s\n' "$AGENT_VERSION"
    ;;
  --help | -h)
    sed -n '2,12p' "$0" | sed 's/^# \{0,1\}//'
    ;;
  *)
    printf 'Unbekannte Option: %s\n' "$1" >&2
    exit 64
    ;;
esac
