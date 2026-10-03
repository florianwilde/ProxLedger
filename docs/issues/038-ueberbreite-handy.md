# #038 Seite wird auf dem Handy herausgezoomt
**Status:** erledigt
**Meilenstein:** v0.22.1
**Labels:** bug, ui
**Geschätzt:** 2 h   **Tatsächlich:** 0 h 40 min

## Auslöser
Zwei Meldungen aus dem Einsatz: Beim Öffnen der Warnungen verkleinerte sich die ganze Seite, und die
Host-Detailansicht saß verschoben im Bild.

## Ursache
Beides derselbe Mechanismus: Ein Element ist breiter als das Fenster, also zoomt der Browser die
**ganze Seite** heraus, damit sie hineinpasst. Drei Verursacher:

1. Die Klappliste der Warnungen war mit 22 rem fest breiter als ein 390-px-Fenster.
2. Drei Tabellen in der Host-Detailansicht (Keys, Server-IDs, Tokens) standen ohne
   `table-responsive` – anders als die übrigen.
3. Eine 32-stellige Server-ID bricht nicht von selbst um.

## Behebung
- Klapplisten richten sich auf dem Telefon am Fenster aus (`position: fixed`, links und rechts 0,5 rem,
  höchstens 70 % Fensterhöhe mit eigenem Scroll) statt am Knopf
- Die drei Tabellen bekommen ihre Hülle
- Lange Schlüssel und IDs dürfen umbrechen (`overflow-wrap: anywhere`)
- `npm run screenshots -- --mobil name=/pfad` nimmt gezielt eine Seite in Telefonbreite auf; damit
  wurde die Host-Detailansicht gegengeprüft

## Nachtrag zu #037
Beim Prüfen fiel auf, dass die Laufzeit-Detailseite noch mit dem **Listenpreis** rechnete statt mit
dem Betrag nach Rabatt – Marge und Vorschlag für die Kundenrechnung waren dort um den Rabatt zu hoch.
Die Seite zeigt jetzt „990,00 € · 1.100,00 € − 110,00 € Rabatt“ und rechnet mit 990.
