# #013 Authentifizierung und Audit-Log
**Status:** offen
**Meilenstein:** v0.9.0
**Labels:** sicherheit
**Geschätzt:** 6 h   **Tatsächlich:** –

## Ziel
Zugriff auf das Dashboard absichern und Änderungen nachvollziehbar machen.

## Aufgaben
- [ ] Auth.js: OIDC (authentik), lokaler Admin als Fallback (argon2id)
- [ ] Middleware schützt alle UI-Routen, nicht die Agent-API
- [ ] Login-Seite im AdminLTE-Stil mit Logo
- [ ] Rollen admin / readonly
- [ ] Audit-Log-Ansicht mit Filter
- [ ] Login-Rate-Limit, Security-Header

## Akzeptanzkriterien
- [ ] Ohne Login ist keine UI-Seite erreichbar
- [ ] Login über authentik funktioniert; lokaler Admin auch bei ausgefallenem OIDC
- [ ] readonly-Benutzer kann nichts ändern

## Abhängigkeiten
#006

## Notizen / Entscheidungen
