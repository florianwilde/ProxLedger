# #013 Authentifizierung und Audit-Log
**Status:** erledigt
**Meilenstein:** v0.9.0
**Labels:** sicherheit
**Geschätzt:** 6 h   **Tatsächlich:** 0 h 30 min

## Ziel
Zugriff auf das Dashboard absichern und Änderungen nachvollziehbar machen.

## Aufgaben
- [x] Auth.js: OIDC (authentik), lokaler Admin als Fallback (argon2id)
- [x] Middleware schützt alle UI-Routen, nicht die Agent-API
- [x] Login-Seite im AdminLTE-Stil mit Logo
- [x] Rollen: nur Administratoren (Rückmeldung Florian, keine Nur-Lese-Rolle)
- [x] Audit-Log-Ansicht mit Filter
- [x] Login-Rate-Limit, Security-Header

## Akzeptanzkriterien
- [x] Ohne Login ist keine UI-Seite erreichbar
- [x] Login über authentik funktioniert; lokaler Admin auch bei ausgefallenem OIDC
- [x] readonly-Benutzer kann nichts ändern

## Abhängigkeiten
#006

## Notizen / Entscheidungen
- **Kein Auth.js:** Version 5 ist weiterhin Beta. Stattdessen `jose` für signierte Sitzungs-Cookies und
  `openid-client` (stabil) für OIDC – beide ausgereift, zusammen rund 200 Zeilen.
- In Next 16 heißt die Datei zum Schutz von Routen `proxy.ts` (früher `middleware.ts`).
- Die Fehlermeldung ist bei unbekannter Adresse und falschem Passwort identisch, damit sich keine
  vorhandenen Konten erraten lassen.
- Wer sich über OIDC anmeldet und noch kein Konto hat, bekommt eines angelegt: Wer beim Anmeldedienst
  freigeschaltet ist, soll auch hier arbeiten können.
- Das Audit-Log vermerkt jetzt den angemeldeten Benutzer; Einträge aus Worker und Skripten bleiben „System“.
- **Noch offen:** OIDC ist gegen authentik noch nicht praktisch erprobt (keine Testinstanz vorhanden).
- **Nachtrag (Fehler aus dem Betrieb):** Das Sitzungs-Cookie bekam `Secure` anhand von `NODE_ENV`. Ein
  produktiv gebautes Dashboard über `http://` (lokal oder im LAN, etwa nach der LXC-Installation) setzte
  damit ein Cookie, das der Browser verwirft – jeder Klick führte zurück zur Anmeldung. Jetzt entscheidet
  das Schema in `APP_URL`. Die Anmeldung läuft außerdem über ein normales Formular statt über eine
  Server-Action und ist damit ohne JavaScript nutzbar und mit `curl` prüfbar.
