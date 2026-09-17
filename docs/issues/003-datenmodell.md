# #003 Datenmodell und Migrationen
**Status:** offen
**Meilenstein:** v0.1.0
**Labels:** backend, datenbank
**Geschätzt:** 5 h   **Tatsächlich:** –

## Ziel
Vollständiges Prisma-Schema gemäß `docs/architektur.md` Abschnitt 3, erste Migration, Seed mit Admin-User und optionalen Demo-Daten.

## Aufgaben
- [ ] Docker-Compose für lokale Entwicklung (nur PostgreSQL)
- [ ] Prisma-Schema: Customer, Site, Host, Tag, Report, SubscriptionKey, ServerIdHistory, SubscriptionPeriod, PurchaseInvoice(+Item), SalesInvoice(+Item), Attachment, AgentToken, EnrollmentToken, Alert, Notification, AlertRuleSetting, NotificationChannel, User, AuditLog, Setting
- [ ] Indizes für Suche (Key, Server-ID, Hostname, IP, Rechnungsnummer)
- [ ] Erste Migration
- [ ] Seed: Admin-User aus Umgebungsvariablen, Standard-Warnregeln, optional Demo-Daten (`SEED_DEMO=1`)
- [ ] DB-Client-Singleton, Test-Datenbank-Setup für Vitest

## Akzeptanzkriterien
- [ ] `npx prisma migrate dev` läuft auf leerer DB durch
- [ ] `npx prisma db seed` legt Admin und Standard-Regeln an, idempotent
- [ ] Beträge als Decimal, Zeitstempel in UTC

## Abhängigkeiten
#001

## Notizen / Entscheidungen
- Host-Identität über Agent-Token/`agentId`, nicht über Server-ID (siehe Architektur).
- Rechnungen als eigene Entitäten mit Positionen, damit Sammelbestellungen und Sammelrechnungen abbildbar sind.
