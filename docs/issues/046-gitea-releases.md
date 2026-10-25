# #046 Releases in Gitea statt nur Tags
**Status:** erledigt
**Meilenstein:** v1.0.1
**Labels:** chore, doku
**Geschätzt:** 1 h   **Tatsächlich:** 0 h 25 min

## Auslöser
„Kannst du auch Releases machen und nicht nur Tags?“

## Unterschied
Ein Tag ist eine Markierung im Git-Verlauf. Eine **Release** ist ein Eintrag in Gitea mit Titel,
Beschreibung und Download-Verweisen – sichtbar unter *Releases*, abonnierbar und verlinkbar.
Bislang gab es nur Tags; die Beschreibungen standen allein im CHANGELOG.

## Umsetzung
`npm run releases:sync` liest das CHANGELOG, nimmt jeden Abschnitt `## [x.y.z] – Datum`, für den es
ein Tag gibt, und legt daraus eine Release an. Ein zweiter Lauf aktualisiert nur, was sich geändert
hat; „Unreleased“ bleibt außen vor, weil es dazu kein Tag gibt.

```bash
npm run releases:sync -- --dry-run    # zeigt nur, was passieren würde
npm run releases:sync                 # legt an und aktualisiert
npm run releases:sync -- v1.0.0       # nur eine Fassung
```

Fünf Tests decken die Zerlegung ab.

## Offen: der Token
Der in den Git-Zugangsdaten hinterlegte Wert ist elf Zeichen lang – ein Passwort, kein API-Token.
Pushen funktioniert damit, die API antwortet mit 401. Betrifft auch `npm run issues:sync`, das seit
dem 10.10.2026 nicht mehr durchläuft.

**Nötig:** in Gitea unter *Einstellungen → Anwendungen* ein Token mit den Rechten
`write:repository` (für Releases) und `issue:write` (für den Issue-Abgleich) erzeugen und entweder
als `GITEA_TOKEN` in die `.env` legen oder in den Git-Zugangsdaten hinterlegen. Danach trägt ein
einziger Lauf alle 43 vorhandenen Fassungen nach.
