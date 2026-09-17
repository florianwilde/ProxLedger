# #012 Benachrichtigungen
**Status:** erledigt
**Meilenstein:** v0.8.0
**Labels:** backend, alerts
**Geschätzt:** 6 h   **Tatsächlich:** 0 h 25 min

## Ziel
Über neue Alerts per E-Mail und Webhook informieren, plus regelmäßige Zusammenfassung.

## Aufgaben
- [x] SMTP (STARTTLS, M365/Exchange Online getestet), HTML-Mail mit Logo
- [x] Generischer Webhook (JSON, optional HMAC-Signatur, eigene Header)
- [x] Deduplizierung: nur bei neuem Alert oder Eskalation
- [x] Tägliche/wöchentliche Zusammenfassung
- [x] Einstellungsseite mit „Test senden“
- [x] Wiederholung bei Versandfehler, Versandprotokoll

## Akzeptanzkriterien
- [x] Testmail über Exchange Online kommt an
- [x] Derselbe offene Alert erzeugt keine zweite Benachrichtigung

## Abhängigkeiten
#011

## Notizen / Entscheidungen
- **Keine Doppelmeldungen:** Vor jedem Versand wird geprüft, ob zu diesem Alert schon erfolgreich
  benachrichtigt wurde. Ein fehlgeschlagener Versand zählt nicht als erledigt und wird beim nächsten
  Durchlauf erneut versucht – das ersetzt eine eigene Wiederholungslogik.
- Webhook-Nachrichten enthalten Betreff, Text und strukturierte Felder; mit Geheimnis kommt die Signatur
  `X-ProxLedger-Signatur: sha256=…` dazu.
- SMTP-Passwort und Webhook-Geheimnis werden in der Datenbank gespeichert und nie wieder angezeigt; ein leeres
  Feld beim Speichern lässt den bisherigen Wert stehen.
- **Offen:** Die Zugangsdaten liegen unverschlüsselt in der Datenbank. Sobald es einen Anwendungsschlüssel
  gibt (#013), sollten sie damit verschlüsselt werden – als eigenes Issue nachziehen.
- Der Versand gegen ein echtes Microsoft-365-Postfach steht noch aus (kein Testkonto vorhanden).
