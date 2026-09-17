# #004 Agent-API
**Status:** erledigt
**Meilenstein:** v0.1.0
**Labels:** backend, api, sicherheit
**Geschätzt:** 6 h   **Tatsächlich:** 0 h 20 min

## Ziel
Getrennte, abgesicherte API unter `/api/agent/v1`, über die sich Agents registrieren und Reports abliefern.

## Aufgaben
- [x] Token-Bibliothek: Erzeugung (Präfix `plx_e_`/`plx_h_`), SHA-256-Hash, Prüfung, Widerruf, `lastUsedAt`
- [x] `POST /enroll`: Enrollment-Token prüfen (Ablauf, Nutzungen), Host anlegen oder Neuinstallation erkennen, Host-Token ausgeben, optionale Kunden-/Standort-Zuordnung
- [x] `POST /report`: zod-Schema (alle Felder nullable), idempotent über `reportId`, Transaktion (Report, Stammdaten, Key-Historie, Server-ID-Historie, Laufzeitvorschlag)
- [x] `GET /ping`
- [x] Rate-Limiting (pro IP und Token), `429` mit `Retry-After`
- [x] Einheitliche Fehlerantworten (JSON), kein Stacktrace nach außen
- [x] Tests: Auth (fehlend/falsch/widerrufen/abgelaufen), Validierung, Idempotenz, Key-Wechsel, Server-ID-Wechsel, Laufzeitvorschlag, Rate-Limit

## Akzeptanzkriterien
- [x] Report mit ausschließlich `null`-Feldern (außer Pflicht-Metadaten) wird angenommen
- [x] Tokens liegen nur gehasht in der DB
- [x] UI-Session-Cookies werden von der Agent-API ignoriert
- [x] Alle Tests grün

## Abhängigkeiten
#003

## Notizen / Entscheidungen
- Endpunkte: `POST /api/agent/v1/enroll`, `POST /api/agent/v1/report`, `GET /api/agent/v1/ping`.
- Antworten enthalten `agentVersion`, damit der Agent ein Update erkennen kann (#005).
- Nachgesendete ältere Reports werden gespeichert, überschreiben den aktuellen Hoststand aber nicht.
- Ein Report mit neuem `nextduedate` legt automatisch eine Laufzeit im Status VORSCHLAG an.
- Die Auslieferung von `install.sh` und `agent.sh` gehört zu #005.
