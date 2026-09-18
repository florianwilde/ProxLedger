# Sicherheit

Dieses Dokument hält fest, was ProxLedger gegen die üblichen Angriffe tut – und was es **nicht** tut.
Die Gliederung folgt den OWASP Top 10 (2021).

## A01 – Fehlerhafte Zugriffskontrolle

- `src/proxy.ts` schickt jede Anfrage ohne gültige Sitzung zur Anmeldung. Öffentlich sind nur die
  Anmeldung, die Agent-API (eigene Tokens), die Gesundheitsprüfung, die beiden Agent-Skripte und die Symbole.
- **Jede Server Action prüft zusätzlich selbst** (`sitzungErforderlich()`). Server Actions sind eigene
  Endpunkte; eine einzige Schutzschicht davor wäre zu wenig, falls der Musterausdruck im Proxy je
  danebengreift.
- Die Prüfung geht in die Datenbank: Ein gesperrtes Konto oder ein Widerruf beendet laufende Sitzungen
  sofort (`npm run benutzer -- sperren <email>`), statt bis zum Ablauf des Tokens zu warten.
- Die Anmeldung prüft den `Origin`, damit keine fremde Seite jemanden unbemerkt in ein untergeschobenes
  Konto anmeldet (Login-CSRF). Für Server Actions erledigt das Next.js selbst.

