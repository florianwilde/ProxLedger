#!/usr/bin/env bash
_CS_DEFAULT_URL="https://raw.githubusercontent.com/community-scripts/ProxmoxVE/main"
_cs_boot="${COMMUNITY_SCRIPTS_CORE_DIR:-$(dirname "${BASH_SOURCE[0]}")/../../core}/core/build.func"
source "$_cs_boot" 2>/dev/null || source <(curl -fsSL "${COMMUNITY_SCRIPTS_CORE_URL:-https://raw.githubusercontent.com/community-scripts/core/main}/core/build.func")
# Copyright (c) 2021-2026 tteck
# Author: Florian Wilde
# License: MIT | https://github.com/community-scripts/ProxmoxVE/raw/main/LICENSE
# Source: https://git.wilde-server.de/florian.wilde/ProxLedger

APP="ProxLedger"
var_tags="${var_tags:-monitoring;licensing}"
var_cpu="${var_cpu:-2}"
var_ram="${var_ram:-2048}"
var_disk="${var_disk:-10}"
var_os="${var_os:-debian}"
var_version="${var_version:-13}"
var_arm64="${var_arm64:-yes}"
var_unprivileged="${var_unprivileged:-1}"

header_info "$APP"
variables
color
catch_errors

function update_script() {
  header_info
  check_container_storage
  check_container_resources

  if [[ ! -d /opt/proxledger ]]; then
    msg_error "No ${APP} Installation Found!"
    exit
  fi

  NODE_VERSION="24" setup_nodejs

  msg_info "Stopping Services"
  systemctl stop proxledger proxledger-worker
  msg_ok "Stopped Services"

  # Die .env traegt APP_SECRET; geht sie verloren, sind Sitzungen und gespeicherte
  # Zugangsdaten unbrauchbar. Deshalb vor jedem Update sichern und danach zurueckspielen.
  create_backup /opt/proxledger/.env

  msg_info "Updating ${APP}"
  cd /opt/proxledger
  $STD git pull --ff-only
  $STD npm ci
  $STD npx prisma generate
  $STD npx prisma migrate deploy
  $STD npm run build
  $STD npm run build:worker
  msg_ok "Updated ${APP}"

  restore_backup

  msg_info "Starting Services"
  systemctl start proxledger proxledger-worker
  msg_ok "Started Services"

  msg_ok "Update Successful"
  exit
}

start
build_container
description

msg_ok "Completed Successfully!\n"
echo -e "${CREATING}${GN}${APP} setup has been successfully initialized!${CL}"
echo -e "${INFO}${YW} Access it using the following URL:${CL}"
echo -e "${TAB}${GATEWAY}${BGN}http://${IP}:3000${CL}"
echo -e "${INFO}${YW} Login credentials are in:${CL}"
echo -e "${TAB}${GATEWAY}${BGN}/opt/proxledger/.credentials${CL}"
