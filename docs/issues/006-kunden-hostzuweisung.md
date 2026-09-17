# #006 Kunden, Standorte und Hostzuweisung
**Status:** erledigt
**Meilenstein:** v0.3.0
**Labels:** ui, backend
**Geschätzt:** 6 h   **Tatsächlich:** 0 h 35 min

## Ziel
Kunden und Standorte pflegen, neu registrierte Hosts schnell Kunden zuweisen und Enrollment-Tokens verwalten.

## Aufgaben
- [x] Kunden anlegen/bearbeiten/löschen (Name, Kundennummer, Ansprechpartner, E-Mail, Notizen)
- [x] Standorte je Kunde
- [x] Seite „Nicht zugeordnete Hosts“ mit Mehrfachauswahl und Schnellzuweisung (Kunde + Standort)
- [x] Callout auf dem Dashboard, solange nicht zugeordnete Hosts existieren
- [x] Enrollment-Tokens: erzeugen (Ablauf, max. Nutzungen, optional Kunde/Standort), anzeigen (einmalig), widerrufen; Install-One-Liner zum Kopieren
- [x] Host-Tokens widerrufen
- [x] Audit-Log-Einträge für alle Änderungen

## Akzeptanzkriterien
- [x] Mehrere Hosts lassen sich in einem Schritt zuweisen
- [x] Mit kundengebundenem Enrollment-Token registrierte Hosts sind sofort zugeordnet
- [x] Widerrufener Token wird von der Agent-API abgewiesen

## Abhängigkeiten
#002, #004

## Notizen / Entscheidungen
- Das Dashboard wurde gleich mit auf die Datenbank umgestellt (eigentlich #009). Sonst hätte eine gerade
  vorgenommene Zuweisung dort weiter als „nicht zugeordnet“ gestanden – ein irreführender Zwischenzustand.
- Die Zuweisungslogik liegt als Service (`src/server/services/zuweisung.ts`) neben der Server Action,
  damit sie ohne Next.js-Laufzeit testbar ist.
- Alle Dashboard-Seiten rendern dynamisch (`force-dynamic`); beim Vorrendern öffnete sonst jeder Build-Worker
  eigene Datenbankverbindungen und der Build brach mit „TooManyConnections“ ab.
- Noch auf Beispieldaten: Host-Tabelle, Host-Detail, Rechnungen und Jahresbahn (folgen in #007 bis #009).
