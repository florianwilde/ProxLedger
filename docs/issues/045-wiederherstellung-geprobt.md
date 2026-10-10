# #045 Wiederherstellung proben und Skript dafür
**Status:** erledigt
**Meilenstein:** v0.27.0
**Labels:** deployment, doku
**Geschätzt:** 2 h   **Tatsächlich:** 0 h 50 min

## Ziel
Einer der vier Punkte bis 1.0.0: eine Sicherung **einmal wirklich zurückspielen**. Bis dahin war nur
geprüft, dass `deploy/backup.sh` Dateien schreibt.

## Ablauf der Probe
Mit einem eigenen Docker-Stapel, getrennt von allen anderen Daten:

1. Datenstand festgehalten (9 Hosts, 4 Kunden, 10 Laufzeiten), einen Kunden zur Wiedererkennung in
   `Marke-192641` umbenannt, eine PDF-Datei in den Upload-Ordner gelegt
2. Sicherung angelegt
3. **Alle Daten zerstört** – `docker compose down -v`, also Datenbank- und Upload-Volume weg
4. Zurückgespielt und geprüft

**Ergebnis:** Datenbank vollständig zurück (die Marke war wieder da), die PDF-Datei lag mit den
richtigen Rechten im Upload-Ordner, Anmeldung mit dem alten Passwort funktionierte.

## Zwei Lücken, die erst die Probe gezeigt hat
1. **Die Sicherung ließ sich nur in eine leere Datenbank zurückspielen.** `pg_dump` ohne `--clean`
   scheitert an bestehenden Tabellen – genau im Ernstfall, wenn man in eine laufende Installation
   zurückspielen will. Jetzt `--clean --if-exists`; gegengeprüft gegen eine Datenbank mit Daten:
   null Fehlerzeilen, der zwischenzeitlich geänderte Wert war wieder auf dem Stand der Sicherung.
2. **Für die hochgeladenen PDFs gab es keinen beschriebenen Weg.** Gesichert wurden sie, zurückspielen
   musste man selbst herausfinden.

## Ergebnis
- `deploy/restore.sh`: hält die Dienste an, spielt Datenbank und PDFs zurück, startet wieder und prüft
  die Erreichbarkeit. Fragt vorher nach, `--ja` überspringt das.
- Die `.env` wird bewusst **nicht** überschrieben: Sie trägt `APP_SECRET`, und ein falscher Wert dort
  macht die gespeicherten Zugangsdaten unlesbar. Die passende Fassung liegt als `env-<Stand>.txt` daneben.
- `docs/betrieb/sicherung.md` beschreibt den geprobten Ablauf samt Handarbeit als Rückfallebene.

## Offen
Geprobt wurde der Docker-Weg. Für die Installation als Dienst ist derselbe Ablauf im Skript
vorgesehen, aber noch nicht unter echten Bedingungen gelaufen.
