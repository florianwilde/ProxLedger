# #044 Eigene Hosts ohne Weiterberechnung
**Status:** erledigt
**Meilenstein:** v0.26.0
**Labels:** backend, ui, alerts
**Geschätzt:** 2 h   **Tatsächlich:** 0 h 40 min

## Auslöser
„Ich habe mich auch selbst als Kunden angelegt, da ich ja auch Hosts habe. Aber mir selbst schreibe
ich ja keine E-Mails.“

## Das Problem
Die eigenen Hosts brauchen einen Kunden – sonst stehen sie unter *Nicht zugeordnet* und lösen die
Warnung „Host ohne Kunde“ aus. Als gewöhnlicher Kunde erzeugen sie aber lauter Aufgaben, die es nicht
gibt: „Kundenrechnung erstellen“, „Kundenrechnung unbezahlt“, dazu eine negative Marge in jeder
Summe, weil dem Einkauf kein Verkauf gegenübersteht.

## Behebung
Kennzeichen **Eigenbedarf** am Kunden. Für dessen Hosts gilt:

| | Verhalten |
|---|---|
| Proxmox-Rechnung | unverändert – die Kosten fallen ja an |
| Kundenrechnung | entfällt; das Formular wird durch eine Erklärung ersetzt |
| Warnungen „Kundenrechnung fehlt / unbezahlt“ | entfallen |
| Warnung „Kunde hat bezahlt – Einkauf offen“ | entfällt |
| Aufgabe „Kundenrechnung erstellen“ | entfällt |
| Marge | bleibt leer statt negativ |
| Summen | Einkauf zählt mit, Verkauf und Marge nicht |

Dazu ein Abzeichen in der Kundenliste und auf der Laufzeit.

## Entscheidung
Die Einkaufsseite bleibt vollständig erhalten. Eigene Hosts kosten echtes Geld, und die Rechnung von
Proxmox will bezahlt werden – nur die Weiterberechnung entfällt.

Die Alternative wäre gewesen, eigene Hosts ohne Kunden zu lassen und die Warnung „Host ohne Kunde“
abzuschalten. Dann fehlten sie aber in jeder Auswertung nach Kunde, und der Einkauf ließe sich nicht
mehr zuordnen.
