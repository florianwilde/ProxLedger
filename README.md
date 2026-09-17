# ProxLedger

Zentrales Dashboard für den Subscription-Status aller Proxmox-Hosts (VE, Backup Server, Mail Gateway).
Auf jedem Host meldet ein schlanker Agent täglich per HTTPS seinen Status (Push-Modell) – auch aus Kundennetzen hinter NAT.

> **Status:** in Entwicklung (0.1.0-dev). Noch nicht produktiv einsetzen.

## Entwicklung

Voraussetzungen: Node.js ≥ 24, Docker (für PostgreSQL ab #003).

```bash
npm install
npm run db:up      # PostgreSQL im Container (Port 5433)
cp .env.example .env
npm run db:migrate # Schema anlegen
npm run db:seed    # Administrator, Warnregeln, mit SEED_DEMO=1 auch Demo-Daten
npm run dev        # http://localhost:3000

npm run lint
npm run typecheck
npm test           # legt bei Bedarf die Testdatenbank an
```

Weitere Skripte: `npm run db:studio` (Datenbank-Oberfläche), `npm run db:down` (Container stoppen).

## Agent auf einem Proxmox-Host installieren

```bash
curl -fsSL https://<dashboard>/install.sh | bash -s -- --token <ENROLL_TOKEN>
```

Der Agent erkennt Proxmox VE, Backup Server und Mail Gateway selbst, registriert sich, schreibt seine
Konfiguration nach `/etc/proxledger/agent.conf` (Rechte 600) und meldet ab dann täglich per systemd-Timer.

| Befehl | Zweck |
|---|---|
| `proxledger-agent` | Report erzeugen und senden |
| `proxledger-agent --dry-run` | Report nur anzeigen |
| `proxledger-agent --test` | Verbindung zum Dashboard prüfen |
| `proxledger-agent --update` | Agent aktualisieren |
| `curl -fsSL https://<dashboard>/install.sh \| bash -s -- --uninstall` | Agent entfernen |

Protokoll: `journalctl -t proxledger`. Ist das Dashboard nicht erreichbar, versucht es der Agent dreimal mit
wachsendem Abstand und legt den Report danach unter `/var/lib/proxledger/spool/` ab; beim nächsten Lauf wird er
nachgesendet.

## Exporte

| Ansicht | CSV | PDF |
|---|---|---|
| Hosts | `/hosts/export` | `/hosts/export?format=pdf` |
| Kunden | `/kunden/export` | `/kunden/export?format=pdf` |
| Einzelner Kunde | – | `/kunden/<id>/export` (Anlage für Kundenunterlagen) |
| Rechnungen | `/rechnungen/export` | `/rechnungen/export?format=pdf` |

Alle Exporte übernehmen die Filter der jeweiligen Ansicht. CSV kommt als UTF-8 mit BOM und Semikolon,
öffnet sich also ohne Umwege in Excel.

## Issues nach Gitea übertragen

Die Issues werden als Markdown-Dateien in `docs/issues/` gepflegt – sie liegen damit im Repo und wandern mit
jedem Klon mit. Wer sie zusätzlich im Gitea-Tracker haben möchte, gleicht sie ab:

```bash
npm run issues:sync -- --dry-run    # zeigt nur, was passieren würde
npm run issues:sync                 # echter Abgleich
```

Serveradresse und Repository liest das Skript aus dem Git-Remote, den Token aus den hinterlegten
Git-Zugangsdaten (Schlüsselbund oder `~/.git-credentials`) – derselbe Token wie fürs Pushen, er braucht
zusätzlich das Recht `issue:write`. Wer beides trennen möchte, setzt `GITEA_URL`, `GITEA_REPO` und
`GITEA_TOKEN` in der `.env`.

Der Abgleich legt Labels und Meilensteine an, erkennt vorhandene Issues an der Nummer im Titel,
aktualisiert sie und schließt erledigte. Ein zweiter Lauf erzeugt keine Dubletten.

## Dokumentation

- [Architektur- und Umsetzungsplan](docs/architektur.md)
- [Issues](docs/issues/README.md)
- [Changelog](CHANGELOG.md) · [Devlog](DEVLOG.md)
