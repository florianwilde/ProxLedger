# #024 Härtung nach OWASP
**Status:** erledigt
**Meilenstein:** v0.15.0
**Labels:** security, backend
**Geschätzt:** 4 h   **Tatsächlich:** 0 h 45 min

## Ziel
Vor der Freigabe als fertiges Produkt eine Durchsicht gegen die OWASP Top 10 – und die gefundenen
Lücken schließen, statt sie zu vermerken.

## Aufgaben
- [x] Zugriffskontrolle: jede Server Action prüft die Sitzung selbst, nicht nur der Proxy
- [x] Sitzungen widerrufbar machen (gesperrtes Konto, neues Passwort)
- [x] Login-CSRF: Herkunft der Anmeldung prüfen
- [x] Content-Security-Policy mit Nonce je Anfrage
- [x] Abhängigkeiten ohne bekannte Schwachstellen (`npm audit`)
- [x] Benutzerverwaltung auf der Kommandozeile (sperren, entsperren, Passwort)
- [x] `docs/sicherheit.md` mit der Zuordnung zu den OWASP Top 10
- [x] Tests für Sitzungsurteil und Herkunftsprüfung

## Gefunden und behoben
1. **Server Actions waren nur durch `proxy.ts` geschützt.** Keine einzige Aktion prüfte selbst. Der
   Proxy greift zwar auch bei POST, aber eine einzige Schicht ist zu wenig für 27 schreibende Endpunkte.
2. **Login-CSRF möglich:** Der Anmelde-Endpunkt ist ein gewöhnliches Formular und prüfte die Herkunft
   nicht. Eine fremde Seite hätte jemanden in ein untergeschobenes Konto anmelden können.
3. **Keine CSP.** Jetzt mit Nonce und `strict-dynamic`.
4. **Sitzungen ließen sich nicht beenden.** Ein gesperrtes Konto arbeitete bis zu zwölf Stunden weiter.
5. **`npm audit`: 4 hohe Meldungen** in `mysql2` und `deepmerge-ts` – beides Beiwerk von Prisma. Über
   `overrides` angehoben statt Prisma zurückzustufen; danach keine Meldung mehr.

## Bewusst nicht umgesetzt
- **Rollen:** Wer angemeldet ist, darf alles. Für ein internes Werkzeug vertretbar, in `docs/sicherheit.md` vermerkt.
- **Zwei-Faktor-Anmeldung:** Wer sie braucht, nutzt OIDC.
- Die Einschränkung der OIDC-Anmeldung (erlaubte Domänen, automatisches Anlegen) kommt mit #025.
