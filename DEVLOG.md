# DEVLOG – ProxLedger

## Zeitübersicht

**Gesamt:** 7 h 08 min

| Issue | Zeit |
|---|---|
| #001 Projekt-Setup | 0 h 08 min |
| #002 Klickbarer Prototyp | 0 h 20 min |
| #003 Datenmodell und Migrationen | 0 h 25 min |
| #004 Agent-API | 0 h 20 min |
| #005 Agent-Skript | 0 h 25 min |
| #006 Kunden und Hostzuweisung | 0 h 35 min |
| #007 Host-Tabelle und Detailansichten | 0 h 25 min |
| #020 Issues nach Gitea übertragen | 0 h 20 min |
| #008 Laufzeiten und Rechnungen | 0 h 35 min |
| #009 Jahresbahn und Ablauf-Kalender | 0 h 15 min |
| #010 Export CSV und PDF | 0 h 20 min |
| #011 Warnregeln | 0 h 30 min |
| #012 Benachrichtigungen | 0 h 25 min |
| #013 Authentifizierung | 0 h 30 min |
| #014 Deployment | 0 h 40 min |
| #015 Feinschliff | 0 h 35 min |
| #016 Handbuch | 0 h 30 min |

| Meilenstein | Zeit |
|---|---|
| v0.1.0 | 1 h 13 min | **abgeschlossen**
| v0.2.0 | 0 h 25 min | **abgeschlossen**
| v0.3.0 | 0 h 35 min | **abgeschlossen**
| v0.4.0 | 0 h 25 min | **abgeschlossen**
| v0.4.1 | 0 h 10 min | **abgeschlossen**
| v0.4.2 | 0 h 10 min | **abgeschlossen**
| v0.5.0 | 0 h 35 min | **abgeschlossen**
| v0.6.0 | 0 h 35 min | **abgeschlossen**
| v0.7.0 | 0 h 30 min | **abgeschlossen**
| v0.8.0 | 0 h 25 min | **abgeschlossen**
| v0.9.0 | 0 h 30 min | **abgeschlossen**
| v0.10.0 | 0 h 40 min | **abgeschlossen**
| v0.11.0 | 0 h 35 min | **abgeschlossen**
| v0.12.0 | 0 h 30 min | **abgeschlossen**

---

## 2026-09-17 · Sitzung 1 · 19:36–laufend
**Issue:** #001–#007 (Meilensteine v0.1.0 bis v0.4.0)
**Version:** 0.12.0

