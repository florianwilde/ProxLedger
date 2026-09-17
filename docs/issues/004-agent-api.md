# #004 Agent-API
**Status:** offen
**Meilenstein:** v0.1.0
**Labels:** backend, api, sicherheit
**Geschätzt:** 6 h   **Tatsächlich:** –

## Ziel
Getrennte, abgesicherte API unter `/api/agent/v1`, über die sich Agents registrieren und Reports abliefern.

## Aufgaben
- [ ] Token-Bibliothek: Erzeugung (Präfix `plx_e_`/`plx_h_`), SHA-256-Hash, Prüfung, Widerruf, `lastUsedAt`
- [ ] `POST /enroll`: Enrollment-Token prüfen (Ablauf, Nutzungen), Host anlegen oder Neuinstallation erkennen, Host-Token ausgeben, optionale Kunden-/Standort-Zuordnung
- [ ] `POST /report`: zod-Schema (alle Felder nullable), idempotent über `reportId`, Transaktion (Report, Stammdaten, Key-Historie, Server-ID-Historie, Laufzeitvorschlag)
- [ ] `GET /ping`
- [ ] Rate-Limiting (pro IP und Token), `429` mit `Retry-After`
- [ ] Einheitliche Fehlerantworten (JSON), kein Stacktrace nach außen
- [ ] Tests: Auth (fehlend/falsch/widerrufen/abgelaufen), Validierung, Idempotenz, Key-Wechsel, Server-ID-Wechsel, Laufzeitvorschlag, Rate-Limit

## Akzeptanzkriterien
- [ ] Report mit ausschließlich `null`-Feldern (außer Pflicht-Metadaten) wird angenommen
- [ ] Tokens liegen nur gehasht in der DB
- [ ] UI-Session-Cookies werden von der Agent-API ignoriert
- [ ] Alle Tests grün

## Abhängigkeiten
#003

## Notizen / Entscheidungen
