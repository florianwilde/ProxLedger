# #043 Laufzeiten anlegen, bearbeiten und zusammenführen
**Status:** erledigt
**Meilenstein:** v0.25.0
**Labels:** backend, ui
**Geschätzt:** 4 h   **Tatsächlich:** 1 h 05 min

## Auslöser
Drei Rückmeldungen aus dem Einsatz:

1. „In der Kundenübersicht wäre es auch cool, die Laufzeit / Rechnung zu überarbeiten.“
2. „Wie werden so Laufzeiten erfasst?“
3. „Auch die Laufzeit im Nachhinein zu bearbeiten geht nicht. Oder mit einer vorhandenen zu
   verknüpfen oder zu vereinen.“

## Ausgangslage
Laufzeiten entstanden ausschließlich als **Vorschlag** aus dem Agenten-Report: Meldet ein Host ein
Ablaufdatum, legt ProxLedger eine Laufzeit von diesem Datum bis ein Jahr später an. Bestätigen oder
verwerfen war möglich – mehr nicht:

- **Anlegen von Hand** gab es als Server-Aktion, aber **nirgends in der Oberfläche**.
- **Ändern** war unmöglich. Weicht das gemeldete Datum von der Bestellung ab, blieb es falsch.
- **Zusammenführen** gab es nicht, obwohl der Fall zwangsläufig auftritt: Neben einer erfassten
  Laufzeit legt der Agent eine zweite an, wenn das Ablaufdatum um einen Tag abweicht.
- Aus der **Kundenansicht** führte kein Weg in die Laufzeit.

## Behebung
- Formular *Laufzeit von Hand anlegen* auf der Rechnungsseite; der gemeldete Key wird vorgeschlagen,
  das Ende aus dem Beginn vorbelegt (ein Jahr minus ein Tag – dieselbe Rechnung wie beim Vorschlag).
- *Laufzeit bearbeiten* im Laufzeit-Detail: Key, Beginn, Ende, Notiz. Eine Änderung bestätigt den
  Vorschlag zugleich.
- *Zusammenführen* mit einer anderen Laufzeit desselben Hosts. Die aufgelöste Laufzeit gibt ihre
  Rechnungen ab, sofern das Ziel dort nichts hat; haben beide eine Rechnung derselben Art, bricht der
  Vorgang mit einer Erklärung ab.
- Kundenansicht: Laufzeit und Host sind verlinkt, Marge und Rabatt stehen dabei.

## Entscheidungen
- **Kein stilles Überschreiben beim Zusammenführen.** Zwei Einkaufsrechnungen auf einem Lizenzjahr
  wären nicht mehr zuzuordnen – lieber ein Abbruch mit Hinweis.
- **Beim Ändern bleibt die Regel „ein Startdatum je Host“.** Kollidiert das neue Datum, verweist die
  Meldung aufs Zusammenführen.
- Beim Zusammenführen muss die Quelle ihre Positionen zuerst loslassen: Eine Rechnungsposition gehört
  zu genau einer Laufzeit, und die Datenbank wacht darüber. Erst dann darf das Ziel sie übernehmen.
