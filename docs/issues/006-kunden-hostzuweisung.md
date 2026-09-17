# #006 Kunden, Standorte und Hostzuweisung
**Status:** offen
**Meilenstein:** v0.3.0
**Labels:** ui, backend
**Geschätzt:** 6 h   **Tatsächlich:** –

## Ziel
Kunden und Standorte pflegen, neu registrierte Hosts schnell Kunden zuweisen und Enrollment-Tokens verwalten.

## Aufgaben
- [ ] Kunden anlegen/bearbeiten/löschen (Name, Kundennummer, Ansprechpartner, E-Mail, Notizen)
- [ ] Standorte je Kunde
- [ ] Seite „Nicht zugeordnete Hosts“ mit Mehrfachauswahl und Schnellzuweisung (Kunde + Standort)
- [ ] Callout auf dem Dashboard, solange nicht zugeordnete Hosts existieren
- [ ] Enrollment-Tokens: erzeugen (Ablauf, max. Nutzungen, optional Kunde/Standort), anzeigen (einmalig), widerrufen; Install-One-Liner zum Kopieren
- [ ] Host-Tokens widerrufen
- [ ] Audit-Log-Einträge für alle Änderungen

## Akzeptanzkriterien
- [ ] Mehrere Hosts lassen sich in einem Schritt zuweisen
- [ ] Mit kundengebundenem Enrollment-Token registrierte Hosts sind sofort zugeordnet
- [ ] Widerrufener Token wird von der Agent-API abgewiesen

## Abhängigkeiten
#002, #004

## Notizen / Entscheidungen
