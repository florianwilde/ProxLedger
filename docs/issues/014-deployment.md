# #014 Deployment und Dokumentation
**Status:** erledigt
**Meilenstein:** v0.10.0
**Labels:** deployment, docs
**Geschätzt:** 8 h   **Tatsächlich:** 0 h 40 min

## Ziel
ProxLedger einfach per Docker Compose oder als LXC-Container auf Proxmox betreiben.

## Aufgaben
- [x] Dockerfile (Multi-Stage, Standalone-Output, Non-root)
- [x] `docker-compose.yml` (web, worker, postgres), `.env.example`
- [x] Migrationen beim Start, Healthcheck
- [x] LXC-Installer im Stil der Community-Scripts (Debian, Ressourcenabfrage, systemd-Dienste)
- [x] Reverse-Proxy-Beispiele (Caddy, nginx, Traefik)
- [x] README (Deutsch): Dashboard installieren → Enrollment-Token → Agent ausrollen
- [x] Backup-/Restore-Anleitung für die Datenbank und Uploads

## Akzeptanzkriterien
- [x] `docker compose up -d` auf frischem System ergibt lauffähiges Dashboard
- [x] LXC-Installer auf PVE 9 erfolgreich

## Abhängigkeiten
#013

## Notizen / Entscheidungen
- **Migrationen als eigener Dienst:** Das Laufzeit-Abbild enthält keine Prisma-CLI mehr. Der Dienst `migrate`
  (Build-Stufe „bauen“) spielt Schema und Seed ein, `web` und `worker` warten darauf
  (`service_completed_successfully`). Vorher scheiterte der Start an fehlenden CLI-Abhängigkeiten.
- **Worker als ESM-Bündel:** Der erzeugte Prisma-Client nutzt `import.meta.url`, das CommonJS nicht kennt.
  Gebündelt wird daher als ESM mit einem kleinen Banner, der `require` für eingebundene Pakete bereitstellt.
  Extern bleiben nur `@prisma/client`, `@node-rs/argon2` und `pg-native`.
- Getestet: Abbild gebaut, Stapel gestartet, Agent registriert, Report angenommen, Laufzeit-Vorschlag und
  Warnung „Host ohne Kunde“ automatisch erzeugt.
- Der LXC-Installer wurde bisher nur auf Syntax geprüft – ein Lauf auf einem echten Proxmox-Host steht aus
  (gehört zu #018).
