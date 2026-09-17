# #019 CI-Pipeline
**Status:** offen
**Meilenstein:** v0.10.0
**Labels:** infrastruktur
**Geschätzt:** 3 h   **Tatsächlich:** –

## Ziel
Automatische Prüfung jedes Commits, damit Fehler nicht erst beim Release auffallen.

## Aufgaben
- [ ] Gitea Actions (oder Woodpecker) einrichten
- [ ] Schritte: `npm ci`, `prisma generate`, Lint, Typecheck, Tests gegen eine PostgreSQL-Dienstinstanz, Build
- [ ] ShellCheck für `agent/*.sh`
- [ ] Prüfung, dass `docs/issues/README.md` und `DEVLOG.md` zur Version in `package.json` passen
- [ ] Ergebnis als Kennzeichen im README

## Akzeptanzkriterien
- [ ] Ein fehlschlagender Test verhindert den Merge nach `main`
- [ ] Der Durchlauf dauert unter fünf Minuten

## Abhängigkeiten
#014

## Notizen / Entscheidungen
- ShellCheck ist auf dem Entwicklungsrechner nicht installiert; bisher wird nur `bash -n` geprüft.
