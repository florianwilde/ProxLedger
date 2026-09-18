# #026 Auslieferung finalisieren
**Status:** erledigt
**Meilenstein:** v0.17.0
**Labels:** deployment, doku
**Geschätzt:** 3 h   **Tatsächlich:** 0 h 40 min

## Ziel
Zwei saubere Wege, ProxLedger in Betrieb zu nehmen: als Docker-Stack und als LXC-Container nach Art
der Proxmox VE Helper-Scripts.

## Aufgaben
- [x] `deploy/update.sh`: sichern, bauen, migrieren, neu starten, Erreichbarkeit prüfen
- [x] Zustandsprüfung für den Worker in `docker-compose.yml`
- [x] `AUFRAEUM_CRON` in `.env.example` und im Compose-Dienst
- [x] `deploy/community-scripts/ct/proxledger.sh` und `install/proxledger-install.sh`
- [x] `deploy/community-scripts/README.md` mit Voraussetzungen für eine Einreichung
- [x] README auf den tatsächlichen Stand gebracht (Feldtest erledigt, Einstellungen, Sicherheit)
- [x] `docs/roadmap.md`
- [x] Docker-Stapel vollständig durchgespielt: bauen, starten, migrieren, anmelden, Agent-Skript abrufen

## Erkenntnisse zu community-scripts
- Die Skripte laden ihr Gerüst inzwischen aus einem eigenen Repository
  (`community-scripts/core`, Datei `core/build.func`) – nicht mehr aus `misc/build.func`.
- **Neue Skripte gehören als Pull Request nach ProxmoxVED**, nicht nach ProxmoxVE. Direkt eingereichte
  Skripte werden dort ohne Prüfung geschlossen.
- Die JSON-Metadaten für die Webseite liegen nicht mehr im Skript-Repository.
- Eine Einreichung setzt öffentlich erreichbaren Quelltext voraus (in aller Regel GitHub). Solange
  ProxLedger im eigenen Gitea liegt, bleiben die Skripte intern; die Quelle lässt sich über
  `PROXLEDGER_REPO` setzen.

## Beim Prüfen gefunden
Der Docker-Stapel wurde vollständig gestartet (bauen, migrieren, anmelden). Dabei zeigte sich: Nach der
Anmeldung wies die Weiterleitung auf `http://<container-id>:3000` – die **interne** Adresse des
Containers. Im Browser hinter einem Reverse Proxy wäre das eine tote Adresse gewesen. Weiterleitungen
nehmen jetzt die eingetragene Adresse, sonst `APP_URL`, sonst die Kopfzeilen des Reverse Proxy
(`src/lib/adresse.ts`, vier Tests). Im Stapel gegengeprüft: `location: http://localhost:3001/`.

## Entscheidung
Der eigene `deploy/lxc-installer.sh` (Container **mit Docker darin**) bleibt erhalten. Der neue Weg
installiert Node und PostgreSQL direkt in den Container – das ist schlanker und entspricht dem, was
Proxmox-Betreiber von Helper-Scripts erwarten. Beide Wege stehen gleichberechtigt im README.
