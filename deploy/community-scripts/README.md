# Installation als LXC-Container nach Art der Proxmox VE Helper-Scripts

Diese beiden Skripte folgen den Konventionen von [community-scripts.org](https://community-scripts.org)
(der Nachfolge von tteck's Helper-Scripts). Sie legen einen unprivilegierten Debian-13-Container an,
installieren Node.js 24 und PostgreSQL 17, holen ProxLedger aus dem Git-Repository, richten zwei
systemd-Dienste ein (Dashboard und Worker) und schreiben die erzeugten Zugangsdaten nach
`/opt/proxledger/.credentials`.

**Ressourcen:** Die Vorgabe ist 2 CPU-Kerne, **4 GB RAM** und 12 GB Platte. Die 4 GB braucht
`next build` während der Installation; im Betrieb genügen 2 GB, die sich im Nachhinein in Proxmox
wieder absenken lassen.

| Datei | Zweck |
|---|---|
| `ct/proxledger.sh` | Container anlegen, Ressourcen abfragen, Aktualisierung (`update_script`) |
| `install/proxledger-install.sh` | Installation im Container |

## Verwendung im eigenen Netz

Auf dem Proxmox-VE-Host als root:

```bash
bash -c "$(curl -fsSL https://raw.githubusercontent.com/florianwilde/ProxLedger/main/deploy/community-scripts/ct/proxledger.sh)"
```

Das Gerüst (`build.func`) lädt das Skript von den community-scripts nach – das ist öffentlich und ohne
Konto erreichbar. Nur ProxLedger selbst kommt aus dem eigenen Git.

**Wichtig:** Ein per `curl` geladenes ct-Skript kann seine eigene Herkunft nicht ermitteln. Ohne
Angabe sucht das Gerüst `install/proxledger-install.sh` bei den community-scripts auf GitHub und
bricht mit *404 – Could not fetch install/proxledger-install.sh* ab. Das ct-Skript setzt deshalb

```bash
COMMUNITY_SCRIPTS_URL="https://raw.githubusercontent.com/florianwilde/ProxLedger/main/deploy/community-scripts"
```

selbst. Für einen anderen Zweig oder einen Fork lässt sich die Angabe von außen überschreiben:

```bash
COMMUNITY_SCRIPTS_URL=https://raw.githubusercontent.com/<nutzer>/ProxLedger/<zweig>/deploy/community-scripts \
  bash -c "$(curl -fsSL …/ct/proxledger.sh)"
```

Das Verzeichnis dahinter muss `ct/` und `install/` enthalten – deshalb zeigt die Angabe auf
`deploy/community-scripts`, nicht auf die Wurzel des Repositorys.

Zwei Umgebungsvariablen steuern, woher der Container ProxLedger klont:

```bash
PROXLEDGER_REPO=https://github.com/<nutzer>/ProxLedger.git PROXLEDGER_BRANCH=main bash -c "$(curl -fsSL …)"
```

Das Repository ist öffentlich; Einzeiler und Klon kommen ohne Anmeldung aus. Nur ein **privater Fork**
braucht für den Klon einen Lesezugriffs-Token in der Adresse (`https://<token>@github.com/...`), am
besten ein Fine-grained Token, der nur dieses Repository lesen darf. Das Token landet dann in der
Prozessliste und in `.git/config` des Containers. Den Einzeiler selbst liefert
`raw.githubusercontent.com` bei einem privaten Repository nicht aus.

**Bestehende Installationen** ziehen Updates weiter von der Adresse, von der sie geklont wurden. Von
Gitea geklonte bleiben aktuell, weil `main` und alle Tags dorthin gespiegelt werden. Wer direkt von
GitHub holen will, stellt einmal im Container um:

```bash
git -C /opt/proxledger remote set-url origin https://github.com/florianwilde/ProxLedger.git
```

## Was eine Einreichung bei community-scripts verlangen würde

Wir liefern die Skripte vorerst **nur intern** aus. Für eine Einreichung wären zusätzlich nötig:

1. **Öffentlich erreichbarer Quelltext.** Die Skripte dort holen die Anwendung praktisch immer aus
   einem öffentlichen GitHub-Repository (`fetch_and_deploy_gh_release`). Ein privates Repository genügt nicht.
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
