# Changelog

Alle nennenswerten Änderungen an ProxLedger werden in dieser Datei dokumentiert.

Das Format basiert auf [Keep a Changelog](https://keepachangelog.com/de/1.1.0/),
und dieses Projekt folgt [Semantic Versioning](https://semver.org/lang/de/).

## [Unveröffentlicht]

### Hinzugefügt

### Geändert

### Behoben

### Entfernt

### Sicherheit

## [0.1.0] – 2026-09-17

### Hinzugefügt
- Projektorganisation: Devlog, Changelog, Issue-Übersicht und Issues pro Phase (#001)
- Architektur- und Umsetzungsplan in `docs/architektur.md` (#001)
- Next.js-Grundgerüst mit AdminLTE-CSS, Bootstrap Icons, zod, ESLint, Prettier und Vitest (#001)
- Klickbarer Prototyp mit Beispieldaten: Dashboard, Kunden- und Host-Ansichten, Rechnungen, Jahresbahn (#002)
- ProxLedger-Logo als SVG-Komponente, Farbschema nach Vorgabe inklusive Dark-Mode (#002)
- Globale Suche über Key, Host, Kunde und Rechnungsnummer mit Strg+K (#002)
- Datenmodell mit Prisma: Kunden, Standorte, Hosts, Reports, Key- und Server-ID-Historie, Laufzeiten, Proxmox- und Kundenrechnungen mit Positionen, Tokens, Warnungen, Benachrichtigungen, Benutzer und Audit-Log (#003)
- Erste Migration, Seed für Administrator, Warnregeln und Demo-Daten (#003)
- Docker-Compose für die Entwicklungsdatenbank und Testdatenbank-Setup für Vitest (#003)
- Agent-API unter `/api/agent/v1`: Registrierung, Report und Verbindungstest (#004)
- Automatischer Laufzeit-Vorschlag, sobald ein Agent ein neues Ablaufdatum meldet (#004)
- Key- und Server-ID-Historie je Host (#004)

### Geändert

### Behoben

### Entfernt

### Sicherheit

### Sicherheit
- API-Tokens werden nur als SHA-256-Hash gespeichert und sind einzeln widerrufbar (#004)
- Rate-Limiting und strikte zod-Validierung auf der Agent-API (#004)
