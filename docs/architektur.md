# ProxLedger – Architektur- und Umsetzungsplan

Stand: 2026-09-17 · Version 0.1.0-dev

## 1. Überblick

```
 Kundennetz A (NAT)            Kundennetz B               Betreiber
┌──────────────────┐        ┌──────────────────┐      ┌──────────────────────────────┐
│ PVE-Host         │        │ PBS-Host         │      │ ProxLedger (Docker / LXC)    │
│  proxledger-agent│─HTTPS─▶│  proxledger-agent│─────▶│  ┌────────┐   ┌───────────┐  │
│  (systemd-Timer) │  Push  │  (systemd-Timer) │ Push │  │  web   │   │  worker   │  │
└──────────────────┘        └──────────────────┘      │  │Next.js │   │ Cron-Jobs │  │
                                                      │  └───┬────┘   └─────┬─────┘  │
                                                      │      └──── Postgres ┘        │
                                                      └──────────────────────────────┘
                                                               │ SMTP (M365) / Webhook
                                                               ▼
                                                        E-Mail, Matrix, Zabbix, HA
```

- **Push-Modell:** Das Dashboard fragt nie aktiv bei Hosts an. Agents melden sich täglich per HTTPS.
- **web:** Next.js (App Router) liefert UI, Agent-API (`/api/agent/v1/*`) und `install.sh`/`proxledger-agent.sh`.
- **worker:** Derselbe Code-Stand, eigener Prozess (`node dist/worker.js`) für zeitgesteuerte Aufgaben:
  Warnregeln auswerten, „keine Meldung seit 48 h“, Benachrichtigungen versenden, Zusammenfassungen.
- **PostgreSQL:** einzige Datenhaltung; PDF-Uploads auf einem Volume (`/data/uploads`), Metadaten in der DB.

## 2. Tech-Stack

| Bereich | Wahl | Begründung |
|---|---|---|
| Framework | Next.js (App Router), TypeScript strict | Vorgabe |
| ORM | Prisma + PostgreSQL | Vorgabe, Migrationen versioniert |
| UI | `admin-lte` 4.x **nur CSS** + Bootstrap 5.3 + eigene React-Komponenten | AdminLTE 4.9.1 ist stabil, jQuery-frei; die Vanilla-JS-Plugins (PushMenu, Treeview, CardWidget) manipulieren das DOM direkt und werden als React-Komponenten nachgebaut |
| Icons | Bootstrap Icons | AdminLTE-4-Standard |
| Schrift | Source Sans 3 über `next/font` (selbst gehostet) | kein externer Request zur Laufzeit |
| Validierung | zod (API und Server Actions) | Vorgabe |
| Auth | Auth.js (OIDC authentik + Credentials-Fallback) | ausgereift, App-Router-kompatibel |
| Passwörter/Tokens | argon2id (Passwörter), SHA-256 über 256-Bit-Zufallstoken (API-Tokens) | Token haben volle Entropie, SHA-256 reicht und ist schnell nachschlagbar |
| Scheduler | `croner` im Worker | leichtgewichtig, zeitzonenfähig |
| E-Mail | nodemailer (SMTP, STARTTLS 587, M365-tauglich) | |
| PDF | `@react-pdf/renderer` | kein Chromium im Container |
| Tests | Vitest; Integrationstests gegen Postgres (Docker) | |
| Agent | Bash, `curl`, Bordmittel; systemd-Service + Timer | Vorgabe |

Zeitzone der Anzeige: `Europe/Berlin`, Datenhaltung in UTC. Datumsformat `dd.MM.yyyy`, Währung EUR.

## 3. Datenmodell

Gegenüber dem Vorschlag im Auftrag zwei bewusste Änderungen:

1. **Host-Identität ist nicht die Server-ID.** Die Server-ID ändert sich bei Hardwaretausch/Neuinstallation – genau das soll
   eine Warnung auslösen. Ein Host wird daher über seinen Agent-Token bzw. eine beim Enrollment erzeugte `agentId`
   (abgeleitet aus `/etc/machine-id`) identifiziert; die Server-ID ist ein Attribut mit Historie. Meldet ein neu
   registrierter Agent eine Server-ID, die bereits ein bestehender Host hatte, wird das als Neuinstallation erkannt und
   zur Übernahme vorgeschlagen.
