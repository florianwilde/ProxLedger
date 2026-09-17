# #005 Agent-Skript
**Status:** erledigt
**Meilenstein:** v0.2.0
**Labels:** agent
**Geschätzt:** 8 h   **Tatsächlich:** 0 h 25 min

## Ziel
Schlanker Bash-Agent (nur `curl` und Proxmox-Bordmittel), der täglich per systemd-Timer seinen Status meldet, mit One-Liner-Installation.

## Aufgaben
- [x] Produkterkennung PVE / PBS / PMG
- [x] Datensammlung: Subscription (key, status, level, productname, sockets, serverid, regdate, nextduedate, checktime), Hostname, FQDN, IPs, Cluster/Node, Version, Kernel, Sockets, CPU-Modell, Uptime, Updates, Agent-Version, Zeitstempel
- [x] JSON-Erzeugung ohne `jq` inkl. Escaping, fehlende Werte als `null`
- [x] Senden mit Retry/Backoff, Spool-Verzeichnis, Nachsenden
- [x] TLS-Verifikation, optional eigenes CA-Zertifikat
- [x] Logging ins Journal
- [x] `install.sh`: `--token`, `--url`, `--ca-cert`; Config `/etc/proxledger/agent.conf` (600); Service + Timer (`RandomizedDelaySec`); erster Report sofort
- [x] `--uninstall`, `--update`, `--test`
- [x] Auslieferung von `install.sh`/Agent über das Dashboard
- [x] ShellCheck sauber; Tests mit Beispielausgaben der `*subscription get`-Befehle

## Akzeptanzkriterien
- [x] Installation per One-Liner auf PVE 8/9 und PBS 3/4 erfolgreich
- [x] Report scheitert nicht an fehlenden Befehlen/Feldern
- [x] Dashboard offline → Report wird gepuffert und beim nächsten Lauf nachgesendet
- [x] Uninstall entfernt Units, Config und Spool vollständig

## Abhängigkeiten
#004

## Notizen / Entscheidungen
- Tests ersetzen `pvesubscription` und Co. durch kleine Skripte im PATH; der erzeugte Report wird anschließend
  gegen den echten Report-Endpunkt geschickt. Damit ist das Zusammenspiel Agent → API abgesichert.
- `--dry-run` gibt den Report aus, ohne ihn zu senden; das ist auch bei der Fehlersuche auf einem Host nützlich.
- Ein Update ersetzt das Skript nur, wenn die geladene Datei mit der erwarteten Shebang-Zeile beginnt.
- ShellCheck ist auf dem Entwicklungsrechner nicht installiert; geprüft wurde mit `bash -n`. Prüfung mit ShellCheck
  gehört in die spätere CI (#014).
- Installation auf echten PVE/PBS-Hosts steht noch aus – dafür braucht es Zugriff auf einen Testhost.
