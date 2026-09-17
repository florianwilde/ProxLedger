# #015 Feinschliff für 1.0
**Status:** erledigt
**Meilenstein:** v0.11.0
**Labels:** ui, sicherheit
**Geschätzt:** 6 h   **Tatsächlich:** 0 h 35 min

## Ziel
Produktionsreife: Dark-Mode, Mobilansicht, Barrierefreiheit und Sicherheitsprüfung.

## Aufgaben
- [x] Dark-Mode vollständig (alle Seiten, PDF bleibt hell)
- [x] Mobil: Tabellen als Karten, Touch-Ziele ≥ 44 px
- [x] Kontrast- und Tastaturprüfung
- [x] Sicherheits-Review (Abhängigkeiten, Header, Uploads, Tokens)
- [x] Performance-Check mit 200 Hosts / 5 Jahren Reports

## Akzeptanzkriterien
- [x] Alle Seiten in Hell und Dunkel lesbar
- [x] Keine bekannten kritischen Schwachstellen in Abhängigkeiten

## Abhängigkeiten
#014

## Notizen / Entscheidungen
### Ergebnisse

**Dark-Mode:** Das Logo war auf dunklem Grund praktisch unsichtbar (dunkles P auf dunklem Hintergrund).
Die Farben kommen jetzt aus dem Theme (`--pl-logo-p`), die Sidebar-Variante bleibt fest weiß, die
einfarbige Variante für PDF unverändert. Übrige Seiten in Dunkel geprüft: Kacheln, Tabellen, Karten und
Badges bleiben lesbar.

**Mobil:** Bei 390 px musste man vorher quer scrollen. Jetzt blenden die großen Tabellen Spalten gestaffelt
aus (Key ab `md`, Produkt und Sockets ab `lg`, letzte Meldung und Beträge ab `xl`), sodass Host, Kunde,
Status und Ablauf ohne Scrollen sichtbar sind.

**Lasttest** (200 Hosts, 365.000 Reports, 1.000 Laufzeiten, 25 Kunden):

| Abfrage | vorher | nachher |
|---|---|---|
| Dashboard-Kennzahlen | 65 ms | 65 ms |
| Host-Tabelle, erste Seite | 7 ms | 6 ms |
| Suche nach Key | 20 ms | 22 ms |
| Rechnungsliste | 54 ms | 42 ms |
| Warnregeln auswerten | 3813 ms | **293 ms** |

Die Auswertung legte 737 Warnungen einzeln an. Jetzt entstehen neue Warnungen mit einem `createMany`;
nur wiedereröffnete und geänderte Fälle werden einzeln angefasst. Außerdem zeigt die Aufgaben-Karte auf
dem Dashboard höchstens zwölf Punkte und verweist für den Rest auf die Rechnungsliste – vorher wären es
600 Einträge auf einer Karte gewesen.

**Sicherheit:** `npm audit` meldet vier Funde mit hohem Rang, alle über `mysql2` und `deepmerge-ts`
in der **Prisma-CLI** (Entwicklungsabhängigkeit). Wir betreiben PostgreSQL, der MySQL-Treiber wird nie
geladen, und das Laufzeit-Abbild enthält die CLI gar nicht – sie steckt nur im Migrationsdienst. Behoben
wäre es erst mit einem Prisma-Downgrade auf 6.x; das wäre der schlechtere Tausch. Beobachten und mit dem
nächsten Prisma-Update erneut prüfen (#019).

**Noch offen für 1.0.0:** Feldtest des Agents (#018), Benutzerhandbuch (#016), Favicon-Dateien (#017),
CI-Pipeline (#019) und die Verschlüsselung der Zugangsdaten (#021). Deshalb wird diese Phase als v0.11.0
veröffentlicht, nicht als 1.0.0.
