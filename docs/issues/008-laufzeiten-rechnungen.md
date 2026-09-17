# #008 Laufzeiten und Rechnungen
**Status:** offen
**Meilenstein:** v0.5.0
**Labels:** ui, backend, buchhaltung
**Geschätzt:** 10 h   **Tatsächlich:** –

## Ziel
Lizenzjahre mit Proxmox-Einkaufsrechnung und Kundenrechnung erfassen und den Status schnell pflegen.

## Aufgaben
- [ ] Laufzeitvorschlag bei neuem `nextduedate` bestätigen/verwerfen
- [ ] Laufzeit manuell anlegen/bearbeiten
- [ ] Proxmox-Rechnung erfassen (auch Sammelrechnung über mehrere Laufzeiten), PDF-Upload
- [ ] Kundenrechnung erfassen (auch Sammelrechnung), PDF-Upload
- [ ] Marge pro Laufzeit, Kunde und Jahr berechnen
- [ ] Rechnungsübersicht: alle Laufzeiten, Umschalter „Proxmox bezahlt“ / „Kundenrechnung erstellt“ direkt in der Zeile, Filter Offen/Erledigt/Alle, Kunde, Zeitraum
- [ ] Sidebar-Badge offene Rechnungspunkte
- [ ] Aufgaben-Card auf dem Dashboard mit echten Aktionen

## Akzeptanzkriterien
- [ ] Umschalten in der Tabelle wirkt sofort und wird im Audit-Log protokolliert
- [ ] Summen Einkauf/Verkauf/Marge stimmen mit Einzelwerten überein (Tests)
- [ ] Nur PDF bis 10 MB wird angenommen

## Abhängigkeiten
#007

## Notizen / Entscheidungen
