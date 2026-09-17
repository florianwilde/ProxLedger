# ProxLedger

Zentrales Dashboard für den Subscription-Status aller Proxmox-Hosts (VE, Backup Server, Mail Gateway).
Auf jedem Host meldet ein schlanker Agent täglich per HTTPS seinen Status (Push-Modell) – auch aus Kundennetzen hinter NAT.

> **Status:** in Entwicklung. Der Funktionsumfang steht, der Agent wurde aber noch nicht auf echten
> Proxmox-Hosts erprobt (#018).

## Schnellstart

Auf einem Rechner mit Docker:

```bash
git clone <dieses-repo> proxledger && cd proxledger
cp .env.example .env
# Pflichtangaben setzen: APP_SECRET, POSTGRES_PASSWORD, ADMIN_PASSWORD, APP_URL
docker compose up -d
```

Beim ersten Start legt der Dienst `migrate` das Schema an und erzeugt den Administrator aus der `.env`.
Danach ist das Dashboard unter `APP_URL` erreichbar.

**Auf einem Proxmox-Host** legt der Installer einen fertigen LXC-Container an:

```bash
bash deploy/lxc-installer.sh
```

Er fragt Ressourcen und Netzwerk ab, installiert Docker, holt den Quelltext, erzeugt Zufallspasswörter
und startet alles. Am Ende stehen Adresse, Benutzer und Passwort auf dem Bildschirm.

### Agent ausrollen

1. Im Dashboard unter *Einstellungen → Agent-Tokens* einen Enrollment-Token erzeugen
2. Auf jedem Proxmox-Host als root:
   ```bash
   curl -fsSL https://<dashboard>/install.sh | bash -s -- --token <ENROLL_TOKEN>
   ```
3. Der Host meldet sich sofort und danach täglich. Unter *Hosts → Nicht zugeordnet* einem Kunden zuweisen –
   oder den Token gleich mit Kundenbindung erzeugen, dann entfällt der Schritt.

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

Der Worker wertet die Warnregeln stündlich aus und läuft als eigener Prozess:

```bash
npm run worker        # Dauerbetrieb
npm run alerts:check  # einmalige Auswertung
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

## Anmeldung

Die Oberfläche ist vollständig geschützt; die Agent-API und die Skript-Auslieferung bleiben offen, weil
sie sich mit eigenen Tokens ausweisen.

- **Lokaler Zugang:** E-Mail und Passwort aus dem Seed (`ADMIN_EMAIL`, `ADMIN_PASSWORD`). Fünf Fehlversuche
  je Kennung und Viertelstunde, danach Sperre.
- **OIDC (z. B. authentik):** `OIDC_ISSUER`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET` setzen. Rückkehradresse
  ist `<APP_URL>/api/auth/oidc/callback`. Ohne diese Werte erscheint nur der lokale Zugang – der bleibt
  absichtlich immer nutzbar, falls der Anmeldedienst ausfällt.
- **`APP_SECRET`** (mindestens 32 Zeichen) signiert die Sitzungs-Cookies. Ändert sich der Wert, sind alle
  Sitzungen ungültig.

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

## Betrieb

**Dienste:** `web` (Dashboard), `worker` (Warnregeln und Benachrichtigungen), `postgres`, dazu `migrate`,
der nur beim Start läuft.

```bash
docker compose ps                      # Zustand
docker compose logs -f web worker      # Protokoll
docker compose up -d --build           # nach einem Update
```

**Hinter einem Reverse Proxy:** Beispiele für Caddy, nginx und Traefik liegen in
[deploy/reverse-proxy/](deploy/reverse-proxy/). Wichtig ist, dass `X-Forwarded-For` durchgereicht wird –
darauf stützt sich das Rate-Limit der Agent-API. `APP_URL` muss auf die öffentliche Adresse zeigen,
sonst stimmen die Links in E-Mails und im Installations-Einzeiler nicht.

**Zustandsprüfung:** `GET /api/gesundheit` antwortet mit `{"ok":true}`, solange die Datenbank erreichbar ist.

## Sicherung

[deploy/backup.sh](deploy/backup.sh) sichert Datenbank, hochgeladene PDFs und die `.env`:

```bash
./deploy/backup.sh /var/backups/proxledger
```

Für regelmäßige Sicherungen in die Crontab eintragen:

```
30 2 * * * /opt/proxledger/deploy/backup.sh /var/backups/proxledger
```

Zum Zurückspielen:

```bash
gunzip -c datenbank-20260917-023000.sql.gz | docker compose exec -T postgres psql -U proxledger proxledger
```

**Wichtig:** `APP_SECRET` mitsichern. Ohne diesen Wert sind alle Sitzungen ungültig; die Zugangsdaten für
SMTP und Webhook liegen (noch) unverschlüsselt in der Datenbank, eine Sicherung enthält sie also im Klartext
– siehe Issue #021.

## Dokumentation

- [Architektur- und Umsetzungsplan](docs/architektur.md)
- [Issues](docs/issues/README.md)
- [Changelog](CHANGELOG.md) · [Devlog](DEVLOG.md)
