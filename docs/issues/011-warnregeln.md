# #011 Warnregeln
**Status:** offen
**Meilenstein:** v0.7.0
**Labels:** backend, alerts
**Geschätzt:** 8 h   **Tatsächlich:** –

## Ziel
Konfigurierbare Warnregeln, die Alerts öffnen und automatisch schließen.

## Aufgaben
- [ ] Regel-Engine: reine Funktionen, Fingerprint, Abgleich offen/neu/erledigt
- [ ] Regeln: Ablauf 30/14/7, Status ≠ active, Sockets-Abweichung, keine Meldung 48 h, Server-ID geändert, Key mehrfach, Host ohne Kunde, Proxmox-Rechnung fällig, Kundenrechnung fehlt, Kundenrechnung unbezahlt nach X Tagen
- [ ] Worker-Prozess mit Scheduler (stündlich) + Auswertung nach jedem Report
- [ ] Einstellungsseite: Regeln aktivieren, Schwellwerte ändern
- [ ] Warnglocke und Alert-Liste (offen/erledigt, quittieren)
- [ ] Tests für jede Regel inkl. Grenzfälle

## Akzeptanzkriterien
- [ ] Kein doppelter offener Alert für denselben Sachverhalt
- [ ] Alerts schließen sich automatisch, wenn die Ursache behoben ist
- [ ] Alle Regel-Tests grün

## Abhängigkeiten
#008

## Notizen / Entscheidungen
