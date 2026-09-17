# #017 Favicon-Dateien erzeugen
**Status:** offen
**Meilenstein:** v0.6.0
**Labels:** ui
**Geschätzt:** 1 h   **Tatsächlich:** –

## Ziel
Das Monogramm liegt als React-Komponente vor. Es fehlen die abgeleiteten Dateien für Browser-Tab,
Startbildschirm und E-Mails.

## Aufgaben
- [ ] `favicon.svg` (32-px-Variante mit einer Linie) unter `src/app/icon.svg`
- [ ] `favicon.ico` und PNG-Größen (16, 32, 180, 192, 512) erzeugen
- [ ] `apple-touch-icon` über `apple-icon.tsx` (ImageResponse) oder als PNG
- [ ] Erzeugung als Skript (`npm run icons`) festhalten, damit Änderungen am Logo nachziehbar sind
- [ ] Einfarbige Variante für PDF-Export und Rechnungen bereitstellen

## Akzeptanzkriterien
- [ ] Browser-Tab zeigt das Monogramm in Hell und Dunkel
- [ ] Beim Ablegen auf dem iOS-Startbildschirm erscheint das Logo ohne weißen Rand

## Abhängigkeiten
#002

## Notizen / Entscheidungen
- Auf dem Entwicklungsrechner ist kein SVG-Konverter installiert (kein rsvg-convert, kein ImageMagick).
  Entweder `sharp` als Entwicklungsabhängigkeit aufnehmen oder Next.js `ImageResponse` nutzen.
