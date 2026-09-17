# #005 Agent-Skript
**Status:** offen
**Meilenstein:** v0.2.0
**Labels:** agent
**Geschätzt:** 8 h   **Tatsächlich:** –

## Ziel
Schlanker Bash-Agent (nur `curl` und Proxmox-Bordmittel), der täglich per systemd-Timer seinen Status meldet, mit One-Liner-Installation.

## Aufgaben
- [ ] Produkterkennung PVE / PBS / PMG
- [ ] Datensammlung: Subscription (key, status, level, productname, sockets, serverid, regdate, nextduedate, checktime), Hostname, FQDN, IPs, Cluster/Node, Version, Kernel, Sockets, CPU-Modell, Uptime, Updates, Agent-Version, Zeitstempel
- [ ] JSON-Erzeugung ohne `jq` inkl. Escaping, fehlende Werte als `null`
- [ ] Senden mit Retry/Backoff, Spool-Verzeichnis, Nachsenden
- [ ] TLS-Verifikation, optional eigenes CA-Zertifikat
- [ ] Logging ins Journal
- [ ] `install.sh`: `--token`, `--url`, `--ca-cert`; Config `/etc/proxledger/agent.conf` (600); Service + Timer (`RandomizedDelaySec`); erster Report sofort
- [ ] `--uninstall`, `--update`, `--test`
- [ ] Auslieferung von `install.sh`/Agent über das Dashboard
- [ ] ShellCheck sauber; Tests mit Beispielausgaben der `*subscription get`-Befehle

## Akzeptanzkriterien
- [ ] Installation per One-Liner auf PVE 8/9 und PBS 3/4 erfolgreich
- [ ] Report scheitert nicht an fehlenden Befehlen/Feldern
- [ ] Dashboard offline → Report wird gepuffert und beim nächsten Lauf nachgesendet
- [ ] Uninstall entfernt Units, Config und Spool vollständig

## Abhängigkeiten
#004

## Notizen / Entscheidungen
