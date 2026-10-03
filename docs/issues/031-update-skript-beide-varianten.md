# #031 Update- und Sicherungsskript für beide Installationsarten
**Status:** erledigt
**Meilenstein:** v0.20.0
**Labels:** deployment
**Geschätzt:** 2 h   **Tatsächlich:** 0 h 45 min

## Ziel
`deploy/update.sh` und `deploy/backup.sh` konnten nur Docker. Die Installation als Dienst (Node und
PostgreSQL direkt im LXC) ging leer aus – dort half nur der Weg über das Gerüst der community-scripts.

## Aufgaben
- [x] Beide Skripte erkennen die Installationsart selbst (systemd-Dienst oder Docker)
- [x] Dienst-Weg: `npm ci`, `prisma migrate deploy`, bauen, `systemctl restart`
- [x] Sicherung für den Dienst-Weg: `pg_dump` über `DATABASE_URL`, Uploads aus `UPLOAD_DIR`
- [x] Fehlgeschlagene Sicherung bricht die Aktualisierung ab – **vor** jeder Änderung
- [x] Hinweis am Ende von `deploy/lxc-installer.sh` auf die Skripte umgestellt
- [x] Handbuch und Betriebsdoku angepasst
- [x] Docker-Weg vollständig durchgespielt

## Zwei Fehler beim Durchspielen gefunden
1. **Die Zustandsprüfung des Web-Containers konnte nie gelingen.** Next bindet im Standalone-Modus an
   die Adresse aus `HOSTNAME` – und Docker setzt darin den Containernamen. Der Server lauschte also
   nur auf der Container-IP, nicht auf `127.0.0.1`. Der Dienst `web` blieb dauerhaft auf
   „health: starting“; von außen war er trotzdem erreichbar, deshalb fiel es bisher nicht auf.
   Behoben mit `ENV HOSTNAME=0.0.0.0` im Dockerfile; die Prüfungen verwenden jetzt `127.0.0.1`
   statt `localhost` (das löst im Container auch auf `::1` auf).
2. **Die Sicherung scheiterte stumm an fehlenden Rechten** (`/var/backups` gehört root) und die
   Aktualisierung lief trotzdem weiter. Jetzt bricht sie ab und nennt die drei Auswege.

## Prüfung
Vollständiger Durchlauf gegen einen laufenden Stapel: Sicherung (Datenbank 6,3 KB mit 25 Tabellen,
Uploads, `.env`), Abbilder gebaut, migriert, neu gestartet, Dashboard nach zwei Sekunden wieder da.
Danach stand `web` zum ersten Mal auf **healthy**.
