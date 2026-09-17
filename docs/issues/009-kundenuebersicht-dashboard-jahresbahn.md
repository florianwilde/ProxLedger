# #009 Kundenübersicht, Dashboard und Jahresbahn
**Status:** erledigt
**Meilenstein:** v0.6.0
**Labels:** ui
**Geschätzt:** 8 h   **Tatsächlich:** 0 h 15 min

## Ziel
Überblick über Kunden, Kennzahlen und anstehende Abläufe mit Echtdaten.

## Aufgaben
- [x] Kundenübersicht: Anzahl Hosts, aktive Subscriptions, nächster Ablauf, offene Warnungen, Rechnungs-Ampel
- [x] Kunden-Detail mit Echtdaten (Info-Boxen, Hosts, Laufzeiten, Summen pro Jahr)
- [x] Dashboard mit Echtdaten: Small Boxes (inkl. „Mehr Infos“-Links auf gefilterte Listen), Kacheln ohne Subscription, ohne Meldung, ohne Kunde, offene Proxmox-Rechnungen, fehlende Kundenrechnungen
- [x] Card „Rechnungsstatus je Kunde“
- [x] Ablauf-Kalender: nächste 90 Tage
- [x] Jahresbahn: Timeline der nächsten 12 Monate, „Heute“-Linie, gruppiert nach Kunde

## Akzeptanzkriterien
- [x] Kennzahlen stimmen mit den gefilterten Listen überein
- [x] Jahresbahn mobil horizontal scrollbar

## Abhängigkeiten
#008

## Notizen / Entscheidungen
- Kundenübersicht, Kunden-Detail und Dashboard liefen bereits seit #006 auf der Datenbank; hier kamen
  Jahresbahn und Ablauf-Kalender dazu.
- Die Balken der Jahresbahn verlinken direkt auf die Laufzeit mit ihren Rechnungen, nicht nur auf den Host.
- Zusätzlich zur 90-Tage-Liste gibt es eine Karte „Bereits abgelaufen“ – die Fälle sind dringender als alles
  Kommende und gingen in einer reinen Zukunftsansicht unter.
- Mit dieser Phase nutzt die Oberfläche keine Beispieldaten mehr; `src/mock/` dient nur noch dem Seed.
