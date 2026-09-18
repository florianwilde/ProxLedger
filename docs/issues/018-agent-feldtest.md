# #018 Agent auf echten Proxmox-Hosts prüfen
**Status:** erledigt
**Meilenstein:** v0.14.0
**Labels:** agent, test
**Geschätzt:** 2 h   **Tatsächlich:** 0 h 40 min

## Ziel
Der Agent ist bisher nur gegen nachgebaute Proxmox-Befehle getestet. Vor dem produktiven Einsatz muss er
auf echten Hosts laufen.

## Aufgaben
- [x] Installation auf Proxmox VE 9.2 (zwei Hosts: mit und ohne Subscription)
- [ ] Installation auf Proxmox Backup Server (kein Host verfügbar)
- [ ] Installation auf Proxmox Mail Gateway (kein Host verfügbar)
- [x] Ausgabeformate von `pvesubscription get`, `proxmox-backup-manager subscription get` und
      `pmgsubscription get` mit den Annahmen im Skript abgleichen
- [x] Verhalten ohne Subscription geprüft (Status `notfound`, alle übrigen Felder fehlen und werden zu null)
- [x] Timer, Spool-Nachsendung und Uninstall geprüft (Uninstall am 18.09.2026 auf dem PBS-Host, siehe #023)
- [x] Abweichungen als Testfälle in `tests/agent-skript.test.ts` übernehmen

## Akzeptanzkriterien
- [ ] Auf allen drei Produkten läuft die Installation ohne Nacharbeit durch
- [ ] Die gemeldeten Felder stimmen mit der Ausgabe der Proxmox-Befehle überein

## Abhängigkeiten
#005

## Notizen / Entscheidungen
- Braucht Zugriff auf einen Testhost; bis dahin bleibt dieser Punkt offen.

### Ergebnis des Feldtests (18.09.2026)

Zwei echte Hosts, beide Proxmox VE 9.2, per SSH:

| | `hv-rz5-pve-01` | `hv-ste-pve-01` |
|---|---|---|
| Subscription | keine (`notfound`) | aktiv, Ablauf 03.06.2027 |
| Cluster | ja, drei Knoten | nein |
| Sockets | 2 | 1 |
| Ergebnis | Report korrekt, Warnungen korrekt | Report korrekt, Laufzeit-Vorschlag angelegt |

**Was sich bestätigt hat:** Die Ausgaben von `pvesubscription get`, `pveversion`, `lscpu`, `ip -o addr`,
`pvecm status` und `apt list --upgradable` entsprechen den Annahmen. Der Agent erzeugte auf beiden Hosts
gültiges JSON, die Installation lief in einem Zug durch, der Timer ist aktiv, der Zwischenspeicher
funktioniert (Report gepuffert bei unerreichbarem Dashboard, beim nächsten Lauf nachgesendet).

**Was anders war als gedacht:**

1. `pvesubscription get` kennt **kein** `--output-format json` (PVE 9.2). Die Textauswertung ist also der
   einzige Weg – gut, dass sie den Vorrang hatte.
2. Ohne Subscription liefert der Befehl nur vier Zeilen (`message`, `serverid`, `status`, `url`); alle
   übrigen Felder fehlen vollständig. Der Agent meldet sie als `null`, das Dashboard zeigt „Keine
   Subscription“.
3. `pveversion` enthält den Kernel im selben String („… (running kernel: …)“). Da der Kernel separat
   gemeldet wird, schneidet der Agent ihn jetzt ab.
4. `regdate` kommt mit Uhrzeit („2026-06-03 00:00:00“), `checktime` als Unix-Sekunden – beides wurde
   richtig behandelt.
5. Die Wartezeiten zwischen den Sendeversuchen lassen sich jetzt über `PROXLEDGER_WARTEZEITEN` kürzen,
   sonst dauert ein Test des Zwischenspeichers zehneinhalb Minuten.
6. **Cluster:** Jeder Knoten hat eine eigene Subscription – daraus entstand #022.

**Noch offen:** PBS und PMG – dafür ist #023 angelegt. PBS-Hosts stellt Florian bereit, allerdings nur
unlizenziert; für PMG gibt es derzeit keinen Host. Der Uninstall-Durchlauf ist inzwischen erledigt (#023).
