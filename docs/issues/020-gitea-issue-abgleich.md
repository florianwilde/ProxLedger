# #020 Issues nach Gitea übertragen
**Status:** erledigt
**Meilenstein:** v0.4.1
**Labels:** infrastruktur, docs
**Geschätzt:** 2 h   **Tatsächlich:** 0 h 10 min

## Ziel
Die Issue-Dateien aus `docs/issues/` sollen als echte Issues im Gitea-Tracker erscheinen und dort
aktuell bleiben – ohne dass sie von Hand nachgepflegt werden müssen.

## Aufgaben
- [x] Skript `scripts/gitea-issues.ts`, das die Dateien liest und über die Gitea-API abgleicht
- [x] Meilensteine anlegen (v0.1.0 bis v1.0.0), Labels anlegen (agent, backend, ui, docs …)
- [x] Issues anlegen; vorhandene anhand der Nummer im Titel wiedererkennen und aktualisieren
- [x] Erledigte Issues in Gitea schließen, wieder geöffnete erneut öffnen
- [x] Trockenlauf ohne Token (`--dry-run`) zur Kontrolle vor dem ersten echten Lauf
- [x] npm-Skript `issues:sync` und Beschreibung im README

## Akzeptanzkriterien
- [x] Ein Lauf legt alle 20 Issues mit Titel, Text, Label und Meilenstein in Gitea an
- [x] Ein zweiter Lauf ändert nichts Unnötiges (keine Dubletten)
- [x] Der Token steht nur in der Umgebung, nie im Repository

## Abhängigkeiten
#001

## Notizen / Entscheidungen
- Die Markdown-Dateien bleiben die Quelle der Wahrheit: Sie liegen im Repo, sind ohne Netz lesbar und
  wandern mit jedem Klon mit. Gitea bekommt eine Kopie zum Kommentieren und Zuweisen.
- Der Token kommt aus den Git-Zugangsdaten (`git credential fill`), Adresse und Repo aus dem Remote.
  Damit muss derselbe Token nicht zweimal gepflegt werden.
- Gefragt werden zuerst die eingerichteten Helfer (Schlüsselbund), danach zusätzlich `~/.git-credentials` –
  je nach Rechner ist mal das eine, mal das andere gefüllt.
- Erster echter Lauf am 17.09.2026: 20 Issues, 15 Labels und 13 Meilensteine angelegt, erledigte Issues
  direkt geschlossen. Zweiter Lauf: 0 neue, 20 aktualisiert – keine Dubletten.
