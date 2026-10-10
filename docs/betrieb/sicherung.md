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
bash deploy/restore.sh /var/backups/proxledger            # jüngste Sicherung
bash deploy/restore.sh /var/backups/proxledger 20261010-192437   # bestimmter Stand
```

Das Skript hält Dashboard und Worker an, spielt Datenbank **und** hochgeladene PDFs zurück, startet
alles wieder und prüft, ob das Dashboard antwortet. Vorher fragt es nach; `--ja` überspringt die
Rückfrage (für Skripte).

Die `.env` fasst es bewusst **nicht** an: Sie trägt `APP_SECRET`, und ein falscher Wert dort macht die
gespeicherten Zugangsdaten für SMTP und Webhook unlesbar. Die zum Stand passende Fassung liegt als
`env-<Stand>.txt` in der Sicherung – im Zweifel von Hand vergleichen.

### Von Hand, wenn es sein muss

```bash
docker compose stop web worker
gunzip -c datenbank-20261010-192437.sql.gz | docker compose exec -T postgres psql -U proxledger proxledger
docker compose run --rm -T --entrypoint tar web -xzf - -C / < uploads-20261010-192437.tar.gz
docker compose up -d
```

Bei der Installation als Dienst stattdessen `psql "$DATABASE_URL"` und `tar -xzf … -C /opt/proxledger/data`.

## Geprobt am 10.10.2026

Nicht behauptet, sondern durchgespielt – mit einem eigenen Stapel:

1. Stand festgehalten (9 Hosts, 4 Kunden, 10 Laufzeiten), ein Kunde zur Wiedererkennung umbenannt,
   eine PDF-Datei abgelegt
2. Sicherung angelegt
3. **Alle Daten zerstört** (`docker compose down -v` – Datenbank und Upload-Volume weg)
4. `deploy/restore.sh` aufgerufen

Ergebnis: Datenbank vollständig zurück (die umbenannte Kundin war wieder da), die PDF-Datei lag mit
den richtigen Rechten im Upload-Ordner, Anmeldung mit dem alten Passwort funktionierte.

Dabei zwei Lücken gefunden und geschlossen: Die Sicherung ließ sich nur in eine **leere** Datenbank
zurückspielen (jetzt `pg_dump --clean --if-exists`), und für die hochgeladenen PDFs gab es überhaupt
keinen beschriebenen Weg.

> Geprobt wurde der Docker-Weg. Für die Installation als Dienst ist derselbe Ablauf im Skript
> vorgesehen, aber noch nicht unter echten Bedingungen gelaufen.

## Das Wichtigste

**Eine Sicherung, die nie zurückgespielt wurde, ist keine Sicherung.** Spielen Sie sie einmal in eine
Testumgebung ein und melden Sie sich dort an. Erst dann wissen Sie, dass Sicherung und `APP_SECRET`
zusammenpassen.
