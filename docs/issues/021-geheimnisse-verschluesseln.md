# #021 Zugangsdaten verschlüsselt speichern
**Status:** offen
**Meilenstein:** v0.9.0
**Labels:** sicherheit
**Geschätzt:** 2 h   **Tatsächlich:** –

## Ziel
SMTP-Passwort und Webhook-Geheimnis liegen derzeit im Klartext in der Datenbank. Wer ein Backup liest,
liest sie mit. Sie sollen mit einem Anwendungsschlüssel verschlüsselt werden.

## Aufgaben
- [ ] Anwendungsschlüssel aus `APP_SECRET` ableiten (scrypt), Pflichtangabe beim Start prüfen
- [ ] Hilfsfunktionen `verschluesseln`/`entschluesseln` (AES-256-GCM mit zufälligem Nonce)
- [ ] Bestehende Kanäle bei der ersten Verwendung umschlüsseln
- [ ] Gleiches Verfahren für künftige Geheimnisse (OIDC-Client-Secret aus #013)
- [ ] Hinweis im README: Schlüssel sichern, sonst sind die Geheimnisse verloren

## Akzeptanzkriterien
- [ ] In der Datenbank steht kein Klartext-Passwort mehr
- [ ] Ohne `APP_SECRET` startet die Anwendung nicht
- [ ] Ein Backup ohne Schlüssel gibt die Zugangsdaten nicht preis

## Abhängigkeiten
#012, #013

## Notizen / Entscheidungen
- Aufgefallen bei #012: Der Versand funktioniert, aber die Ablage der Zugangsdaten ist zu offen.
