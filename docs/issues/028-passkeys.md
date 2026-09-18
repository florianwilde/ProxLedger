# #028 Anmeldung mit Passkeys
**Status:** erledigt
**Meilenstein:** v0.18.0
**Labels:** security, backend, ui
**Geschätzt:** 4 h   **Tatsächlich:** 0 h 45 min

## Ziel
Passkeys (WebAuthn) als **gleichwertiger** Anmeldeweg neben Passwort und OIDC – passwortlos, mit
Fingerabdruck, Gesicht, PIN oder Sicherheitsschlüssel.

## Aufgaben
- [x] `@simplewebauthn/server` und `@simplewebauthn/browser`
- [x] Datenmodell `Passkey` (mehrere je Konto)
- [x] Registrierung und Anmeldung als Endpunkte, Aufgabe („challenge“) in einem kurzlebigen Cookie
- [x] Seite *Meine Passkeys* mit Anlegen und Entfernen
- [x] Knopf „Mit Passkey anmelden“ auf der Anmeldeseite
- [x] Hinweis, wenn die Adresse kein HTTPS hat

## Entscheidungen
- **Keine Liste erlaubter Schlüssel bei der Anmeldung.** Der Browser bietet selbst an, was zu dieser
  Seite passt. Sonst müsste die Seite vorher verraten, welche Passkeys zu einem Konto gehören – das
  wäre ein Weg, Konten auszuspähen.
- **Fehlermeldung bei der Anmeldung bewusst unscharf** („Anmeldung mit diesem Passkey nicht
  möglich“). Ob es den Schlüssel gibt, geht einen Unbekannten nichts an.
- **Die Aufgabe liegt in einem `SameSite=strict`-Cookie mit fünf Minuten Gültigkeit**, nicht in der
  Datenbank. Sie gilt nur für diesen Browser und diesen Versuch.
- **`rpID` und `origin` kommen aus der öffentlichen Adresse** (Einstellung, sonst `APP_URL`, sonst
  Proxy-Kopfzeilen). Ein Passkey ist an die Domäne gebunden; steht dort die falsche Adresse, lehnt
  der Browser wortlos ab.
- Passwort und OIDC bleiben bestehen. Ein Passkey, der im kaputten Telefon liegt, darf niemanden
  aussperren.

## Grenze
Ein Passkey gilt nur für die Adresse, unter der er angelegt wurde. Beim Umzug von `http://server:3000`
auf `https://proxledger.firma.de` müssen alle Passkeys neu registriert werden – im Handbuch vermerkt.
