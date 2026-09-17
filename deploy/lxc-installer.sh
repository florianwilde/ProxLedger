#!/usr/bin/env bash
# ProxLedger – Installation als LXC-Container auf einem Proxmox-VE-Host.
#
# Auf dem Proxmox-Host ausführen:
#   bash lxc-installer.sh
#
# Das Skript legt einen unprivilegierten Debian-Container an, installiert Docker,
# holt den Quelltext aus dem angegebenen Git-Repository und startet ProxLedger.

set -o errexit
set -o nounset
set -o pipefail

VORLAGE="debian-13-standard"
STANDARD_HOSTNAME="proxledger"
STANDARD_CPU=2
STANDARD_RAM=2048
STANDARD_PLATTE=12
STANDARD_BRIDGE="vmbr0"

blau() { printf '\033[1;36m%s\033[0m\n' "$*"; }
gruen() { printf '\033[1;32m✓ %s\033[0m\n' "$*"; }
gelb() { printf '\033[1;33m! %s\033[0m\n' "$*"; }
fehler() {
  printf '\033[1;31m✗ %s\033[0m\n' "$*" >&2
  exit 1
}

frage() {
  local text="$1" standard="${2:-}" antwort
  if [ -n "$standard" ]; then
    read -r -p "$text [$standard]: " antwort
    printf '%s' "${antwort:-$standard}"
  else
    read -r -p "$text: " antwort
    printf '%s' "$antwort"
  fi
}

# --------------------------------------------------------------- Voraussetzungen

[ "$(id -u)" -eq 0 ] || fehler "Bitte als root auf dem Proxmox-Host ausführen."
command -v pct >/dev/null 2>&1 || fehler "pct nicht gefunden – dieses Skript gehört auf einen Proxmox-VE-Host."

blau "ProxLedger – Installation als LXC-Container"
echo

# --------------------------------------------------------------- Abfragen

NAECHSTE_ID=$(pvesh get /cluster/nextid 2>/dev/null || echo 100)
CTID=$(frage "Container-ID" "$NAECHSTE_ID")
pct status "$CTID" >/dev/null 2>&1 && fehler "Container $CTID gibt es bereits."

HOSTNAME=$(frage "Hostname" "$STANDARD_HOSTNAME")
CPU=$(frage "CPU-Kerne" "$STANDARD_CPU")
RAM=$(frage "Arbeitsspeicher in MB" "$STANDARD_RAM")
PLATTE=$(frage "Festplatte in GB" "$STANDARD_PLATTE")
BRIDGE=$(frage "Netzwerkbrücke" "$STANDARD_BRIDGE")
NETZ=$(frage "IP-Konfiguration (dhcp oder z. B. 192.168.1.50/24)" "dhcp")

if [ "$NETZ" != "dhcp" ]; then
  GATEWAY=$(frage "Gateway" "${NETZ%.*}.1")
  NETZ_OPTION="ip=${NETZ},gw=${GATEWAY}"
else
  NETZ_OPTION="ip=dhcp"
fi

echo
blau "Woher soll der Quelltext kommen?"
REPO=$(frage "Git-Repository (z. B. https://git.example.de/benutzer/ProxLedger.git)")
[ -n "$REPO" ] || fehler "Ohne Repository kann nichts installiert werden."
ZWEIG=$(frage "Branch" "main")

echo
SPEICHER=$(frage "Speicherort für den Container" "local-lvm")
VORLAGEN_SPEICHER=$(frage "Speicherort der Vorlagen" "local")

# --------------------------------------------------------------- Vorlage

blau "Suche Container-Vorlage …"
VORLAGEN_DATEI=$(pveam available --section system 2>/dev/null | awk -v v="$VORLAGE" '$2 ~ v {print $2}' | sort -r | head -n1)
[ -n "$VORLAGEN_DATEI" ] || fehler "Keine Vorlage für ${VORLAGE} gefunden (pveam update ausführen?)."

if ! pveam list "$VORLAGEN_SPEICHER" 2>/dev/null | grep -q "$VORLAGEN_DATEI"; then
  blau "Lade Vorlage ${VORLAGEN_DATEI} …"
  pveam download "$VORLAGEN_SPEICHER" "$VORLAGEN_DATEI"
fi
gruen "Vorlage bereit: ${VORLAGEN_DATEI}"

# --------------------------------------------------------------- Container anlegen

