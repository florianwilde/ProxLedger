# #039 Auf dem Telefon führte kein Weg zur Laufzeit
**Status:** erledigt
**Meilenstein:** v0.22.2
**Labels:** bug, ui
**Geschätzt:** 1 h   **Tatsächlich:** 0 h 30 min

## Auslöser
„Kann ich am Handy nicht rein.“ Gemeint war der Reiter *Rechnungen* in der Host-Detailansicht: Die
Zeile zeigt Laufzeit, Rechnung und Beträge – aber nichts davon war anklickbar.

## Ursache
Zwei Stellen:

1. In der Host-Detailansicht war die Laufzeit nie verlinkt, auch am Rechner nicht. Man kam nur über
   die Rechnungsliste dorthin.
2. In der Rechnungsliste ist die Laufzeit-Spalte erst ab 992 px eingeblendet. Auf dem Telefon fehlte
   damit der einzige Verweis auf die Formulare – die Karte verwies nur auf den Host.

## Behebung
- Die Laufzeit in der Host-Detailansicht ist ein Link und zugleich die Überschrift der Karte
- In der Rechnungsliste bleibt die Laufzeit auf dem Telefon sichtbar; ausgeblendet wird sie nur
  zwischen 768 und 992 px, wo die Tabelle am engsten ist
- Der Reiter *Rechnungen* nutzt ebenfalls das Kartenlayout

## Nebenbefund
Auch dieser Reiter rechnete den Einkauf noch ohne Rabatt – 1.100 € statt 990 €. Dritte Stelle nach
#037 und #038; alle gefunden, weil Florian die Zahl auf dem Bildschirm mit seiner Rechnung verglichen hat.

## Gelernt
Bootstraps `d-*`-Hilfsklassen setzen `display` mit `!important` und überschreiben damit das
Kartenlayout. Für Spalten, die in der Kartenansicht sichtbar bleiben sollen, braucht es eine eigene
Klasse (`pl-spalte-laufzeit`).
