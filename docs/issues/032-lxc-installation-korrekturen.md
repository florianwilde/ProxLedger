# #032 LXC-Installation: Herkunft der Skripte und Speicher
**Status:** erledigt
**Meilenstein:** v0.20.1
**Labels:** deployment
**Geschätzt:** 1 h   **Tatsächlich:** 0 h 20 min

## Auslöser
Erster echter Lauf auf `hv-rz5-pve-02`: Der Container entstand, dann brach es ab mit

```
curl: (22) The requested URL returned error: 404
✖️  Could not fetch install/proxledger-install.sh
📁  Looked in: https://raw.githubusercontent.com/community-scripts/ProxmoxVE/main
```

## Ursache
Ein per `curl` geladenes ct-Skript kann seine eigene Herkunft nicht ermitteln. Das Gerüst setzt dann
die Standardadresse der community-scripts ein und sucht dort `install/proxledger-install.sh`.

## Behebung
- Das ct-Skript setzt `COMMUNITY_SCRIPTS_URL` selbst auf die eigene Gitea-Adresse (für Forks und
  andere Zweige weiterhin überschreibbar).
- Vorgabe für den Arbeitsspeicher von 2 auf **4 GB** angehoben: `next build` braucht während der
  Installation deutlich mehr als 2 GB und wäre nach zehn Minuten am Speicher gescheitert.
- Die ermittelte Adresse wird geprüft; `hostname -I` ohne Ergebnis fällt auf die Route nach außen
  zurück, und in den Zugangsdaten steht der Hinweis, dass `0.0.0.0` aus dem Journal keine
  aufrufbare Adresse ist.
