# #001 Projekt-Setup
**Status:** erledigt
**Meilenstein:** v0.1.0
**Labels:** chore, infrastruktur
**Geschätzt:** 3 h   **Tatsächlich:** 0 h 08 min

## Ziel
Arbeitsfähiges Repository mit Projektorganisation (Devlog, Changelog, Issues) und einem lauffähigen Next.js-Grundgerüst inklusive AdminLTE-CSS, Linting und Prisma-Grundkonfiguration.

## Aufgaben
- [x] Git-Repository mit Branch `main`, `.gitignore`
- [x] `DEVLOG.md`, `CHANGELOG.md`, `docs/issues/` mit Übersicht
- [x] Architektur- und Umsetzungsplan (`docs/architektur.md`)
- [x] Issues pro Phase anlegen
- [x] Next.js (App Router, TypeScript strict, `src/`) aufsetzen
- [x] Abhängigkeiten: `admin-lte`, `bootstrap`, `bootstrap-icons`, zod
- [x] ESLint + Prettier, `npm run lint`, `npm run typecheck`
- [x] Version `0.1.0-dev` in `package.json`, Versionsanzeige-Helfer
- [x] Vitest-Grundkonfiguration

## Akzeptanzkriterien
- [x] `npm run dev` startet ohne Fehler
- [x] `npm run lint` und `npm run typecheck` sind grün
- [x] Keine Remote-URL in Projektdateien

## Abhängigkeiten
–

## Notizen / Entscheidungen
- AdminLTE 4.9.1 (Bootstrap 5.3.8) ist stabil und jQuery-frei. Es wird **nur das CSS** eingebunden; die interaktiven Teile (Sidebar-Toggle, Treeview, Card-Widgets) werden als React-Komponenten nachgebaut, weil die AdminLTE-Plugins das DOM direkt manipulieren.
- Node 24 LTS über nvm (Benutzerinstallation).
