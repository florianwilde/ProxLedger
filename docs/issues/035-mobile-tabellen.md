# #035 Tabellen auf dem Handy als Karten
**Status:** erledigt
**Meilenstein:** v0.21.0
**Labels:** ui
**Geschätzt:** 3 h   **Tatsächlich:** 0 h 50 min

## Auslöser
„Etwas schöner darstellen auf dem Handy muss doch drin sein.“ Auf Rechnungen, Kunden und Jahresbahn
war rechts jeweils die Hälfte abgeschnitten, Knöpfe im Kartenkopf liefen über den Rand, und Namen
brachen Buchstabe für Buchstabe um.

## Aufgaben
- [x] `.pl-karten-tabelle`: unterhalb von 768 px wird jede Tabellenzeile zur Karte, jede Zelle bekommt
      ihre Beschriftung aus `data-label` davor
- [x] Angewandt auf Kunden, Rechnungen und den Ablauf-Kalender der Jahresbahn
- [x] Kartenkopf bricht um, statt über den Rand zu laufen
- [x] Jahresbahn: schmalere Namensspalte auf dem Telefon, dazu der Hinweis aufs seitliche Wischen
- [x] Mobilansichten der breiten Seiten kommen jetzt mit in die Bilderstrecke

## Warum Karten statt Scrollen
Eine Tabelle mit elf Spalten lässt sich auf 390 px nicht sinnvoll anzeigen. Seitliches Scrollen
versteckt die Hälfte der Angaben, und Spalten wegzulassen nimmt sie ganz weg. Als Karte steht jede
Angabe mit ihrer Beschriftung da – länger, aber vollständig.

## Nebenbefund
Das Kontrollkästchen für den Rechnungsstatus trug `pl-touch-target`, also `min-height: 44px` – und
wurde damit selbst zum 44 Pixel hohen leeren Kasten. Die Fläche zum Treffen bekommt jetzt sein Umfeld,
das Kästchen behält seine Größe.
