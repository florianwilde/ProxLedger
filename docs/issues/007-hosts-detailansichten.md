# #007 Host-Tabelle, Suche und Detailansichten
**Status:** erledigt
**Meilenstein:** v0.4.0
**Labels:** ui
**Geschätzt:** 8 h   **Tatsächlich:** 0 h 25 min

## Ziel
Hosts finden, filtern und vollständig einsehen.

## Aufgaben
- [x] Host-Tabelle (serverseitig): Filter Kunde, Status, Produkt, Ablauf, Rechnungsstatus; Sortierung; Spaltenauswahl; Paginierung; CSV-Export
- [x] Suche nach Key, Server-ID, Hostname, IP, Proxmox-Rechnungsnummer
- [x] Globale Suche in der Kopfleiste und Sidebar, `Strg+K`
- [x] Host-Detail: Profil-Card, Tabs Übersicht, Subscription-Historie, Reports, Rechnungen, Notizen; Tags
- [x] Kopier-Buttons für Key, Server-ID, Rechnungsnummer
- [x] Badge „Keine Meldung“

## Akzeptanzkriterien
- [x] Eingabe `pve1c-a6bd21fcb6` liefert direkt Host und Kunde
- [x] Filter bleiben in der URL erhalten (teilbar, Zurück-Button funktioniert)

## Abhängigkeiten
#006

## Notizen / Entscheidungen
- Filter, Sortierung und Seite stehen in der Adresse; eine gefilterte Liste ist damit teilbar und der
  Zurück-Knopf funktioniert.
- Sortierung stellt Hosts ohne Ablaufdatum bzw. ohne Meldung immer ans Ende (`nulls: "last"`), sonst stünden
  sie beim absteigenden Sortieren ganz oben.
- Die Suche findet auch über Proxmox- und Kundenrechnungsnummern zum Host.
- Der CSV-Export übernimmt die aktiven Filter und liefert alle Treffer, nicht nur die angezeigte Seite.
- **Zurückgestellt:** frei wählbare Spalten. Die Tabelle hat acht feste Spalten und passt damit auf einen
  Bildschirm; eine Spaltenauswahl lohnt erst bei deutlich mehr Feldern. Bei Bedarf als eigenes Issue nachziehen.
