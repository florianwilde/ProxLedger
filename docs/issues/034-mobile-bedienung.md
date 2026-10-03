# #034 Bedienung auf dem Handy
**Status:** erledigt
**Meilenstein:** v0.20.2
**Labels:** ui, bug
**Geschätzt:** 2 h   **Tatsächlich:** 0 h 40 min

## Auslöser
Florian im produktiven Einsatz auf dem Telefon: „Das Menü geht nicht weg.“ Dazu eine Tabelle, von der
rechts die Hälfte abgeschnitten war.

## Ursache
Das Markup stammt von AdminLTE, dessen JavaScript binden wir bewusst nicht ein. Die Klasse
`sidebar-open` ließ sich damit setzen – aber nichts nahm sie wieder weg: keine Fläche zum Antippen,
kein Schließen beim Navigieren, kein Escape. Auf dem Telefon blieb das Menü über dem Inhalt stehen.

## Behebung
- Eigener, winziger Zustand (`menuZustand.ts`), auf den Kopfzeile und Menü gemeinsam hören
- Abdunkelnde Fläche hinter dem Menü – antippen schließt (ein `button`, damit auch per Tastatur erreichbar)
- Schließen-Knopf im Menükopf, nur auf schmalen Bildschirmen
- Schließt beim Navigieren und mit Escape
- Der Inhalt dahinter scrollt nicht mehr mit, solange das Menü offen ist
- Dashboard-Tabelle: auf dem Telefon nur Host und Ablauf, der Kunde steht klein unter dem Hostnamen.
  Key und Rechnungsstände erscheinen ab Tablet-Breite – die Host-Tabelle machte das schon vorher so.
- Fünf Tests für die Zustandslogik

## Nicht geändert
Die abdunkelnde Fläche gilt nur unter 992 px. Auf breiten Bildschirmen bleibt es beim bisherigen
Verhalten: Das Menü klappt zu Symbolen zusammen, statt sich über den Inhalt zu legen.