2. **Rechnungen sind eigene Entitäten mit Positionen.** Eine Proxmox-Bestellung enthält oft mehrere Keys, eine
   Kundenrechnung oft mehrere Hosts. Jede Laufzeit verweist auf höchstens eine Einkaufs- und eine Verkaufsposition.
   Marge = Verkauf netto − Einkauf netto der Position(en).

### Entitäten (vereinfacht)

```
Customer 1─n Site
Customer 1─n Host (customerId nullable → „nicht zugeordnet“)
Site     1─n Host
Host     1─n Report
Host     1─n SubscriptionKey   (Key-Historie: key, firstSeen, lastSeen)
Host     1─n ServerIdHistory
Host     1─n SubscriptionPeriod (Laufzeit: startDate, endDate, key, status: vorgeschlagen|bestätigt)
SubscriptionPeriod n─1 PurchaseInvoiceItem ─n─1 PurchaseInvoice (Proxmox)
SubscriptionPeriod n─1 SalesInvoiceItem    ─n─1 SalesInvoice    (Kunde)
Host     1─n AgentToken (Hash, erstellt, zuletzt benutzt, widerrufen)
EnrollmentToken (Hash, gültig bis, max. Nutzungen, optional customerId/siteId)
Alert (type, severity, hostId?, customerId?, periodId?, fingerprint, openedAt, resolvedAt, acknowledgedAt)
Notification (alertId?, channel, sentAt, status)  – Deduplizierung über Alert-Fingerprint
AlertRuleSetting (key, enabled, thresholds JSON)
NotificationChannel (type: email|webhook, config JSON, enabled)
User (email, name, role: admin|readonly, passwordHash?, oidcSubject?)
AuditLog (userId?, action, entity, entityId, diff JSON, createdAt)
Tag n─m Host
Attachment (PDF: path, mime, size, sha256) – an PurchaseInvoice / SalesInvoice
```

**PurchaseInvoice (Proxmox):** Rechnungsnummer, Rechnungsdatum, Fälligkeitsdatum, netto, brutto, Rabatt, Zahlungsart,
bezahlt (bool), Bezahldatum, PDF.
**SalesInvoice (Kunde):** erstellt (bool), Rechnungsnummer, Rechnungsdatum, Betrag netto/brutto, vom Kunden bezahlt (bool),
Bezahldatum, PDF.
USt-Satz standardmäßig 19 %, pro Rechnung überschreibbar. Beträge als `Decimal(12,2)`.

Das „Häkchen direkt in der Tabelle“ setzt den Status der verknüpften Rechnung. Existiert noch keine Rechnung, legt das
Häkchen eine Minimal-Rechnung an (Nummer später nachtragbar).

## 4. Agent-API

Basis: `/api/agent/v1`, nur JSON, strikt getrennt vom UI (eigene Route-Group, keine Session-Cookies, eigenes Rate-Limit).

| Methode | Pfad | Auth | Zweck |
|---|---|---|---|
| POST | `/enroll` | Enrollment-Token (Bearer) | Host registrieren → liefert `hostId` + host-spezifischen API-Token (einmalig im Klartext) |
| POST | `/report` | Host-Token (Bearer) | Statusbericht; Antwort enthält `latestAgentVersion`, `serverTime` |
| GET | `/ping` | Host-Token | Verbindungstest (`proxledger-agent --test`) |
| GET | `/install.sh`, `/agent.sh` | öffentlich | Installer und Agent-Skript (Version eingebettet) |

- zod-Schemas mit `nullable()` für alle optionalen Felder; unbekannte Felder werden ignoriert und geloggt.
- Rate-Limit: Token-Bucket im Prozess (pro IP und pro Token), z. B. 10 Anfragen/Minute; `429` mit `Retry-After`.
- Report-Verarbeitung in einer Transaktion: Report speichern → Host-Stammdaten aktualisieren → Key-/Server-ID-Historie →
  Laufzeitvorschlag bei neuem `nextduedate` → betroffene Warnregeln neu auswerten.
- Nachgesendete (gepufferte) Reports tragen ihren Original-Zeitstempel (`collectedAt`) und werden idempotent über `reportId` (UUID vom Agent) angenommen.

## 5. Agent

- `install.sh`: prüft root/Produkt, lädt `proxledger-agent.sh` vom Dashboard, `enroll`, schreibt `/etc/proxledger/agent.conf` (600),
  installiert `proxledger.service` + `proxledger.timer` (`OnCalendar=daily`, `RandomizedDelaySec=4h`, `Persistent=true`), erster Report sofort.
