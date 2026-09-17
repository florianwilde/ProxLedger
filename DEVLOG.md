# DEVLOG – ProxLedger

## Zeitübersicht

**Gesamt:** 0 h 53 min

| Issue | Zeit |
|---|---|
| #001 Projekt-Setup | 0 h 08 min |
| #002 Klickbarer Prototyp | 0 h 20 min |
| #003 Datenmodell und Migrationen | 0 h 25 min |

| Meilenstein | Zeit |
|---|---|
| v0.1.0 | 0 h 53 min |

---

## 2026-09-17 · Sitzung 1 · 19:36–laufend
**Issue:** #001 Projekt-Setup, #002 Klickbarer Prototyp, #003 Datenmodell
**Version:** 0.1.0-dev

### Erledigt
- Auftrag gelesen, Rückfragen gestellt
- Umgebung geprüft: Ubuntu 26.04, Git 2.53; Node/Docker fehlten → Node 24 LTS per nvm installiert
- Repository-Rechte korrigiert (Verzeichnis gehörte root), Branch `master` → `main`, Git-Identität lokal gesetzt
- `.gitignore`, `CHANGELOG.md`, `DEVLOG.md`, Architekturplan und 15 Issues angelegt
- #001 abgeschlossen: Next.js 16 (App Router, TypeScript strict), AdminLTE-CSS, Bootstrap Icons, zod, ESLint/Prettier/Vitest; Lint, Typecheck, Test und Build grün
- #002 abgeschlossen: Prototyp mit Beispieldaten – Layout (Sidebar, Kopfleiste, Inhaltskopf, Footer), Logo als SVG-Komponente, Theme mit Farbvorgaben und Dark-Mode, Dashboard, Kunden (Liste und Detail), Hosts (Liste, Detail, nicht zugeordnet), Rechnungen, Jahresbahn, Einstellungsseiten, globale Suche mit Strg+K
- Screenshots aller Seiten aufgenommen und in `docs/anleitung/bilder/` abgelegt
- #003 abgeschlossen: Prisma-Schema mit 23 Modellen, erste Migration, Seed (Administrator, 10 Warnregeln, Demo-Daten), Testdatenbank-Setup für Vitest, 3 Schema-Tests

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

### Probleme / offene Fragen
- Docker wurde von Florian installiert; die Entwicklungsdatenbank läuft auf Port 5433 (5432 bleibt für lokale Instanzen frei).
- Favicon-Dateien (.ico/PNG) fehlen noch, weil kein SVG-Konverter installiert ist.
- Offen: Rolle „readonly“ zusätzlich zu Admin? (vorläufig vorgesehen)

### Nächster Schritt
- #004 Agent-API: Enrollment, Report-Endpunkt, Token-Hashing, Rate-Limit, Tests
