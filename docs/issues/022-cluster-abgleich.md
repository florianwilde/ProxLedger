# #022 Cluster-Abgleich
**Status:** erledigt
**Meilenstein:** v0.14.0
**Labels:** agent, backend, alerts
**Geschätzt:** 3 h   **Tatsächlich:** 0 h 25 min

## Ziel
In einem Proxmox-Cluster hat jeder Knoten eine eigene Subscription mit eigener Server-ID. Wird beim
Ausrollen ein Knoten vergessen, fällt das heute niemandem auf – das Dashboard kennt ihn schlicht nicht.
Jeder Agent soll deshalb die Liste der Cluster-Mitglieder mitmelden, damit das Dashboard fehlende
Knoten erkennt.

## Aufgaben
- [x] Agent meldet `clusterMitglieder` (Namen aller Knoten laut `pvecm nodes`)
- [x] Agent-API nimmt das Feld entgegen (optional, wie alle anderen)
- [x] Datenmodell: Feld am Host, Migration
- [x] Warnregel „Cluster-Knoten ohne Agent“
- [x] Host-Detail zeigt die Mitglieder mit Zustand (meldet sich / kein Agent)
- [x] Tests: Agent mit nachgebautem `pvecm`, Regel mit vollständigem und lückenhaftem Cluster

## Akzeptanzkriterien
- [x] Ein Cluster mit drei Knoten und zwei Agents erzeugt genau eine Warnung
- [x] Sobald der dritte Agent meldet, schließt sich die Warnung von selbst
- [x] Hosts ohne Cluster erzeugen keine Warnung

## Abhängigkeiten
#005, #011, #018

## Notizen / Entscheidungen
- Entstanden beim Feldtest (#018) an einem echten Cluster mit drei Knoten: Alle drei haben eigene
  Server-IDs und eigenen Status, bestätigt über `pvesh get /nodes/<name>/subscription`.
- Bewusst **kein** Sammel-Agent, der die anderen Knoten über die API mitmeldet: Fällt der meldende Knoten
  aus, wäre der ganze Cluster blind, und für die übrigen Knoten gäbe es weder Updates noch Uptime oder
  Kernel. Stattdessen Agent je Knoten plus dieser Abgleich.
- Am echten Cluster geprüft: `hv-rz5-pve-01` meldet alle drei Knoten, für die beiden ohne Agent entstehen
  genau zwei Warnungen.
- Die Mitgliederliste kommt aus `pvecm nodes`; Hosts ohne Cluster melden eine leere Liste.
- Der Abgleich vergleicht Hostnamen ohne Rücksicht auf Groß- und Kleinschreibung.
