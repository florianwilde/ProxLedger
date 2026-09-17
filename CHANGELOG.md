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

## [0.12.0] – 2026-09-17

### Hinzugefügt
- Handbuch mit Bildern: Installation, Agent-Rollout, Zuweisung, Rechnungen, Warnungen, Benachrichtigungen, Exporte, Sicherung und Fehlersuche (#016)
- `npm run screenshots` erzeugt alle Bilder des Handbuchs neu, auch im dunklen Design und in der Mobilansicht (#016)

## [0.11.1] – 2026-09-17

### Behoben
- Nach der Anmeldung führte jeder Klick zurück zur Anmeldeseite: Das Sitzungs-Cookie erhielt im Produktionsbau immer das Merkmal `Secure` und wurde über `http://` vom Browser verworfen. Maßgeblich ist jetzt die tatsächliche Adresse (`APP_URL`) (#013)

### Geändert
- Die Anmeldung läuft über ein gewöhnliches Formular statt über eine Server-Action; damit funktioniert sie auch ohne JavaScript (#013)

## [0.11.0] – 2026-09-17

### Geändert
- Auswertung der Warnregeln um den Faktor 13 beschleunigt: neue Warnungen entstehen sammelweise (#015)
- Aufgaben-Karte auf dem Dashboard zeigt höchstens zwölf Punkte und verweist für den Rest auf die Rechnungsliste (#015)
- Große Tabellen blenden auf schmalen Bildschirmen gestaffelt Spalten aus, statt quer zu scrollen (#015)

### Behoben
- Das Logo war im dunklen Design praktisch unsichtbar; seine Farben folgen jetzt dem Farbschema (#015)

## [0.10.0] – 2026-09-17

### Hinzugefügt
- Dockerfile (mehrstufig, Standalone-Ausgabe, Betrieb ohne root) und `docker-compose.yml` mit Dashboard, Worker, Datenbank und einmaligem Migrationsdienst (#014)
- LXC-Installer für Proxmox-Hosts: legt den Container an, installiert Docker, erzeugt Zufallspasswörter und startet alles (#014)
- Beispiele für Caddy, nginx und Traefik als Reverse Proxy (#014)
- Sicherungsskript für Datenbank, PDFs und Konfiguration (#014)
- Zustandsprüfung unter `/api/gesundheit` (#014)
- README mit Schnellstart, Agent-Rollout, Betriebs- und Sicherungshinweisen (#014)

## [0.9.0] – 2026-09-17

### Hinzugefügt
- Anmeldung mit E-Mail und Passwort sowie über OIDC (z. B. authentik); der lokale Zugang bleibt als Rückfallweg immer nutzbar (#013)
- Anmeldeseite im AdminLTE-Stil mit Logo (#013)
- Audit-Log-Ansicht mit Filter nach Aktion und Entität (#013)

### Geändert
- Audit-Einträge vermerken den angemeldeten Benutzer; Worker und Skripte erscheinen als „System“ (#013)

### Sicherheit
- Alle Seiten der Oberfläche sind ohne Anmeldung nicht erreichbar; Agent-API und Skript-Auslieferung bleiben offen (#013)
- Sitzungen als signiertes Cookie (`APP_SECRET`), fünf Anmeldeversuche je Kennung und Viertelstunde (#013)
- Sicherheits-Kopfzeilen: HSTS, nosniff, DENY für Frames, Referrer-Policy, Permissions-Policy (#013)

## [0.8.0] – 2026-09-17

### Hinzugefügt
- E-Mail-Versand über SMTP mit STARTTLS, abgestimmt auf Microsoft 365 (#012)
- Generischer Webhook mit JSON-Nutzdaten und optionaler HMAC-Signatur (#012)
- Tägliche oder wöchentliche Zusammenfassung mit offenen Warnungen, Rechnungspunkten und bald ablaufenden Subscriptions (#012)
- Einstellungsseite mit Testversand und Versandprotokoll (#012)

### Sicherheit
- Benachrichtigungen werden je Warnung nur einmal verschickt; fehlgeschlagene Versuche werden protokolliert und später wiederholt (#012)

## [0.7.0] – 2026-09-17

### Hinzugefügt
- Zehn Warnregeln: Ablauf in 30/14/7 Tagen, Status nicht aktiv, Socket-Abweichung, keine Meldung seit 48 Stunden, geänderte Server-ID, mehrfach gemeldeter Key, Host ohne Kunde, fällige Proxmox-Rechnung, fehlende und überfällige Kundenrechnung (#011)
- Worker-Prozess (`npm run worker`), der die Regeln stündlich auswertet; zusätzlich Auswertung nach jedem eingehenden Report (#011)
- Seite „Warnungen“ mit Filter offen/erledigt, Quittieren, Schließen und sofortiger Prüfung (#011)
- Einstellungsseite für Regeln und Schwellwerte (#011)

### Geändert
- Warnungen schließen sich automatisch, sobald die Ursache behoben ist; Titel und Beschreibung werden laufend nachgeführt (#011)

## [0.6.0] – 2026-09-17

### Hinzugefügt
- Jahresbahn mit zwölf Monaten, Heute-Linie und Gruppierung nach Kunde, aus echten Daten (#009)
- Ablauf-Kalender für die nächsten 90 Tage samt Rechnungsstatus und eine Übersicht bereits abgelaufener Subscriptions (#009)
- CSV-Export für Kundenübersicht und Rechnungsliste, PDF-Export für Hosts, Kunden und Rechnungen (#010)
- Kundenunterlage als PDF: Hosts, Laufzeiten, Summen pro Jahr und Marge eines Kunden (#010)

### Geändert
- Die Oberfläche arbeitet vollständig mit der Datenbank; Beispieldaten dienen nur noch dem Seed (#009)

## [0.5.0] – 2026-09-17

### Hinzugefügt
- Laufzeit-Vorschläge der Agents bestätigen oder verwerfen (#008)
- Proxmox- und Kundenrechnungen erfassen; gleiche Rechnungsnummer fasst mehrere Laufzeiten zu einer Sammelrechnung zusammen (#008)
- PDF-Upload für beide Rechnungsarten mit Prüfung des Dateiinhalts und Ablage unter der Prüfsumme (#008)
- Rechnungsübersicht mit Häkchen „bezahlt“ und „erstellt“ direkt in der Zeile, Filter nach Status, Kunde, Jahr und Suchbegriff (#008)
- Detailseite je Laufzeit mit Beträgen, Marge und Übersicht der Sammelrechnung (#008)
- Laufzeiten lassen sich von Hand anlegen (#008)

### Geändert
- Die Aufgabenliste auf dem Dashboard setzt beim Abhaken den Rechnungsstatus in der Datenbank (#008)

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
