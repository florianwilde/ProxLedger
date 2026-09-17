# #012 Benachrichtigungen
**Status:** offen
**Meilenstein:** v0.8.0
**Labels:** backend, alerts
**Geschätzt:** 6 h   **Tatsächlich:** –

## Ziel
Über neue Alerts per E-Mail und Webhook informieren, plus regelmäßige Zusammenfassung.

## Aufgaben
- [ ] SMTP (STARTTLS, M365/Exchange Online getestet), HTML-Mail mit Logo
- [ ] Generischer Webhook (JSON, optional HMAC-Signatur, eigene Header)
- [ ] Deduplizierung: nur bei neuem Alert oder Eskalation
- [ ] Tägliche/wöchentliche Zusammenfassung
- [ ] Einstellungsseite mit „Test senden“
- [ ] Wiederholung bei Versandfehler, Versandprotokoll

## Akzeptanzkriterien
- [ ] Testmail über Exchange Online kommt an
- [ ] Derselbe offene Alert erzeugt keine zweite Benachrichtigung

## Abhängigkeiten
#011

## Notizen / Entscheidungen
