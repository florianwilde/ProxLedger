# #010 Export CSV und PDF
**Status:** erledigt
**Meilenstein:** v0.6.0
**Labels:** export
**Geschätzt:** 5 h   **Tatsächlich:** 0 h 20 min

## Ziel
Daten für Kundenunterlagen und Buchhaltung exportieren.

## Aufgaben
- [x] CSV (UTF-8 mit BOM, Semikolon, deutsches Zahlenformat): Host-Liste, Kundenübersicht, Rechnungsliste pro Jahr
- [x] PDF mit einfarbigem Logo: Host-Liste, Kundenübersicht (Anlage für einen Kunden), Rechnungsliste pro Jahr mit Summen
- [x] Export berücksichtigt aktive Filter

## Akzeptanzkriterien
- [x] CSV öffnet sich in Excel ohne Umlautfehler
- [x] PDF-Summen entsprechen der Rechnungsübersicht

## Abhängigkeiten
#009

## Notizen / Entscheidungen
- PDFs entstehen serverseitig mit `@react-pdf/renderer` – kein Chromium im Container nötig.
- Gemeinsames Grundgerüst (`src/server/pdf/dokument.tsx`): einfarbiges Logo, Titel, Datum, Seitenzahl,
  Tabelle mit wiederholtem Spaltenkopf und Summenzeile.
- Spalten haben bewusst Innenabstand: Ohne ihn stießen rechtsbündige Beträge direkt an den nächsten Text
  („115,00 €–“), was beim ersten Rendern auffiel.
- Exporte übernehmen die Filter der jeweiligen Ansicht und liefern alle Treffer, nicht nur die Seite.
