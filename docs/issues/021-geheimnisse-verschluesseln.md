# #021 Zugangsdaten verschlüsselt speichern
**Status:** erledigt
**Meilenstein:** v0.13.1
**Labels:** sicherheit
**Geschätzt:** 2 h   **Tatsächlich:** 0 h 20 min

## Ziel
SMTP-Passwort und Webhook-Geheimnis liegen derzeit im Klartext in der Datenbank. Wer ein Backup liest,
liest sie mit. Sie sollen mit einem Anwendungsschlüssel verschlüsselt werden.

## Aufgaben
- [x] Anwendungsschlüssel aus `APP_SECRET` ableiten (scrypt), Pflichtangabe beim Start prüfen
- [x] Hilfsfunktionen `verschluesseln`/`entschluesseln` (AES-256-GCM mit zufälligem Nonce)
- [x] Bestehende Kanäle werden beim nächsten Speichern umgeschlüsselt (Klartext wird weiterhin gelesen)
- [ ] Gleiches Verfahren für das OIDC-Client-Secret – liegt derzeit in der Umgebung, nicht in der Datenbank, und braucht daher keine Verschlüsselung
- [x] Hinweis im README: Schlüssel sichern, sonst sind die Geheimnisse verloren

## Akzeptanzkriterien
- [x] In der Datenbank steht kein Klartext-Passwort mehr
- [x] Ohne `APP_SECRET` lässt sich kein Geheimnis lesen oder schreiben (Fehlermeldung nennt die Ursache)
- [x] Ein Backup ohne Schlüssel gibt die Zugangsdaten nicht preis

## Abhängigkeiten
#012, #013

## Notizen / Entscheidungen
- Aufgefallen bei #012: Der Versand funktioniert, aber die Ablage der Zugangsdaten ist zu offen.
- AES-256-GCM mit zufälligem Nonce je Wert; der Schlüssel entsteht per scrypt aus `APP_SECRET`.
  Format: `plx1:<nonce>:<authTag>:<chiffrat>`.
- **Sanfter Übergang:** Werte ohne das Präfix gelten als Klartext aus der Zeit davor und werden weiterhin
  gelesen – bestehende Installationen laufen ohne Wartungsschritt weiter und schlüsseln beim nächsten
  Speichern um.
- Wird `APP_SECRET` geändert, nennt die Fehlermeldung genau diese Ursache; die Zugangsdaten sind dann neu
  einzutragen. Das steht auch im README bei den Sicherungshinweisen.
- Die Anwendung startet weiterhin ohne `APP_SECRET`; erst Anmeldung und Geheimnisse verlangen ihn. Ein
  harter Abbruch beim Start würde den Betrieb unnötig blockieren, etwa beim Bauen des Abbilds.
