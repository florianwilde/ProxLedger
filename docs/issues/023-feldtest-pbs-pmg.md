# #023 Feldtest auf Proxmox Backup Server und Mail Gateway
**Status:** erledigt
**Meilenstein:** v1.0.0
**Labels:** agent, feldtest
**Geschätzt:** 2 h   **Tatsächlich:** 0 h 35 min

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
- [x] `scripts/feldtest-erheben.sh` auf einem PBS-Host laufen lassen (liest nur, ändert nichts)
- [x] Prüfen, ob `proxmox-backup-manager subscription get` Text oder JSON liefert und welche Felder
      ohne Subscription überhaupt erscheinen
- [x] Ausgabe von `proxmox-backup-manager version` gegen `produkt_version()` prüfen
- [x] Erhobene Ausgaben als Testfälle in `tests/agent-skript.test.ts` aufnehmen – der heutige
      PBS-Testfall ist erfunden (JSON) und damit womöglich am echten Verhalten vorbei
- [x] Agent auf einem PBS-Host installieren, einen Report abwarten, wieder deinstallieren
- [x] PMG: von Florian am 23.10.2026 zurückgestellt – wird derzeit nicht betrieben, die Lücke bleibt im Handbuch benannt

## Notizen
Der Cluster-Abgleich aus #022 betrifft nur PVE: PBS und PMG kennen kein `pvecm`, dort bleibt die
Mitgliederliste leer.

## Ergebnis (18.09.2026, `bup-ste-pbs-01`, PBS 4.2 auf Debian 13, ohne Subscription)

**Ein echter Fehler gefunden – und er war kein kleiner.** `proxmox-backup-manager subscription get`
gibt ohne weitere Angabe eine **Rahmentabelle** aus:

```
┌──────────┬────────────────────────────────┐
│ Name     │ Value                          │
╞══════════╪════════════════════════════════╡
│ status   │ notfound                       │
```

Der Agent suchte nach `feld: wert` oder JSON – beides passt nicht. Auf einem echten PBS hätte er
**alle Felder als null gemeldet, nicht einmal die Server-ID**. Der erfundene Testfall hatte genau das
verdeckt, weil er JSON unterstellte.

Behoben in drei Schritten:

1. Für PBS wird `--output-format json` verwendet. Anders als PVE **kann** PBS das (auf 4.2 geprüft).
2. Bleibt die Ausgabe leer, wird die Textform genommen und die Rahmentabelle ausgewertet
   (`awk -F'│'`) – für Fassungen, die das JSON-Format nicht kennen.
3. `proxmox-backup-manager version` liefert „proxmox-backup-server 4.2.6-1 running version: 4.2.1“;
   gemeldet wird jetzt die installierte Fassung ohne den Zusatz.

Beide Formen sind als Testfälle hinterlegt, mit den echten Ausgaben des Hosts.

**Nebenbefund:** Der Agent meldete „Neue Agent-Version verfügbar: 0.2.0 (installiert: 0.2.1)“ – er
verglich nur auf Ungleichheit. Jetzt wird mit `sort -V` geprüft, ob die Fassung wirklich neuer ist.

**Ende-zu-Ende geprüft:** Installation → Registrierung → erster Report → Warnungen. Im Dashboard kamen
an: Produkt `PBS`, Version `proxmox-backup-server 4.2.6-1`, Server-ID `69AED6…`, 1 Sockel, 106
ausstehende Pakete, leere Cluster-Liste (PBS kennt kein `pvecm`), Warnungen „Keine Subscription
gefunden“ und „Host ist keinem Kunden zugewiesen“. Anschließend `--uninstall`: Timer, Dienst,
`/usr/local/bin/proxledger-agent`, `/etc/proxledger` und `/var/lib/proxledger` restlos entfernt. Damit
ist auch der letzte offene Punkt aus #018 erledigt.

**Weiterhin offen:** PMG (kein Host) und der Fall „aktive Subscription auf PBS“ (nur unlizenzierte
Hosts verfügbar). Dieses Issue bleibt deshalb offen.

## Abschluss am 23.10.2026

**PBS mit aktiver Lizenz: bestätigt.** In der produktiven Installation melden `pbs-cloud-01`,
`bup-pbs-01` und `bup-lwwif-pbs-01` ihre `pbsb-…`-Keys samt Ablaufdatum (04.10.2027). Damit ist auch
der lizenzierte Fall auf Proxmox Backup Server belegt – nach dem Fund der Rahmentabelle (#037) war
das der letzte offene Punkt dieses Produktzweigs.

**PMG: zurückgestellt.** Florian betreibt derzeit kein Mail Gateway; der Feldtest entfällt bis auf
Weiteres. Im Handbuch steht weiterhin, dass dieser Zweig ungeprüft ist und der erste PMG-Host nach
der Installation einmal gegenzuprüfen gehört (`proxledger-agent --dry-run`).
