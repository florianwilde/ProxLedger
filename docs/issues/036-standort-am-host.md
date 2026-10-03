# #036 Standort am Host setzen
**Status:** erledigt
**Meilenstein:** v0.21.0
**Labels:** bug, ui
**Geschätzt:** 1 h   **Tatsächlich:** 0 h 30 min

## Auslöser
„Den Standort bei den Hosts kann man nicht einstellen.“

## Was wirklich los war
Schlimmer als gemeldet: Das Formular in der Host-Detailansicht sendete **nur** den Kunden. Die Aktion
`hostKundeSetzen` las aber auch `standortId` – und bekam nichts. Jede Kundenzuweisung hat damit den
Standort **stillschweigend gelöscht**. Setzen ging nur beim Ausrollen über die Sammelzuweisung unter
*Hosts → Nicht zugeordnet*; danach war er beim nächsten Speichern wieder weg.

## Behebung
- Kunde und Standort in **einem** Formular, die Standortliste richtet sich nach dem gewählten Kunden
- Wechselt der Kunde, wird die Standortauswahl zurückgesetzt statt stehen zu bleiben
- Hat ein Kunde keine Standorte, sagt das Formular es, statt eine leere Auswahl anzubieten
- Die Aktion prüft jetzt, dass der Standort zum Kunden gehört, und verwirft ihn sonst – eine falsche
  Zuordnung wäre schlimmer als keine
- Vier Tests, darunter der Fall „Standort eines anderen Kunden“
