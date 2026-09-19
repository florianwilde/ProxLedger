# #030 netbird Reverse Proxy in die Anleitung
**Status:** erledigt
**Meilenstein:** v0.19.1
**Labels:** doku
**Geschätzt:** 1 h   **Tatsächlich:** 0 h 20 min

## Ziel
netbird bringt seit v0.65 einen eigenen Reverse Proxy mit (Beta), v0.72 ergänzte private Dienste.
Damit entfällt ein zusätzlicher nginx – das gehört in die Anleitung, weil es der kürzeste Weg zu
HTTPS ist, wenn netbird ohnehin im Einsatz ist.

## Aufgaben
- [x] Weg B: netbird Reverse Proxy – Dienst anlegen, Zertifikat, Einstellungen
- [x] Alter netbird-Abschnitt wird Weg C (ohne Proxy)
- [x] Entscheidungstabelle, welcher Weg wofür taugt
- [x] Beta-Einschränkungen benennen (kein Rosenpass; selbst gehostet nur mit Traefik)

## Der wichtigste Hinweis
Die Absicherung eines Dienstes (SSO, Passwort, PIN) gilt für den **ganzen** Dienst – also auch für
`/api/agent`. Die Agents weisen sich mit eigenem Token aus und können sich nirgends anmelden; eine
SSO-Hürde davor lässt alle Hosts stumm ins Leere melden, bis der Zwischenspeicher voll ist.

Zwei brauchbare Auswege stehen in der Anleitung: zwei Dienste (Oberfläche mit SSO, Agents ohne) oder
ein privater Dienst, der nur aus dem netbird-Netz erreichbar ist.

## Quellen
- <https://docs.netbird.io/manage/reverse-proxy>
- <https://netbird.io/knowledge-hub/reverse-proxy>
- <https://netbird.io/knowledge-hub/netbird-only-private-services>
