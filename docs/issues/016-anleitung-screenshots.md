# #016 Benutzerhandbuch mit Screenshots
**Status:** erledigt
**Meilenstein:** v0.12.0
**Labels:** docs
**Geschätzt:** 5 h   **Tatsächlich:** 0 h 30 min

## Ziel
Bebildertes Handbuch auf Deutsch, das den kompletten Weg zeigt: Dashboard installieren, Enrollment-Token erzeugen,
Agent auf einem Host ausrollen, Host einem Kunden zuweisen, Laufzeit und Rechnungen pflegen, Warnungen und
Benachrichtigungen einrichten.

## Aufgaben
- [x] Gliederung `docs/anleitung/README.md` (Installation, Erste Schritte, Agent ausrollen, Kunden und Hosts, Rechnungen, Warnungen, Benachrichtigungen, Backup)
- [x] Screenshots automatisiert erzeugen (`npm run screenshots`): Seiten anfahren, Aufnahmen nach `docs/anleitung/bilder/` schreiben
- [x] Aufnahmen in Hell und Dunkel, dazu eine Mobilansicht
- [x] Bilder mit Bildunterschriften und Alternativtexten einbinden
- [x] Screenshots vor jedem Release auffrischen (Hinweis in der Release-Checkliste)
- [x] Verweise aus README und Dashboard-Hilfe auf das Handbuch

## Akzeptanzkriterien
- [x] Jemand ohne Vorkenntnisse kann anhand des Handbuchs Dashboard und Agent installieren
- [x] Jeder Arbeitsschritt hat mindestens ein Bild
- [x] Bilder zeigen Beispieldaten, keine echten Kundendaten

## Abhängigkeiten
#014

## Notizen / Entscheidungen
- Aufnahmen laufen über Firefox im Headless-Modus (`firefox --profile <profil> --headless --screenshot`),
  weil Firefox auf dem Entwicklungsrechner ohnehin vorhanden ist und kein Browser nachinstalliert werden muss.
  Das Profil braucht `user_pref("layout.css.prefers-color-scheme.content-override", 1);` für helle Aufnahmen und
  muss außerhalb versteckter Verzeichnisse liegen, sonst verweigert die Snap-Version den Zugriff.
- Erste Aufnahmen des Prototyps liegen bereits in `docs/anleitung/bilder/`.
- Das Handbuch liegt unter `docs/anleitung/README.md` mit elf Kapiteln und 16 Bildern.
- `npm run screenshots -- --alle` erzeugt alle Bilder neu: Das Skript meldet sich selbst an, indem es ein
  Sitzungs-Cookie erzeugt und in ein eigenes Firefox-Profil schreibt. Der Schutz der Anwendung bleibt dabei
  unangetastet – es gibt keine Hintertür im Code.
- Ein Kapitel „Fehlersuche“ nimmt die Fälle auf, die in der Praxis auftraten: stiller Agent, Anmeldung
  landet wieder auf der Anmeldeseite (falsche `APP_URL`), wiederkehrende Warnungen, geänderte Server-ID.
