#!/usr/bin/env bash

# Copyright (c) 2021-2026 tteck
# Author: Florian Wilde
# License: MIT | https://github.com/community-scripts/ProxmoxVE/raw/main/LICENSE
# Source: https://git.wilde-server.de/florian.wilde/ProxLedger

source /dev/stdin <<<"$FUNCTIONS_FILE_PATH"
color
verb_ip6
catch_errors
setting_up_container
network_check
update_os

# Die Quelle laesst sich ueberschreiben, solange das Repository nicht oeffentlich ist.
QUELLE="${PROXLEDGER_REPO:-https://git.wilde-server.de/florian.wilde/ProxLedger.git}"
ZWEIG="${PROXLEDGER_BRANCH:-main}"

msg_info "Installing Dependencies"
$STD apt install -y git ca-certificates
msg_ok "Installed Dependencies"

NODE_VERSION="24" setup_nodejs
PG_VERSION="17" setup_postgresql

msg_info "Setting up Database"
DB_NAME="proxledger"
DB_USER="proxledger"
DB_PASS=$(openssl rand -base64 24 | tr -dc 'A-Za-z0-9' | head -c 24)
ADMIN_PASS=$(openssl rand -base64 24 | tr -dc 'A-Za-z0-9' | head -c 20)
# APP_SECRET signiert die Sitzungen und verschluesselt gespeicherte Zugangsdaten.
APP_SECRET=$(openssl rand -base64 48)

$STD sudo -u postgres psql -c "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASS}';"
$STD sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME} WITH OWNER ${DB_USER} ENCODING 'UTF8';"
msg_ok "Set up Database"

msg_info "Setting up ProxLedger"
$STD git clone --branch "$ZWEIG" --depth 1 "$QUELLE" /opt/proxledger
cd /opt/proxledger

# Erreichbare Adresse des Containers ermitteln. `hostname -I` liefert sie in aller Regel;
# notfalls hilft die Route nach draussen. 0.0.0.0 waere eine Lausch-Adresse und im Browser nutzlos.
IP_ADRESSE=$(hostname -I 2>/dev/null | awk '{print $1}')
if [ -z "$IP_ADRESSE" ] || [ "$IP_ADRESSE" = "0.0.0.0" ]; then
  IP_ADRESSE=$(ip route get 1.1.1.1 2>/dev/null | awk '/src/ {print $7; exit}')
fi
[ -n "$IP_ADRESSE" ] || IP_ADRESSE="localhost"
cat <<EOF >/opt/proxledger/.env
DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}?schema=public"
APP_SECRET="${APP_SECRET}"
APP_URL="http://${IP_ADRESSE}:3000"
ADMIN_EMAIL="admin@proxledger.local"
ADMIN_NAME="Administrator"
ADMIN_PASSWORD="${ADMIN_PASS}"
UPLOAD_DIR="/opt/proxledger/data/uploads"
NODE_ENV="production"
PORT="3000"
EOF
chmod 600 /opt/proxledger/.env
mkdir -p /opt/proxledger/data/uploads

$STD npm ci
$STD npx prisma generate
$STD npx prisma migrate deploy
$STD npx prisma db seed
$STD npm run build
$STD npm run build:worker
msg_ok "Set up ProxLedger"

msg_info "Creating Services"
cat <<EOF >/etc/systemd/system/proxledger.service
[Unit]
Description=ProxLedger Dashboard
After=network.target postgresql.service
Requires=postgresql.service

[Service]
Type=simple
WorkingDirectory=/opt/proxledger
EnvironmentFile=/opt/proxledger/.env
ExecStart=/usr/bin/npm run start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

cat <<EOF >/etc/systemd/system/proxledger-worker.service
[Unit]
Description=ProxLedger Worker (Warnregeln und Benachrichtigungen)
After=network.target postgresql.service
Requires=postgresql.service

[Service]
Type=simple
WorkingDirectory=/opt/proxledger
EnvironmentFile=/opt/proxledger/.env
ExecStart=/usr/bin/node dist/worker.mjs
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

systemctl enable -q --now proxledger proxledger-worker
msg_ok "Created Services"

# Die Zugangsdaten liegen fuer den Betreiber lesbar im Container; APP_SECRET steht in der .env.
{
  echo "ProxLedger"
  echo "Adresse:     http://${IP_ADRESSE}:3000"
  echo "             (Im Journal steht 0.0.0.0:3000 - das ist nur die Lausch-Adresse,"
  echo "              im Browser gehoert die obige IP oder der spaetere DNS-Name hinein.)"
  echo "Benutzer:    admin@proxledger.local"
  echo "Passwort:    ${ADMIN_PASS}"
  echo
  echo "Datenbank:   ${DB_NAME} / ${DB_USER} / ${DB_PASS}"
  echo
  echo "Wichtig: APP_SECRET aus /opt/proxledger/.env mitsichern."
  echo "Ohne diesen Wert sind Sitzungen und gespeicherte Zugangsdaten unbrauchbar."
} >>~/proxledger.creds
cp ~/proxledger.creds /opt/proxledger/.credentials
chmod 600 /opt/proxledger/.credentials

motd_ssh
customize

msg_info "Cleaning up"
$STD apt -y autoremove
$STD apt -y autoclean
msg_ok "Cleaned"
