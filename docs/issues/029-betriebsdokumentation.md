# #029 Einrichtungsdokumentation
**Status:** erledigt
**Meilenstein:** v0.19.0
**Labels:** doku
**Geschätzt:** 3 h   **Tatsächlich:** 0 h 40 min

## Ziel
Anleitungen für alles, was rund um ProxLedger eingerichtet wird: HTTPS, OIDC mit authentik, Sicherung –
und die richtige Reihenfolge, in der das geschehen muss.

## Aufgaben
- [x] `docs/betrieb/inbetriebnahme.md` – von null zum meldenden Host
- [x] `docs/betrieb/reverse-proxy.md` – nginx Proxy Manager und netbird
- [x] `docs/betrieb/authentik.md` – OIDC Schritt für Schritt, mit Fehlerbildern
- [x] `docs/betrieb/sicherung.md` – sichern und **zurückspielen**
- [x] Verweise aus README und Handbuch

## Beim Schreiben gefunden
Zwei Stellen taugten für einen Betrieb hinter einem Reverse Proxy nicht:

1. Die **OIDC-Rückkehradresse** kam allein aus `APP_URL` und übersah die Dashboard-Adresse aus den
   Einstellungen. Wer nur letztere gesetzt hatte, bekam vom Anbieter einen *Redirect URI Error*.
2. Beim **Einlösen des Codes** wurde die Adresse der eingehenden Anfrage verwendet – hinter einem
   Proxy also die interne. Der Anbieter hat aber die öffentliche hinterlegt; der Tausch wäre
   gescheitert. Jetzt wird dieselbe öffentliche Adresse gebildet wie für die Weiterleitungen.

## Entscheidung
Die Reihenfolge steht bewusst am Anfang der Inbetriebnahme: **Adresse festlegen, dann Passkeys und
Agents.** Ein Passkey gilt nur für die Domäne, unter der er entstanden ist, und die Adresse steckt im
Installations-Einzeiler. Wer das übergeht, macht beides zweimal.