- Optionen: `--token`, `--url`, `--ca-cert`, `--uninstall`, `--update`, `--test`.
- Sammelt: Subscription (PVE/PBS/PMG), Hostname, FQDN, IPs, Cluster/Node, Produktversion, Kernel, Sockets, CPU-Modell, Uptime,
  Anzahl Updates, Agent-Version, Zeitstempel. Fehlende Werte → `null`. JSON wird ohne `jq` erzeugt (eigene Escape-Funktion).
- Fehlschlag: 3 Versuche mit Backoff (30 s, 2 min, 8 min), danach Ablage in `/var/lib/proxledger/spool/`, beim nächsten Lauf nachsenden (max. 30 Dateien).
- Logging über `logger -t proxledger` bzw. stdout ins Journal.
- Update: nur wenn `AUTO_UPDATE=yes` in der Config oder manuell via `--update`; Prüfsumme vom Dashboard wird verifiziert.

## 6. Warnregeln

Regeln sind reine Funktionen `(Kontext) → AlertCandidate[]`, getrennt testbar. Der Worker gleicht Kandidaten mit offenen Alerts
ab (Fingerprint = Regel + Objekt-ID [+ Schwelle]): neue öffnen, verschwundene schließen, bestehende unverändert lassen.
Benachrichtigt wird nur beim Öffnen bzw. beim Wechsel auf eine höhere Stufe (30 → 14 → 7 Tage).

| Regel | Standard |
|---|---|
| Subscription läuft ab | 30 / 14 / 7 Tage |
| Status ≠ active | sofort |
| Sockets lizenziert ≠ physisch | sofort |
| Keine Meldung | 48 h |
| Server-ID geändert | sofort |
| Key von mehreren Hosts gemeldet | sofort |
| Host ohne Kunde | sofort (nur Info) |
| Proxmox-Rechnung unbezahlt, Fälligkeit | ≤ 7 Tage |
| Verlängert/bezahlt, Kundenrechnung fehlt | sofort |
| Kundenrechnung unbezahlt | nach 30 Tagen |

## 7. Sicherheit

- UI-Routen per Middleware geschützt (ab #013). **Bis dahin nicht öffentlich betreiben.**
- Tokens: 32 Byte Zufall, Präfix `plx_e_` (Enrollment) / `plx_h_` (Host), in der DB nur SHA-256-Hash; einzeln widerrufbar.
- Audit-Log für alle schreibenden Server Actions (vor #013 mit Akteur „system“).
- Security-Header (CSP, HSTS hinter Reverse Proxy), Upload-Prüfung (nur PDF, max. 10 MB).

## 8. Projektstruktur

```
proxledger/
├─ agent/                     Bash-Agent, Installer, systemd-Units
├─ deploy/                    docker-compose, LXC-Installer, Beispiel-Proxy-Configs
├─ docs/                      Architektur, Issues
├─ prisma/                    schema.prisma, migrations, seed.ts
├─ public/                    favicon.svg, Icons
├─ src/
│  ├─ app/
│  │  ├─ (dashboard)/         UI-Seiten (AdminLTE-Layout)
│  │  ├─ (auth)/login/
│  │  └─ api/agent/v1/        Agent-API
│  ├─ components/             Layout, Logo, SmallBox, Card, Badge, DataTable …
│  ├─ lib/                    db, auth, tokens, validation, format
│  ├─ server/                 Services (reports, alerts, invoices, notifications)
│  ├─ worker/                 Scheduler-Einstiegspunkt
│  └─ mock/                   Beispieldaten für den Prototyp
└─ tests/
```

## 9. Meilensteine

| Version | Inhalt | Issues |
|---|---|---|
| 0.1.0 | Projekt-Setup, Prototyp, Datenmodell, Agent-API | #001–#004 |
| 0.2.0 | Agent-Skript | #005 |
| 0.3.0 | Kunden, Standorte, Hostzuweisung, Enrollment-Tokens | #006 |
| 0.4.0 | Host-Tabelle, Suche, Detailansichten | #007 |
| 0.5.0 | Laufzeiten und Rechnungen | #008 |
| 0.6.0 | Kundenübersicht, Dashboard live, Jahresbahn, Export | #009, #010 |
| 0.7.0 | Warnregeln | #011 |
| 0.8.0 | Benachrichtigungen | #012 |
| 0.9.0 | Authentifizierung, Audit-Log | #013 |
| 0.10.0 | Deployment (Docker, LXC), Doku | #014 |
| 1.0.0 | Feinschliff, Dark-Mode, Mobil, Härtung | #015 |
