# #040 Schlagworte und Notizen sichtbar machen
**Status:** erledigt
**Meilenstein:** v0.23.0
**Labels:** ui
**Geschätzt:** 2 h   **Tatsächlich:** 0 h 40 min

## Auslöser
„Manche Hosts haben gleiche Namen.“ Zwei Hosts namens `hv-pve-01` bei verschiedenen Kunden sind in
der Liste nur am Kunden auseinanderzuhalten – und wenn beide zum selben Kunden gehören, gar nicht.

## Ausgangslage
Schlagworte und Notizen gab es schon: im Host-Detail unter *Notizen und Tags*. Sie waren nur nirgends
zu sehen, außer in diesem einen Reiter. Damit taugten sie nicht zum Unterscheiden.

## Behebung
- **Host-Liste:** Schlagworte als Abzeichen unter dem Namen, jedes anklickbar – ein Klick filtert die
  Liste darauf. Eine vorhandene Notiz zeigt ein kleines Zettel-Symbol, dessen Text beim Überfahren erscheint.
- **Filterleiste:** Auswahl „Alle Schlagworte“, die nur tatsächlich vergebene Worte anbietet.
- **Host-Detail:** Schlagworte und Notiz stehen oben in der Host-Karte, nicht erst im Reiter.
- **Suche:** Die Hostsuche und die globale Suche (Strg+K) finden jetzt auch über Schlagwort und
  Notiztext; die Trefferzeile nennt die Schlagworte.
- Sechs Tests, darunter zwei gleichnamige Hosts bei verschiedenen Kunden.

## Entscheidung
Keine neue Datenstruktur. Schlagworte und Notizen waren bereits vorhanden und wurden nur nicht
gezeigt – ein zweites Feld „Kommentar“ hätte dieselbe Angabe an zwei Orten gehalten.
