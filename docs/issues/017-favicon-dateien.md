# #017 Favicon-Dateien erzeugen
**Status:** erledigt
**Meilenstein:** v0.12.1
**Labels:** ui
**Geschätzt:** 1 h   **Tatsächlich:** 0 h 15 min

## Ziel
Das Monogramm liegt als React-Komponente vor. Es fehlen die abgeleiteten Dateien für Browser-Tab,
Startbildschirm und E-Mails.

## Aufgaben
- [x] `favicon.svg` (32-px-Variante mit einer Linie) unter `src/app/icon.svg`
- [x] `favicon.ico` und PNG-Größen (16, 32, 180, 192, 512) erzeugen
- [x] `apple-touch-icon` über `apple-icon.tsx` (ImageResponse) oder als PNG
- [x] Erzeugung als Skript (`npm run icons`) festhalten, damit Änderungen am Logo nachziehbar sind
- [x] Einfarbige Variante für PDF-Export und Rechnungen bereitstellen

## Akzeptanzkriterien
- [x] Browser-Tab zeigt das Monogramm in Hell und Dunkel
- [x] Beim Ablegen auf dem iOS-Startbildschirm erscheint das Logo ohne weißen Rand

## Abhängigkeiten
#002

## Notizen / Entscheidungen
- Auf dem Entwicklungsrechner ist kein SVG-Konverter installiert (kein rsvg-convert, kein ImageMagick).
  Entweder `sharp` als Entwicklungsabhängigkeit aufnehmen oder Next.js `ImageResponse` nutzen.
- Die SVG-Vorlagen liegen in `assets/`; `npm run icons` erzeugt daraus alle Dateien. Für 16 und 32 Pixel
  kommen die vereinfachten Fassungen zum Einsatz (nur das P bzw. eine Linie), sonst verschwimmen die feinen
  Linien.
- `favicon.ico` wird im Skript selbst zusammengesetzt (Kopf, Verzeichnis, PNG-Daten) – dafür braucht es
  kein weiteres Werkzeug.
- Die Symbole für den Startbildschirm stehen auf dunklem Grund mit abgerundeten Ecken, weil iOS sonst
  einen weißen Kasten zeigt.
- Dazu ein `manifest.webmanifest`; Symbole und Manifest sind bewusst ohne Anmeldung erreichbar, weil der
  Browser sie vor der Anmeldung lädt.
- Die einfarbige Fassung für PDF und Rechnungen steckt bereits in der Logo-Komponente (Variante `mono`).
