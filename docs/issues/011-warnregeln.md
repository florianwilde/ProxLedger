# #011 Warnregeln
**Status:** erledigt
**Meilenstein:** v0.7.0
**Labels:** backend, alerts
**Geschätzt:** 8 h   **Tatsächlich:** 0 h 30 min

## Ziel
Konfigurierbare Warnregeln, die Alerts öffnen und automatisch schließen.

## Aufgaben
- [x] Regel-Engine: reine Funktionen, Fingerprint, Abgleich offen/neu/erledigt
- [x] Regeln: Ablauf 30/14/7, Status ≠ active, Sockets-Abweichung, keine Meldung 48 h, Server-ID geändert, Key mehrfach, Host ohne Kunde, Proxmox-Rechnung fällig, Kundenrechnung fehlt, Kundenrechnung unbezahlt nach X Tagen
- [x] Worker-Prozess mit Scheduler (stündlich) + Auswertung nach jedem Report
- [x] Einstellungsseite: Regeln aktivieren, Schwellwerte ändern
- [x] Warnglocke und Alert-Liste (offen/erledigt, quittieren)
- [x] Tests für jede Regel inkl. Grenzfälle

## Akzeptanzkriterien
- [x] Kein doppelter offener Alert für denselben Sachverhalt
- [x] Alerts schließen sich automatisch, wenn die Ursache behoben ist
- [x] Alle Regel-Tests grün

## Abhängigkeiten
#008

## Notizen / Entscheidungen
- Die Regeln sind reine Funktionen ohne Datenbankzugriff (`src/server/alerts/regeln.ts`); der Abgleich
  (`abgleich.ts`) öffnet, aktualisiert und schließt die Warnungen. Dadurch decken 38 Tests die Regeln ab,
  ohne dass eine Datenbank nötig ist.
- **Stufen als Teil des Fingerabdrucks:** `subscription-laeuft-ab:<host>:7`. Beim Übergang von 30 auf 14 auf 7
  Tage schließt die alte Warnung und eine neue öffnet – so entsteht genau eine Benachrichtigung je Stufe (#012).
- Ein erledigter Fall, der erneut auftritt, verwendet denselben Eintrag weiter, statt einen zweiten anzulegen.
- Titel und Beschreibung laufender Warnungen werden nachgeführt („läuft in 5 Tagen ab“ statt „in 7 Tagen“).
- Ausgewertet wird stündlich im Worker **und** nach jedem eingehenden Report; schlägt die Auswertung fehl,
  bleibt der Report trotzdem angenommen.
- Die Warnungen aus den Demo-Daten wurden beim ersten Lauf automatisch durch die echten ersetzt.
