# #027 Rollen und Benutzerverwaltung
**Status:** erledigt
**Meilenstein:** v0.18.0
**Labels:** security, backend, ui
**Geschätzt:** 6 h   **Tatsächlich:** 1 h 20 min

## Ziel
Bisher durfte jeder Angemeldete alles – in `docs/sicherheit.md` als offener Punkt vermerkt. Es soll
drei Rollen geben: Administrator, Techniker und Kunde. Kundenkonten sehen nur die eigenen Daten.

## Aufgaben
- [x] `Rolle` im Datenmodell, Kundenbindung am Benutzer
- [x] Rechte an **einer** Stelle (`src/server/auth/rollen.ts`), nicht verteilt über Seiten
- [x] `sitzungErforderlich(recht)` – jede der 28 Aktionen nennt ihr Recht
- [x] Sicht einschränken: Hosts, Kunden, Rechnungen, Kennzahlen, Suche, Jahresbahn, Dashboard
- [x] Einkaufspreise und Marge für Kundenkonten entfernen – in der Abfrage, nicht in der Anzeige
- [x] Schreibrechte für Kunden: Notizen am eigenen Host, Warnungen quittieren
- [x] Benutzerverwaltung unter *Einstellungen → Benutzer*
- [x] Menü nach Rolle
- [x] Tests

## Entscheidungen
- **Rolle und Kundenbindung kommen aus der Datenbank, nicht aus dem Token.** Eine geänderte Rolle
  wirkt damit sofort statt erst nach Ablauf der Sitzung.
- **Die Abfragen holen sich die Einschränkung selbst** (`sichtbarerKunde()`), statt sie von der Seite
  gereicht zu bekommen. Eine Seite kann so nicht vergessen, sie weiterzugeben – der häufigste Weg,
  wie solche Sichten lecken.
- **Ein Kundenkonto ohne Kundenbindung sieht nichts** statt alles. Der Rückfall zeigt bewusst ins
  Leere, nicht auf den vollen Bestand.
- **Ausgeblendete Menüpunkte sind keine Zugriffskontrolle.** Sie sind Bequemlichkeit; geprüft wird in
  Seite und Aktion.

## Beim Bauen aufgefallen
Neu angelegte OIDC-Konten hätten die Vorgabe des Datenmodells geerbt – **ADMIN**. Wer sich beim
Identitätsanbieter anmelden darf, wäre damit nebenbei Administrator geworden. Jetzt gibt es dafür eine
eigene Einstellung mit der Vorgabe *Techniker*, samt Test.
