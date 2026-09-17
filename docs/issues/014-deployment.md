# #014 Deployment und Dokumentation
**Status:** offen
**Meilenstein:** v0.10.0
**Labels:** deployment, docs
**Geschätzt:** 8 h   **Tatsächlich:** –

## Ziel
ProxLedger einfach per Docker Compose oder als LXC-Container auf Proxmox betreiben.

## Aufgaben
- [ ] Dockerfile (Multi-Stage, Standalone-Output, Non-root)
- [ ] `docker-compose.yml` (web, worker, postgres), `.env.example`
- [ ] Migrationen beim Start, Healthcheck
- [ ] LXC-Installer im Stil der Community-Scripts (Debian, Ressourcenabfrage, systemd-Dienste)
- [ ] Reverse-Proxy-Beispiele (Caddy, nginx, Traefik)
- [ ] README (Deutsch): Dashboard installieren → Enrollment-Token → Agent ausrollen
- [ ] Backup-/Restore-Anleitung für die Datenbank und Uploads

## Akzeptanzkriterien
- [ ] `docker compose up -d` auf frischem System ergibt lauffähiges Dashboard
- [ ] LXC-Installer auf PVE 9 erfolgreich

## Abhängigkeiten
#013

## Notizen / Entscheidungen
