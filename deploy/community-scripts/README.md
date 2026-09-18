# Installation als LXC-Container nach Art der Proxmox VE Helper-Scripts

Diese beiden Skripte folgen den Konventionen von [community-scripts.org](https://community-scripts.org)
(der Nachfolge von tteck's Helper-Scripts). Sie legen einen unprivilegierten Debian-13-Container an,
installieren Node.js 24 und PostgreSQL 17, holen ProxLedger aus dem Git-Repository, richten zwei
systemd-Dienste ein (Dashboard und Worker) und schreiben die erzeugten Zugangsdaten nach
`/opt/proxledger/.credentials`.

| Datei | Zweck |
|---|---|
| `ct/proxledger.sh` | Container anlegen, Ressourcen abfragen, Aktualisierung (`update_script`) |
| `install/proxledger-install.sh` | Installation im Container |

## Verwendung im eigenen Netz

Auf dem Proxmox-VE-Host als root:

```bash
bash -c "$(curl -fsSL https://git.wilde-server.de/fw/ProxLedger/raw/branch/main/deploy/community-scripts/ct/proxledger.sh)"
```

Das Gerüst (`build.func`, `install.func`) lädt das Skript von den community-scripts nach – das ist
öffentlich und ohne Konto erreichbar. Nur ProxLedger selbst kommt aus dem eigenen Git.

Zwei Umgebungsvariablen steuern die Quelle, solange das Repository nicht öffentlich ist:

```bash
PROXLEDGER_REPO=https://git.example.de/fw/ProxLedger.git PROXLEDGER_BRANCH=main bash -c "$(curl -fsSL …)"
```

Ist das Git-Repository nicht ohne Anmeldung lesbar, gehört ein Lesezugriffs-Token in die Adresse
(`https://<token>@git.example.de/...`). Das Token landet dann in der Prozessliste des Containers –
also besser einen Deploy-Token verwenden, der nur lesen darf.

## Was eine Einreichung bei community-scripts verlangen würde

Wir liefern die Skripte vorerst **nur intern** aus. Für eine Einreichung wären zusätzlich nötig:

1. **Öffentlich erreichbarer Quelltext.** Die Skripte dort holen die Anwendung praktisch immer aus
   einem öffentlichen GitHub-Repository (`fetch_and_deploy_gh_release`). Ein privates Gitea genügt nicht.
2. **Pull Request gegen [ProxmoxVED](https://github.com/community-scripts/ProxmoxVED)**, nicht gegen
   ProxmoxVE. Neue Skripte, die direkt gegen ProxmoxVE eingereicht werden, werden ohne Prüfung
   geschlossen.
3. **MIT-Lizenz** im eigenen Repository und der Lizenzkopf in beiden Skripten (steht bereits darin).
4. **Englische Dokumentation** – die Skripte selbst sind auf Englisch gehalten, die deutschen
   Kommentare in diesem Verzeichnis müssten übersetzt werden.
5. **Metadaten für die Webseite.** Die JSON-Dateien liegen inzwischen nicht mehr im Skript-Repository;
   wo sie hingehören, steht in der aktuellen Beitragsanleitung. Das ist beim Einreichen zu prüfen.

Die Skripte sind so geschrieben, dass für eine spätere Einreichung nur die Quelle zu tauschen und die
Kommentare zu übersetzen sind – am Ablauf ändert sich nichts.

## Unterschied zum Docker-Weg

| | Helper-Script (LXC) | Docker Compose |
|---|---|---|
| Umgebung | eigener Container auf dem Proxmox-Host | beliebiger Docker-Host |
| Datenbank | PostgreSQL im selben Container | eigener Dienst |
| Aktualisierung | `update`-Weg des Skripts | `bash deploy/update.sh` |
| Sicherung | Proxmox-Sicherung des Containers | `bash deploy/backup.sh` |

Beide Wege sind gleichwertig. Wer ohnehin Proxmox betreibt, fährt mit dem LXC-Weg meist einfacher –
die Sicherung des Containers erledigt dann die gewohnte Proxmox-Sicherung mit.
