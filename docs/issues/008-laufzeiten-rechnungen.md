# #008 Laufzeiten und Rechnungen
**Status:** erledigt
**Meilenstein:** v0.5.0
**Labels:** ui, backend, buchhaltung
**Geschätzt:** 10 h   **Tatsächlich:** 0 h 35 min

## Ziel
Lizenzjahre mit Proxmox-Einkaufsrechnung und Kundenrechnung erfassen und den Status schnell pflegen.

## Aufgaben
- [x] Laufzeitvorschlag bei neuem `nextduedate` bestätigen/verwerfen
- [x] Laufzeit manuell anlegen/bearbeiten
- [x] Proxmox-Rechnung erfassen (auch Sammelrechnung über mehrere Laufzeiten), PDF-Upload
- [x] Kundenrechnung erfassen (auch Sammelrechnung), PDF-Upload
- [x] Marge pro Laufzeit, Kunde und Jahr berechnen
- [x] Rechnungsübersicht: alle Laufzeiten, Umschalter „Proxmox bezahlt“ / „Kundenrechnung erstellt“ direkt in der Zeile, Filter Offen/Erledigt/Alle, Kunde, Zeitraum
- [x] Sidebar-Badge offene Rechnungspunkte
- [x] Aufgaben-Card auf dem Dashboard mit echten Aktionen

## Akzeptanzkriterien
- [x] Umschalten in der Tabelle wirkt sofort und wird im Audit-Log protokolliert
- [x] Summen Einkauf/Verkauf/Marge stimmen mit Einzelwerten überein (Tests)
- [x] Nur PDF bis 10 MB wird angenommen

## Abhängigkeiten
#007

## Notizen / Entscheidungen
- **Sammelrechnungen ohne Extraschritt:** Wer bei einer zweiten Laufzeit dieselbe Rechnungsnummer einträgt,
  hängt sie als weitere Position an die bestehende Rechnung. Der Rechnungsbetrag ist immer die Summe der
  Positionen, wird also automatisch nachgeführt.
- Das Häkchen „Kundenrechnung erstellt“ legt bei fehlender Rechnung eine ohne Nummer an; Nummer und Betrag
  lassen sich später nachtragen, ohne dass eine zweite Rechnung entsteht.
- Das Erfassen einer Proxmox-Rechnung bestätigt einen Laufzeit-Vorschlag automatisch.
- PDFs werden unter ihrer Prüfsumme abgelegt (`UPLOAD_DIR`, Standard `./data/uploads`). Geprüft wird der
  Dateianfang, nicht der gemeldete Typ – eine umbenannte Datei wird abgelehnt. Dieselbe Datei belegt nur
  einmal Platz.
