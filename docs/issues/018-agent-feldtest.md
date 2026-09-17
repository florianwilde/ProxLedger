# #018 Agent auf echten Proxmox-Hosts prüfen
**Status:** offen
**Meilenstein:** v0.2.1
**Labels:** agent, test
**Geschätzt:** 2 h   **Tatsächlich:** –

## Ziel
Der Agent ist bisher nur gegen nachgebaute Proxmox-Befehle getestet. Vor dem produktiven Einsatz muss er
auf echten Hosts laufen.

## Aufgaben
- [ ] Installation auf Proxmox VE (8.x und 9.x)
- [ ] Installation auf Proxmox Backup Server
- [ ] Installation auf Proxmox Mail Gateway
- [ ] Ausgabeformate von `pvesubscription get`, `proxmox-backup-manager subscription get` und
      `pmgsubscription get` mit den Annahmen im Skript abgleichen
- [ ] Verhalten ohne Subscription und mit abgelaufener Subscription prüfen
- [ ] Timer-Lauf, Spool-Nachsendung und Uninstall auf einem echten Host prüfen
- [ ] Abweichungen als Testfälle in `tests/agent-skript.test.ts` übernehmen

## Akzeptanzkriterien
- [ ] Auf allen drei Produkten läuft die Installation ohne Nacharbeit durch
- [ ] Die gemeldeten Felder stimmen mit der Ausgabe der Proxmox-Befehle überein

## Abhängigkeiten
#005

## Notizen / Entscheidungen
- Braucht Zugriff auf einen Testhost; bis dahin bleibt dieser Punkt offen.