### Erledigt
- Auftrag gelesen, Rückfragen gestellt
- Umgebung geprüft: Ubuntu 26.04, Git 2.53; Node/Docker fehlten → Node 24 LTS per nvm installiert
- Repository-Rechte korrigiert (Verzeichnis gehörte root), Branch `master` → `main`, Git-Identität lokal gesetzt
- `.gitignore`, `CHANGELOG.md`, `DEVLOG.md`, Architekturplan und 15 Issues angelegt
- #001 abgeschlossen: Next.js 16 (App Router, TypeScript strict), AdminLTE-CSS, Bootstrap Icons, zod, ESLint/Prettier/Vitest; Lint, Typecheck, Test und Build grün
- #002 abgeschlossen: Prototyp mit Beispieldaten – Layout (Sidebar, Kopfleiste, Inhaltskopf, Footer), Logo als SVG-Komponente, Theme mit Farbvorgaben und Dark-Mode, Dashboard, Kunden (Liste und Detail), Hosts (Liste, Detail, nicht zugeordnet), Rechnungen, Jahresbahn, Einstellungsseiten, globale Suche mit Strg+K
- Screenshots aller Seiten aufgenommen und in `docs/anleitung/bilder/` abgelegt
- #003 abgeschlossen: Prisma-Schema mit 23 Modellen, erste Migration, Seed (Administrator, 10 Warnregeln, Demo-Daten), Testdatenbank-Setup für Vitest, 3 Schema-Tests
- #004 abgeschlossen: Agent-API mit Enrollment, Report und Ping, gehashte Tokens, Rate-Limit, zod-Validierung, 32 Tests insgesamt
- Meilenstein v0.1.0 abgeschlossen und getaggt
- #005 abgeschlossen: Bash-Agent mit Produkterkennung, JSON ohne jq, Retry mit Backoff, Spool, systemd-Timer, Installer, Uninstall und Update; Dashboard liefert `/install.sh` und `/agent.sh` aus
- Meilenstein v0.2.0 abgeschlossen und getaggt; 38 Tests
- #006 abgeschlossen: Kunden und Standorte pflegen, Mehrfachzuweisung nicht zugeordneter Hosts, Enrollment- und Host-Tokens verwalten, Audit-Log; Dashboard, Kundenseiten und globale Suche laufen auf der Datenbank
- Durchlauf gegen den laufenden Server geprüft: Token anlegen → `enroll` → Agent-Report → Laufzeit-Vorschlag → Host erscheint als „nicht zugeordnet“ → `ping`
- Meilenstein v0.3.0 abgeschlossen und getaggt; 45 Tests
- Issues #017 bis #019 aus bisherigen Notizen angelegt (Favicons, Feldtest des Agents, CI-Pipeline)
- #007 abgeschlossen: Host-Tabelle mit Suche, fünf Filtern, Sortierung, Seitenblättern und CSV-Export; Host-Detail mit sechs Tabs, Notizen, Tags, Kundenzuweisung und Token-Widerruf
- Meilenstein v0.4.0 abgeschlossen und getaggt; 59 Tests
- #020 abgeschlossen: Abgleichskript für den Gitea-Issue-Tracker (Missverständnis geklärt – die Issues lagen bisher nur als Dateien im Repo, nicht im Tracker)
- Token kommt aus den Git-Zugangsdaten statt aus einer zweiten Stelle; 20 Issues, 15 Labels und 13 Meilensteine in Gitea angelegt
- Alles nach Gitea gepusht: main bei 51243c2, Tags v0.1.0 bis v0.4.1
- #008 abgeschlossen: Laufzeit-Vorschläge bestätigen oder verwerfen, Rechnungen mit Positionen erfassen, PDF-Upload, Häkchen direkt in der Tabelle, Filter nach Status, Kunde und Jahr; Aufgabenliste auf dem Dashboard setzt jetzt echte Status
- Meilenstein v0.5.0 abgeschlossen; 78 Tests
- #009 abgeschlossen: Jahresbahn und Ablauf-Kalender (90 Tage) aus der Datenbank, dazu eine Karte für bereits abgelaufene Subscriptions; die Oberfläche nutzt keine Beispieldaten mehr
- #010 abgeschlossen: CSV- und PDF-Export für Hosts, Kunden, einzelne Kundenunterlage und Rechnungsliste; PDFs serverseitig ohne Browser
- Meilenstein v0.6.0 abgeschlossen
- #011 abgeschlossen: zehn Warnregeln als reine Funktionen, Abgleich mit offenen Warnungen, Worker mit stündlichem Zeitplan, Auswertung nach jedem Report, Warnungsliste und Einstellungsseite; 123 Tests
- Meilenstein v0.7.0 abgeschlossen
- #012 abgeschlossen: SMTP (Microsoft 365), generischer Webhook mit Signatur, Zusammenfassung, Versandprotokoll, Testversand; keine Doppelmeldungen dank Prüfung gegen das Protokoll
- Issue #021 angelegt: Zugangsdaten liegen noch unverschlüsselt in der Datenbank
- Meilenstein v0.8.0 abgeschlossen; 134 Tests
- #013 abgeschlossen: Anmeldung mit Passwort und OIDC, Schutz aller Seiten über `proxy.ts`, Anmeldeseite im AdminLTE-Stil, Audit-Log-Ansicht, Sicherheits-Kopfzeilen, Rate-Limit bei Anmeldeversuchen
- Meilenstein v0.9.0 abgeschlossen; 147 Tests
- #014 abgeschlossen: Dockerfile (Standalone, Non-root), Compose mit web/worker/postgres/migrate, LXC-Installer, Reverse-Proxy-Beispiele, Sicherungsskript, README mit Schnellstart und Betriebshinweisen
- Container-Stapel wirklich gebaut und geprüft: Agent registriert sich, Report kommt an, Warnung entsteht automatisch
- Meilenstein v0.10.0 abgeschlossen
- #015 abgeschlossen: Dark-Mode geprüft (Logo war unsichtbar – behoben), Mobilansicht ohne Querscrollen, Lasttest mit 200 Hosts und 365.000 Reports, Auswertung der Warnregeln von 3813 auf 293 ms beschleunigt, Sicherheitsdurchsicht
- Als v0.11.0 veröffentlicht statt 1.0.0: Feldtest, Handbuch, Favicons, CI und Verschlüsselung der Zugangsdaten stehen noch aus
- 0.11.1: Anmeldefehler behoben (Secure-Cookie über http)
- #016 abgeschlossen: Handbuch mit elf Kapiteln und 16 Bildern, dazu `npm run screenshots` zum Auffrischen