**Rollen** (#027): Administrator, Techniker und Kunde. Jede Aktion nennt das Recht, das sie verlangt;
die Rechte stehen an einer Stelle (`src/server/auth/rollen.ts`). Kundenkonten sind an einen Kunden
gebunden, und die Einschränkung sitzt in den Abfragen – nicht in der Anzeige. Einkaufspreise und Marge
werden für sie schon beim Abfragen entfernt, stehen also nicht im ausgelieferten HTML.

**Weiterhin nicht vorhanden:** Mandantenfähigkeit im eigentlichen Sinn. Mehrere Systemhäuser in einer
Installation wären ein Umbau, kein Anbau.

## A02 – Kryptografische Fehler

- Passwörter: argon2id (`@node-rs/argon2`), keine eigene Krypto.
- Sitzungen: signiertes JWT (HS256) aus `APP_SECRET`, 12 Stunden gültig, Cookie `httpOnly`, `sameSite=lax`
  und `secure`, sobald `APP_URL` auf `https://` steht.
- Zugangsdaten für SMTP und Webhooks liegen AES-256-GCM-verschlüsselt in der Datenbank
  (`src/lib/geheimnisse.ts`); der Schlüssel wird aus `APP_SECRET` abgeleitet.
- Agent- und Enrollment-Tokens werden nur als SHA-256-Hash gespeichert. Das ist hier richtig und nicht
  zu schwach: Die Tokens sind 32 Byte Zufall, es gibt nichts zu raten.

**Wichtig:** `APP_SECRET` ist der Generalschlüssel. Geht er verloren, sind alle Sitzungen ungültig und die
gespeicherten Zugangsdaten unlesbar. Er gehört in die Sicherung.

## A03 – Injektion

- Datenbankzugriffe ausschließlich über Prisma mit gebundenen Werten; kein `$queryRawUnsafe` im Projekt.
- Ausgaben maskiert React selbst.
- Zusätzlich greift eine Content-Security-Policy mit frischem Nonce je Anfrage und `strict-dynamic`
  (`src/proxy.ts`). Eingeschleustes `<script>` – etwa über einen manipulierten Hostnamen aus einer
  Proxmox-Ausgabe – läuft damit nicht.
- Der Agent baut sein JSON mit einer eigenen Maskierung; Sonderzeichen aus Proxmox-Ausgaben sind als
  Testfall hinterlegt.

## A04 – Unsicheres Design

- Push-Modell: Das Dashboard braucht **keinen** Zugang zu den Proxmox-Hosts. Es gibt keine gespeicherten
  root-Zugänge, die abhandenkommen könnten – die Hosts melden von sich aus.
- Der Agent sendet nur Statusangaben (Subscription, Version, Sockel, IPs). Keine Gastliste, keine Daten.
- Enrollment-Tokens sind befristet und in der Zahl der Nutzungen begrenzt.

## A05 – Sicherheitsrelevante Fehlkonfiguration

- Kopfzeilen: `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`,
  `Strict-Transport-Security` (`next.config.ts`) sowie die CSP aus dem Proxy.
- Die Anwendung startet nicht mit zu kurzem `APP_SECRET`.
- Im Container läuft die Anwendung als unprivilegierter Benutzer; Anhänge werden mit Rechten 640 abgelegt.
- Fehlermeldungen nennen keine Einzelheiten: Bei der Anmeldung steht dieselbe Meldung für „Adresse
  unbekannt“ und „Passwort falsch“.

## A06 – Verwundbare Komponenten

- `npm audit --omit=dev` meldet **keine** bekannten Schwachstellen (Stand 18.09.2026).
- Zwei Fassungen werden über `overrides` angehoben: `mysql2` und `deepmerge-ts` kommen als Beiwerk von
  Prisma mit, obwohl wir Postgres nutzen. Ohne die Anhebung bliebe nur ein Rückschritt auf Prisma 6.
- Die CI prüft bei jedem Push (#019).

## A07 – Fehler bei Identifizierung und Authentifizierung

- Ratenbremse: fünf Anmeldeversuche je Kennung und Viertelstunde.
- Anmeldung wahlweise per Passwort oder OIDC (authentik, mit PKCE und `state`).
- Jede Anmeldung – erfolgreich oder nicht – landet im Audit-Log.

- **Passkeys** (WebAuthn, #028) als dritter, gleichwertiger Weg. Passwortlos, an die Domäne gebunden,
  mehrere je Konto. Setzt HTTPS voraus (außer auf `localhost`).
- Automatisch angelegte OIDC-Konten bekommen die eingestellte Rolle – Vorgabe *Techniker*, nicht
  Administrator.

**Nicht vorhanden:** klassische Zwei-Faktor-Anmeldung mit Einmalkennwort. Ein Passkey ersetzt beides
in einem Schritt; wer einen zweiten Faktor zum Passwort erzwingen will, stellt OIDC davor.

## A08 – Datenintegrität

- Der Agent prüft vor dem Selbstaktualisieren, ob die geladene Datei wie ein Bash-Skript beginnt.
- Webhooks werden mit HMAC-SHA256 signiert, damit die Gegenstelle die Herkunft prüfen kann.
- Hochgeladene Rechnungen werden nicht dem gemeldeten Typ nach beurteilt, sondern am Dateianfang
  geprüft (`%PDF-`), auf 10 MB begrenzt und unter ihrer Prüfsumme abgelegt.

## A09 – Protokollierung

- Audit-Log für Anmeldungen, Änderungen an Kunden, Rechnungen, Tokens, Kanälen und Warnregeln –
  einsehbar unter *Einstellungen → Protokoll*.
- Der Agent protokolliert auf dem Host über `logger` ins Journal.

## A10 – Server-Side Request Forgery

- Die einzige ausgehende Verbindung, die sich einstellen lässt, ist der Benachrichtigungs-Webhook. Er
  wird bewusst von einem Angemeldeten eingetragen und ist damit kein fremdgesteuerter Aufruf.
- Sonst ruft das Dashboard keine Adressen auf, die aus Daten stammen.

## Was ein Betreiber selbst tun muss

1. HTTPS davorschalten (Beispiele unter `deploy/reverse-proxy/`) und `APP_URL` auf `https://` setzen.
2. `APP_SECRET` und die Datenbank sichern (`deploy/backup.sh`).
3. Das Dashboard nicht ins offene Internet stellen, wenn es nicht sein muss. Die Agent-API muss
   erreichbar sein, die Oberfläche nicht.
4. Enrollment-Tokens nach dem Ausrollen widerrufen.
