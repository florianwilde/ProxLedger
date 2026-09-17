# #003 Datenmodell und Migrationen
**Status:** erledigt
**Meilenstein:** v0.1.0
**Labels:** backend, datenbank
**Geschätzt:** 5 h   **Tatsächlich:** 0 h 25 min

## Ziel
Vollständiges Prisma-Schema gemäß `docs/architektur.md` Abschnitt 3, erste Migration, Seed mit Admin-User und optionalen Demo-Daten.

## Aufgaben
- [x] Docker-Compose für lokale Entwicklung (nur PostgreSQL)
- [x] Prisma-Schema: Customer, Site, Host, Tag, Report, SubscriptionKey, ServerIdHistory, SubscriptionPeriod, PurchaseInvoice(+Item), SalesInvoice(+Item), Attachment, AgentToken, EnrollmentToken, Alert, Notification, AlertRuleSetting, NotificationChannel, User, AuditLog, Setting
- [x] Indizes für Suche (Key, Server-ID, Hostname, IP, Rechnungsnummer)
- [x] Erste Migration
- [x] Seed: Admin-User aus Umgebungsvariablen, Standard-Warnregeln, optional Demo-Daten (`SEED_DEMO=1`)
- [x] DB-Client-Singleton, Test-Datenbank-Setup für Vitest

## Akzeptanzkriterien
- [x] `npx prisma migrate dev` läuft auf leerer DB durch
- [x] `npx prisma db seed` legt Admin und Standard-Regeln an, idempotent
- [x] Beträge als Decimal, Zeitstempel in UTC

## Abhängigkeiten
#001

## Notizen / Entscheidungen
- Host-Identität über Agent-Token/`agentId`, nicht über Server-ID (siehe Architektur).
- Rechnungen als eigene Entitäten mit Positionen, damit Sammelbestellungen und Sammelrechnungen abbildbar sind.
- Prisma 7.10.0 statt der npm-Kennzeichnung „latest“: dort liegt derzeit ein Release Candidate (8.0.0-rc).
- Prisma 7 benötigt einen Treiber-Adapter; im Einsatz ist `@prisma/adapter-pg`.
- Der Seed legt Demo-Daten aus `src/mock/data.ts` an, damit Prototyp und Datenbank dieselben Beispiele zeigen. Die Sammelrechnung PX-2025-88213 deckt bewusst zwei Laufzeiten ab.
- Passwörter werden mit argon2id gehasht (`@node-rs/argon2`, vorkompiliert – kein Build-Toolchain nötig).
