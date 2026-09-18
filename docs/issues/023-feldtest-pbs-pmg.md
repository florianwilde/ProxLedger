# #023 Feldtest auf Proxmox Backup Server und Mail Gateway
**Status:** offen
**Meilenstein:** v1.0.0
**Labels:** agent, feldtest
**Geschätzt:** 2 h   **Tatsächlich:** –

## Ziel
Der Feldtest in #018 lief auf zwei Proxmox-VE-Hosts. Für Backup Server und Mail Gateway beruht die
Auswertung im Agent bisher nur auf Annahmen – und bei PVE hat sich genau eine solche Annahme als
falsch erwiesen (`--output-format json` gibt es dort nicht). Das gehört vor 1.0.0 geprüft.

## Ausgangslage
- **PBS:** Hosts stellt Florian bereit, allerdings **nur unlizenziert**. Damit lässt sich der Fall
  „aktive Subscription“ auf PBS nicht prüfen – wohl aber Produkterkennung, Version, Server-ID und der
  Zustand `notfound`, der bei PVE die meisten Überraschungen geliefert hat.
- **PMG:** derzeit kein Host verfügbar. Der Zweig bleibt ungeprüft; das ist im Handbuch zu vermerken.

## Aufgaben
- [ ] `scripts/feldtest-erheben.sh` auf einem PBS-Host laufen lassen (liest nur, ändert nichts)
- [ ] Prüfen, ob `proxmox-backup-manager subscription get` Text oder JSON liefert und welche Felder
      ohne Subscription überhaupt erscheinen
- [ ] Ausgabe von `proxmox-backup-manager version` gegen `produkt_version()` prüfen
- [ ] Erhobene Ausgaben als Testfälle in `tests/agent-skript.test.ts` aufnehmen – der heutige
      PBS-Testfall ist erfunden (JSON) und damit womöglich am echten Verhalten vorbei
- [ ] Agent auf einem PBS-Host installieren, einen Report abwarten, wieder deinstallieren
- [ ] PMG offen lassen und die Lücke im Handbuch benennen

## Notizen
Der Cluster-Abgleich aus #022 betrifft nur PVE: PBS und PMG kennen kein `pvecm`, dort bleibt die
Mitgliederliste leer.
