# DEVLOG – ProxLedger

## Zeitübersicht

**Gesamt:** 0 h 00 min (laufende Sitzung nicht eingerechnet)

| Issue | Zeit |
|---|---|
| #001 Projekt-Setup | 0 h 00 min |

| Meilenstein | Zeit |
|---|---|
| v0.1.0 | 0 h 00 min |

---

## 2026-09-17 · Sitzung 1 · 19:36–laufend
**Issue:** #001 Projekt-Setup
**Version:** 0.1.0-dev

### Erledigt
- Auftrag gelesen, Rückfragen gestellt
- Umgebung geprüft: Ubuntu 26.04, Git 2.53; Node/Docker fehlten → Node 24 LTS per nvm installiert
- Repository-Rechte korrigiert (Verzeichnis gehörte root), Branch `master` → `main`, Git-Identität lokal gesetzt
- `.gitignore`, `CHANGELOG.md`, `DEVLOG.md`, Architekturplan und 15 Issues angelegt

### Entscheidungen
- **AdminLTE 4.9.1 nur als CSS:** stabil, Bootstrap 5.3.8, kein jQuery; die JS-Plugins manipulieren das DOM und werden daher als React-Komponenten nachgebaut.
- **Host-Identität über Agent-Token statt Server-ID:** Die Server-ID ändert sich bei Hardwaretausch und soll dann eine Warnung auslösen, statt einen neuen Host zu erzeugen.
- **Rechnungen mit Positionen:** Proxmox-Sammelbestellungen und Sammelrechnungen an Kunden sollen ohne doppelte Rechnungsnummern abbildbar sein.
- **Eigener Worker-Prozess** für zeitgesteuerte Warnregeln und Benachrichtigungen, unabhängig von Seitenaufrufen.
- **Prototyp direkt im Next.js-Projekt**, damit die Komponenten weiterverwendet werden.

### Probleme / offene Fragen
- Docker ist nicht installiert und `sudo` erfordert ein Passwort → Installation muss manuell erfolgen (benötigt ab #003).
- Offen: Rolle „readonly“ zusätzlich zu Admin? (vorläufig vorgesehen)

### Nächster Schritt
- Next.js-Grundgerüst (#001), danach Prototyp (#002)
