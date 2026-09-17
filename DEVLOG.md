# DEVLOG – ProxLedger

## Zeitübersicht

**Gesamt:** 2 h 58 min

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

| Meilenstein | Zeit |
|---|---|
| v0.1.0 | 1 h 13 min | **abgeschlossen**
| v0.2.0 | 0 h 25 min | **abgeschlossen**
| v0.3.0 | 0 h 35 min | **abgeschlossen**
| v0.4.0 | 0 h 25 min | **abgeschlossen**
| v0.4.1 | 0 h 10 min | **abgeschlossen**
| v0.4.2 | 0 h 10 min | **abgeschlossen**

---

## 2026-09-17 · Sitzung 1 · 19:36–laufend
**Issue:** #001–#007 (Meilensteine v0.1.0 bis v0.4.0)
**Version:** 0.4.2

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

### Entscheidungen
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
- Prisma-Client erzeugte in der Produktionsumgebung bei jedem Zugriff einen neuen Verbindungspool → „too many clients“. Behoben: Client wird im Modul festgehalten.
- Docker wurde von Florian installiert; die Entwicklungsdatenbank läuft auf Port 5433 (5432 bleibt für lokale Instanzen frei).
- Favicon-Dateien (.ico/PNG) fehlen noch, weil kein SVG-Konverter installiert ist.
- Der Agent wurde noch auf keinem echten Proxmox-Host installiert; die Tests arbeiten mit nachgebauten Befehlen.
- Offen: Rolle „readonly“ zusätzlich zu Admin? (vorläufig vorgesehen)

### Nächster Schritt
- #008 Laufzeiten und Rechnungen: Vorschläge bestätigen, Rechnungen erfassen, Häkchen direkt in der Tabelle
