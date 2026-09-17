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

## [0.4.2] – 2026-09-17

### Geändert
- Der Issue-Abgleich holt Serveradresse und Repository aus dem Git-Remote und den Token aus den hinterlegten Git-Zugangsdaten; ein zweiter Token in der `.env` ist nicht mehr nötig (#020)

## [0.4.1] – 2026-09-17

### Hinzugefügt
- Abgleich der Issue-Dateien mit dem Gitea-Tracker über `npm run issues:sync`, inklusive Labels, Meilensteinen und Trockenlauf (#020)

## [0.4.0] – 2026-09-17

### Hinzugefügt
- Host-Tabelle mit Suche über Hostname, FQDN, Key, Server-ID, IP, Kunde und Rechnungsnummer (#007)
- Filter nach Kunde, Status, Produkt, Ablauffrist und offenen Rechnungspunkten; Sortierung und Seitenblättern (#007)
- CSV-Export der Host-Liste unter Berücksichtigung der aktiven Filter (#007)
- Host-Detailansicht mit Übersicht, Subscription-Historie, Reports, Rechnungen, Notizen mit Tags und Tokens (#007)
- Kunde eines Hosts direkt in der Detailansicht ändern (#007)

### Geändert
- Host-Tabelle und Host-Detail arbeiten mit echten Daten statt Beispieldaten (#007)

## [0.3.0] – 2026-09-17

### Hinzugefügt
- Kunden anlegen, bearbeiten und löschen; Standorte je Kunde verwalten (#006)
- Seite „Nicht zugeordnete Hosts“ mit Mehrfachauswahl und Zuweisung in einem Schritt (#006)
- Enrollment-Tokens erzeugen (mit Gültigkeit, Nutzungsgrenze und optionaler Kundenbindung), anzeigen und widerrufen; Host-Tokens widerrufen (#006)
- Audit-Log-Einträge für alle Änderungen an Kunden, Standorten, Zuweisungen und Tokens (#006)

### Geändert
- Dashboard, Kundenübersicht, Kunden-Detail und globale Suche arbeiten mit echten Daten statt Beispieldaten (#006)

### Behoben
- Prisma-Client öffnete in der Produktionsumgebung bei jedem Zugriff einen neuen Verbindungspool (#006)

## [0.2.0] – 2026-09-17

### Hinzugefügt
- Agent-Skript in Bash: erkennt Proxmox VE, Backup Server und Mail Gateway, sammelt Subscription-, Host- und Systemdaten (#005)
- Installation per One-Liner mit Enrollment-Token, systemd-Service und -Timer (täglich, zufällig versetzt) (#005)
- Zwischenspeicher für Reports samt Nachsenden, wenn das Dashboard nicht erreichbar ist (#005)
- Update- und Uninstall-Funktion sowie Verbindungstest (`--test`) und Vorschau (`--dry-run`) (#005)
- Dashboard liefert `install.sh` und `agent.sh` mit eingesetzter Adresse und Version aus (#005)

### Sicherheit
- Konfiguration des Agents mit Rechten 600, TLS-Prüfung standardmäßig aktiv, optional eigenes CA-Zertifikat (#005)

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
