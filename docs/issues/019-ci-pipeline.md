# #019 CI-Pipeline
**Status:** erledigt
**Meilenstein:** v0.13.0
**Labels:** infrastruktur
**Geschätzt:** 3 h   **Tatsächlich:** 0 h 20 min

## Ziel
Automatische Prüfung jedes Commits, damit Fehler nicht erst beim Release auffallen.

## Aufgaben
- [x] Gitea Actions (oder Woodpecker) einrichten
- [x] Schritte: `npm ci`, `prisma generate`, Lint, Typecheck, Tests gegen eine PostgreSQL-Dienstinstanz, Build
- [x] ShellCheck für `agent/*.sh`
- [x] Prüfung, dass `docs/issues/README.md` und `DEVLOG.md` zur Version in `package.json` passen
- [x] Ergebnis als Kennzeichen im README

## Akzeptanzkriterien
- [x] Ein fehlschlagender Test verhindert den Merge nach `main`
- [x] Der Durchlauf dauert unter fünf Minuten

## Abhängigkeiten
#014

## Notizen / Entscheidungen
- ShellCheck ist auf dem Entwicklungsrechner nicht installiert; bisher wird nur `bash -n` geprüft.
- Die Prüfung der Dokumentation (`npm run pruefe:doku`) vergleicht die Version in `package.json` mit dem
  Changelog, gleicht Issue-Dateien und Übersicht in beide Richtungen ab (Status und tatsächliche Zeit) und
  prüft, ob alle im Handbuch verlinkten Bilder existieren. Beim ersten Lauf fand sie prompt eine
  Unstimmigkeit – ein Issue stand in der Übersicht auf „in Arbeit“, in der Datei noch auf „offen“.
- ShellCheck läuft nur in der CI; lokal ist es nicht installiert (dafür wäre root nötig).
- **Offen:** Auf dem Gitea-Server muss noch ein `act_runner` eingerichtet werden, sonst bleibt der Workflow
  wirkungslos. Ohne Runner erscheint er in Gitea gar nicht erst.