blau "Lege Container ${CTID} an …"
pct create "$CTID" "${VORLAGEN_SPEICHER}:vztmpl/${VORLAGEN_DATEI}" \
  --hostname "$HOSTNAME" \
  --cores "$CPU" \
  --memory "$RAM" \
  --swap 512 \
  --rootfs "${SPEICHER}:${PLATTE}" \
  --net0 "name=eth0,bridge=${BRIDGE},${NETZ_OPTION}" \
  --unprivileged 1 \
  --features nesting=1 \
  --onboot 1 \
  --description "ProxLedger – Proxmox Subscription Dashboard"

pct start "$CTID"
gruen "Container gestartet."

blau "Warte auf das Netzwerk …"
for _ in $(seq 1 30); do
  pct exec "$CTID" -- ping -c1 -W1 deb.debian.org >/dev/null 2>&1 && break
  sleep 2
done

# --------------------------------------------------------------- Software

blau "Installiere Docker im Container …"
pct exec "$CTID" -- bash -c "
  set -e
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -qq
  apt-get install -y -qq ca-certificates curl git openssl >/dev/null
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  echo \"deb [arch=\$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian \$(. /etc/os-release && echo \$VERSION_CODENAME) stable\" > /etc/apt/sources.list.d/docker.list
  apt-get update -qq
  apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin >/dev/null
  systemctl enable --now docker >/dev/null
"
gruen "Docker installiert."

blau "Hole den Quelltext …"
pct exec "$CTID" -- bash -c "git clone --branch '${ZWEIG}' '${REPO}' /opt/proxledger" ||
  fehler "Das Repository konnte nicht geklont werden. Bei privaten Repositories einen Token in der Adresse verwenden."
gruen "Quelltext liegt in /opt/proxledger."

blau "Erzeuge Konfiguration …"
pct exec "$CTID" -- bash -c '
  set -e
  cd /opt/proxledger
  APP_SECRET=$(openssl rand -base64 48 | tr -d "\n")
  DB_PASSWORT=$(openssl rand -base64 24 | tr -d "\n/+=")
  ADMIN_PASSWORT=$(openssl rand -base64 12 | tr -d "\n/+=")
  IP=$(hostname -I | awk "{print \$1}")

  cat > .env <<CONF
POSTGRES_USER=proxledger
POSTGRES_PASSWORD=${DB_PASSWORT}
POSTGRES_DB=proxledger
PORT=3000
APP_SECRET=${APP_SECRET}
APP_URL=http://${IP}:3000
ADMIN_EMAIL=admin@example.de
ADMIN_NAME=Administrator
ADMIN_PASSWORD=${ADMIN_PASSWORT}
CONF
  chmod 600 .env
  echo "${ADMIN_PASSWORT}" > /root/proxledger-admin-passwort.txt
  chmod 600 /root/proxledger-admin-passwort.txt
'
gruen "Konfiguration geschrieben (/opt/proxledger/.env, Rechte 600)."

blau "Baue und starte ProxLedger – das dauert einige Minuten …"
pct exec "$CTID" -- bash -c "cd /opt/proxledger && docker compose up -d --build"

IP=$(pct exec "$CTID" -- hostname -I | awk '{print $1}')
PASSWORT=$(pct exec "$CTID" -- cat /root/proxledger-admin-passwort.txt)

echo
gruen "ProxLedger läuft."
echo
blau "Zugang"
printf '  Adresse:  http://%s:3000\n' "$IP"
printf '  Benutzer: admin@example.de\n'
printf '  Passwort: %s\n' "$PASSWORT"
echo
blau "Nächste Schritte"
printf '  1. Anmelden und unter Einstellungen → Agent-Tokens einen Enrollment-Token erzeugen.\n'
printf '  2. Auf jedem Proxmox-Host: curl -fsSL http://%s:3000/install.sh | bash -s -- --token <TOKEN>\n' "$IP"
printf '  3. Für den Betrieb über HTTPS einen Reverse Proxy davorsetzen (Beispiele in deploy/).\n'
echo
gelb "APP_URL in /opt/proxledger/.env auf die endgültige Adresse setzen, sobald der Reverse Proxy steht."
printf '  Logs ansehen:   pct exec %s -- docker compose -f /opt/proxledger/docker-compose.yml logs -f\n' "$CTID"
printf '  Aktualisieren:  pct exec %s -- bash -c "cd /opt/proxledger && git pull && docker compose up -d --build"\n' "$CTID"