### Entscheidungen
- **Warnungen sammelweise anlegen:** Einzelne Upserts kosteten bei 737 neuen Warnungen 3,8 s; mit `createMany` sind es 0,3 s.
- **Keine 1.0.0 ohne Feldtest:** Solange der Agent auf keinem echten Proxmox-Host lief, wäre die Zahl ein falsches Versprechen.
- **Kein Auth.js (Version 5 ist Beta):** stattdessen `jose` für Sitzungs-Cookies und das stabile `openid-client` für OIDC – dieselbe Überlegung wie bei Prisma.
- **Warnstufen im Fingerabdruck** (`…:7`): Der Wechsel 30 → 14 → 7 schließt die alte Warnung und öffnet eine neue. Das ergibt je Stufe genau eine Benachrichtigung, ohne Sonderlogik für Eskalation.
- **Rechnungsnummer als Schlüssel für Sammelrechnungen:** Dieselbe Nummer bei einer zweiten Laufzeit hängt eine Position an – kein eigener Dialog für „Sammelrechnung anlegen“ nötig.
- **PDF-Prüfung am Dateianfang** statt am gemeldeten Typ; abgelegt wird unter der Prüfsumme, gleiche Datei also nur einmal.
- **Screenshots mit Firefox headless** statt Playwright: Firefox ist vorhanden, es muss kein Browser samt Systembibliotheken nachinstalliert werden (dafür wäre root nötig).
- **Kennzahlen werden berechnet, nicht hinterlegt:** auch im Prototyp kommen alle Zahlen aus den Beispieldaten, damit Tabellen und Kacheln nie widersprüchlich sind.
- **AdminLTE 4.9.1 nur als CSS:** stabil, Bootstrap 5.3.8, kein jQuery; die JS-Plugins manipulieren das DOM und werden daher als React-Komponenten nachgebaut.
- **Host-Identität über Agent-Token statt Server-ID:** Die Server-ID ändert sich bei Hardwaretausch und soll dann eine Warnung auslösen, statt einen neuen Host zu erzeugen.
- **Rechnungen mit Positionen:** Proxmox-Sammelbestellungen und Sammelrechnungen an Kunden sollen ohne doppelte Rechnungsnummern abbildbar sein.
- **Eigener Worker-Prozess** für zeitgesteuerte Warnregeln und Benachrichtigungen, unabhängig von Seitenaufrufen.
- **Prototyp direkt im Next.js-Projekt**, damit die Komponenten weiterverwendet werden.
- **Prisma 7.10.0 fest gesetzt:** Der npm-Tag `latest` zeigt derzeit auf 8.0.0-rc, ein Release Candidate gehört nicht in ein neues Projekt.
- **Seed nutzt die Prototyp-Beispieldaten**, damit die Oberfläche ab #006 dieselben Fälle zeigt wie der Prototyp.
- **Keine Nur-Lese-Rolle** (Rückmeldung Florian): alle Benutzer sind Administratoren.
- **Prisma-Client wird lazy erzeugt** (Proxy), damit `next build` ohne gesetzte `DATABASE_URL` durchläuft.
- **Report-Idempotenz über eine vom Agent erzeugte `reportId`**: nachgesendete Reports aus dem Spool dürfen beliebig oft ankommen.
- **Unbekannte Subscription-Status werden zu `UNKNOWN`** statt abgelehnt – ein Report darf nie an einem neuen Statuswort scheitern.
- **Dashboard gleich mit auf die Datenbank umgestellt** (eigentlich #009): Eine frisch zugewiesene Zuordnung hätte dort sonst weiter als „nicht zugeordnet“ gestanden.
- **Server Actions rufen Services auf**, damit die Regeln ohne Next.js-Laufzeit testbar bleiben.

### Probleme / offene Fragen
- Von Florian im Betrieb gemeldet: Nach der Anmeldung führte jeder Klick zurück zur Anmeldeseite. Ursache: `Secure`-Cookie über `http://`. Behoben in 0.11.1.
- Der LXC-Installer ist ungetestet (kein Proxmox-Host verfügbar); gleiches gilt für den Agent im Feld (#018).
- Prisma-Client erzeugte in der Produktionsumgebung bei jedem Zugriff einen neuen Verbindungspool → „too many clients“. Behoben: Client wird im Modul festgehalten.
- Docker wurde von Florian installiert; die Entwicklungsdatenbank läuft auf Port 5433 (5432 bleibt für lokale Instanzen frei).
- Favicon-Dateien (.ico/PNG) fehlen noch, weil kein SVG-Konverter installiert ist.
- Der Agent wurde noch auf keinem echten Proxmox-Host installiert; die Tests arbeiten mit nachgebauten Befehlen.
- Offen: Rolle „readonly“ zusätzlich zu Admin? (vorläufig vorgesehen)

### Nächster Schritt
- #016 Benutzerhandbuch mit Screenshots, danach #017 Favicons und #019 CI-Pipeline
- Für 1.0.0 fehlt vor allem der Feldtest auf echten Proxmox-Hosts (#018)
