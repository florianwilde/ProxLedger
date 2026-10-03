# Sicherung und Wiederherstellung

## Was gesichert werden muss

| Sache | Wo | Ohne sie |
|---|---|---|
| Datenbank | PostgreSQL | alles weg: Hosts, Kunden, Laufzeiten, Rechnungen |
| `APP_SECRET` | `.env` | alle Sitzungen ungültig, SMTP- und Webhook-Zugangsdaten unlesbar |
| Hochgeladene PDFs | `/data/uploads` (Docker-Volume) bzw. `/opt/proxledger/data/uploads` | Rechnungsanhänge fehlen |

Die Agents brauchen **keine** Sicherung: Sie registrieren sich neu, und die Zuordnung hängt an der
Maschinenkennung, nicht an einem Token.

## Sichern

```bash
bash deploy/backup.sh /var/backups/proxledger
```

Das Skript erkennt selbst, ob die Installation mit Docker oder als Dienst läuft, und sichert in beiden
Fällen Datenbank, Uploads und `.env`. Beim LXC-Weg reicht zusätzlich die gewohnte Proxmox-Sicherung
des Containers.

Vor jeder Aktualisierung läuft es ohnehin automatisch – [`deploy/update.sh`](../../deploy/update.sh)
ruft es als Erstes auf und bricht ab, wenn es fehlschlägt.

## Zurückspielen

```bash
# Docker
docker compose down
docker compose up -d postgres
gunzip -c sicherung.sql.gz | docker compose exec -T postgres psql -U proxledger proxledger
docker compose up -d
```

Danach die `.env` mit **demselben** `APP_SECRET` zurücklegen wie zum Zeitpunkt der Sicherung. Ein
anderer Wert lässt die gespeicherten Zugangsdaten unlesbar werden; das Dashboard sagt das beim
nächsten Versand deutlich, aber die Werte müssen dann neu eingetragen werden.

## Das Wichtigste

**Eine Sicherung, die nie zurückgespielt wurde, ist keine Sicherung.** Spielen Sie sie einmal in eine
leere Testumgebung ein und melden Sie sich dort an. Erst dann wissen Sie, dass Sicherung und
`APP_SECRET` zusammenpassen.
