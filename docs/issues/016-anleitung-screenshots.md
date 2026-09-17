# #016 Benutzerhandbuch mit Screenshots
**Status:** offen
**Meilenstein:** v0.10.0
**Labels:** docs
**Geschätzt:** 5 h   **Tatsächlich:** –

## Ziel
Bebildertes Handbuch auf Deutsch, das den kompletten Weg zeigt: Dashboard installieren, Enrollment-Token erzeugen,
Agent auf einem Host ausrollen, Host einem Kunden zuweisen, Laufzeit und Rechnungen pflegen, Warnungen und
Benachrichtigungen einrichten.

## Aufgaben
- [ ] Gliederung `docs/anleitung/README.md` (Installation, Erste Schritte, Agent ausrollen, Kunden und Hosts, Rechnungen, Warnungen, Benachrichtigungen, Backup)
- [ ] Screenshots automatisiert erzeugen (`npm run screenshots`): Seiten anfahren, Aufnahmen nach `docs/anleitung/bilder/` schreiben
- [ ] Aufnahmen in Hell und Dunkel, dazu eine Mobilansicht
- [ ] Bilder mit Bildunterschriften und Alternativtexten einbinden
- [ ] Screenshots vor jedem Release auffrischen (Hinweis in der Release-Checkliste)
- [ ] Verweise aus README und Dashboard-Hilfe auf das Handbuch

## Akzeptanzkriterien
- [ ] Jemand ohne Vorkenntnisse kann anhand des Handbuchs Dashboard und Agent installieren
- [ ] Jeder Arbeitsschritt hat mindestens ein Bild
- [ ] Bilder zeigen Beispieldaten, keine echten Kundendaten

## Abhängigkeiten
#014

## Notizen / Entscheidungen
- Aufnahmen laufen über Firefox im Headless-Modus (`firefox --profile <profil> --headless --screenshot`),
  weil Firefox auf dem Entwicklungsrechner ohnehin vorhanden ist und kein Browser nachinstalliert werden muss.
  Das Profil braucht `user_pref("layout.css.prefers-color-scheme.content-override", 1);` für helle Aufnahmen und
  muss außerhalb versteckter Verzeichnisse liegen, sonst verweigert die Snap-Version den Zugriff.
- Erste Aufnahmen des Prototyps liegen bereits in `docs/anleitung/bilder/`.
