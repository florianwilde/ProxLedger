# #033 Abmelden führte auf die Lausch-Adresse
**Status:** erledigt
**Meilenstein:** v0.20.1
**Labels:** bug, deployment
**Geschätzt:** 1 h   **Tatsächlich:** 0 h 30 min

## Auslöser
Im Docker-Betrieb führte **Abmelden** auf `0.0.0.0:3000/login` – eine Adresse, die kein Browser
aufrufen kann (`ERR_ADDRESS_INVALID`).

## Ursache
Hausgemacht, und zwar in #031: Für die Zustandsprüfung des Containers wurde `ENV HOSTNAME=0.0.0.0`
gesetzt, damit der Server auf allen Schnittstellen lauscht. Next.js macht eine Weiterleitung aus
einer Server Action aber **serverseitig absolut** und nimmt dafür genau diese Adresse. Vorher stand
dort der Containername (`http://0a5963a591df:3000/`) – derselbe Fehler, nur weniger auffällig.

Betroffen waren alle Weiterleitungen, die nicht über eine `Request` liefen: Abmelden, die Prüfung in
`sitzungErforderlich` und das Löschen eines Kunden.

## Behebung
- Neuer Helfer `eigenerPfad()` in `src/lib/adresse.ts`: baut die Adresse aus Einstellung, `APP_URL`
  oder den Kopfzeilen der Anfrage – nie aus der Lausch-Adresse.
- `oeffentlicheBasis()` übergeht unbrauchbare Angaben (`0.0.0.0`, `::`) jetzt ausdrücklich, statt sie
  zu übernehmen. Eine falsch eingetragene Adresse macht das Dashboard damit nicht unbenutzbar.
- Zwei zusätzliche Tests.

## Prüfung
Gegen einen Docker-Stapel durchgespielt: Mit `APP_URL=http://0.0.0.0:3000` in der `.env` – also der
Fehlkonfiguration – leitet die Anwendung jetzt auf den tatsächlich aufgerufenen Namen
(`http://localhost:3003/login`) statt auf die Lausch-Adresse.

## Lehre
Der Fix für die Zustandsprüfung hat einen zweiten Fehler sichtbar gemacht, der vorher nur anders
aussah. Weiterleitungen gehören grundsätzlich aus der **konfigurierten** Adresse gebaut, nicht aus
dem, was der Server zufällig über sich selbst weiß.
