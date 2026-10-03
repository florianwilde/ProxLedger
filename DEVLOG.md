# DEVLOG – ProxLedger

## Zeitübersicht

**Gesamt:** 21 h 43 min

| Issue | Zeit |
|---|---|
| #001 Projekt-Setup | 0 h 08 min |
| #002 Klickbarer Prototyp | 0 h 20 min |
| #003 Datenmodell und Migrationen | 0 h 25 min |
| #004 Agent-API | 0 h 20 min |
| #005 Agent-Skript | 0 h 25 min |
| #006 Kunden und Hostzuweisung | 0 h 35 min |
| #007 Host-Tabelle und Detailansichten | 0 h 25 min |
| #020 Issues nach Gitea übertragen | 0 h 20 min |
| #008 Laufzeiten und Rechnungen | 0 h 35 min |
| #009 Jahresbahn und Ablauf-Kalender | 0 h 15 min |
| #010 Export CSV und PDF | 0 h 20 min |
| #011 Warnregeln | 0 h 30 min |
| #012 Benachrichtigungen | 0 h 25 min |
| #013 Authentifizierung | 0 h 30 min |
| #014 Deployment | 0 h 40 min |
| #015 Feinschliff | 0 h 35 min |
| #016 Handbuch | 0 h 30 min |
| #017 Favicons | 0 h 15 min |
| #019 CI-Pipeline | 0 h 20 min |
| #021 Geheimnisse verschlüsseln | 0 h 20 min |
| #018 Feldtest auf echten Hosts | 0 h 40 min |
| #022 Cluster-Abgleich | 0 h 25 min |
| #023 Feldtest PBS | 0 h 35 min |
| #024 OWASP-Härtung | 0 h 45 min |
| #025 Einstellungen | 1 h 10 min |
| #026 Auslieferung | 0 h 40 min |
| #027 Rollen und Benutzerverwaltung | 1 h 20 min |
| #028 Passkeys | 0 h 45 min |
| #029 Einrichtungsdokumentation | 0 h 40 min |
| #030 netbird Reverse Proxy | 0 h 20 min |
| #031 Update für beide Varianten | 0 h 45 min |
| #032 LXC-Installation korrigiert | 0 h 20 min |
| #033 Weiterleitung auf Lausch-Adresse | 0 h 30 min |
| #034 Bedienung auf dem Handy | 0 h 40 min |
| #035 Tabellen als Karten | 0 h 50 min |
| #036 Standort am Host | 0 h 30 min |
| #037 Rabatt je Position | 0 h 55 min |
| #038 Überbreite auf dem Handy | 0 h 40 min |
| #039 Zugang zur Laufzeit | 0 h 30 min |
| #040 Schlagworte sichtbar | 0 h 40 min |

| Meilenstein | Zeit |
|---|---|
| v0.1.0 | 1 h 13 min | **abgeschlossen**
| v0.2.0 | 0 h 25 min | **abgeschlossen**
| v0.3.0 | 0 h 35 min | **abgeschlossen**
| v0.4.0 | 0 h 25 min | **abgeschlossen**
| v0.4.1 | 0 h 10 min | **abgeschlossen**
| v0.4.2 | 0 h 10 min | **abgeschlossen**
| v0.5.0 | 0 h 35 min | **abgeschlossen**
| v0.6.0 | 0 h 35 min | **abgeschlossen**
| v0.7.0 | 0 h 30 min | **abgeschlossen**
| v0.8.0 | 0 h 25 min | **abgeschlossen**
| v0.9.0 | 0 h 30 min | **abgeschlossen**
| v0.10.0 | 0 h 40 min | **abgeschlossen**
| v0.11.0 | 0 h 35 min | **abgeschlossen**
| v0.12.0 | 0 h 30 min | **abgeschlossen**

---

## 2026-09-17 · Sitzung 1 · 19:36–laufend
**Issue:** #001–#007 (Meilensteine v0.1.0 bis v0.4.0)
**Version:** 0.23.0

### Erledigt
- Auftrag gelesen, Rückfragen gestellt
- Umgebung geprüft: Ubuntu 26.04, Git 2.53; Node/Docker fehlten → Node 24 LTS per nvm installiert
- Repository-Rechte korrigiert (Verzeichnis gehörte root), Branch `master` → `main`, Git-Identität lokal gesetzt
- `.gitignore`, `CHANGELOG.md`, `DEVLOG.md`, Architekturplan und 15 Issues angelegt
- #001 abgeschlossen: Next.js 16 (App Router, TypeScript strict), AdminLTE-CSS, Bootstrap Icons, zod, ESLint/Prettier/Vitest; Lint, Typecheck, Test und Build grün
- #002 abgeschlossen: Prototyp mit Beispieldaten – Layout (Sidebar, Kopfleiste, Inhaltskopf, Footer), Logo als SVG-Komponente, Theme mit Farbvorgaben und Dark-Mode, Dashboard, Kunden (Liste und Detail), Hosts (Liste, Detail, nicht zugeordnet), Rechnungen, Jahresbahn, Einstellungsseiten, globale Suche mit Strg+K
- Screenshots aller Seiten aufgenommen und in `docs/anleitung/bilder/` abgelegt
- #003 abgeschlossen: Prisma-Schema mit 23 Modellen, erste Migration, Seed (Administrator, 10 Warnregeln, Demo-Daten), Testdatenbank-Setup für Vitest, 3 Schema-Tests
- #004 abgeschlossen: Agent-API mit Enrollment, Report und Ping, gehashte Tokens, Rate-Limit, zod-Validierung, 32 Tests insgesamt
- Meilenstein v0.1.0 abgeschlossen und getaggt
- #005 abgeschlossen: Bash-Agent mit Produkterkennung, JSON ohne jq, Retry mit Backoff, Spool, systemd-Timer, Installer, Uninstall und Update; Dashboard liefert `/install.sh` und `/agent.sh` aus
- Meilenstein v0.2.0 abgeschlossen und getaggt; 38 Tests
- #006 abgeschlossen: Kunden und Standorte pflegen, Mehrfachzuweisung nicht zugeordneter Hosts, Enrollment- und Host-Tokens verwalten, Audit-Log; Dashboard, Kundenseiten und globale Suche laufen auf der Datenbank
- Durchlauf gegen den laufenden Server geprüft: Token anlegen → `enroll` → Agent-Report → Laufzeit-Vorschlag → Host erscheint als „nicht zugeordnet“ → `ping`
- Meilenstein v0.3.0 abgeschlossen und getaggt; 45 Tests
- Issues #017 bis #019 aus bisherigen Notizen angelegt (Favicons, Feldtest des Agents, CI-Pipeline)
- #007 abgeschlossen: Host-Tabelle mit Suche, fünf Filtern, Sortierung, Seitenblättern und CSV-Export; Host-Detail mit sechs Tabs, Notizen, Tags, Kundenzuweisung und Token-Widerruf
- Meilenstein v0.4.0 abgeschlossen und getaggt; 59 Tests
- #020 abgeschlossen: Abgleichskript für den Gitea-Issue-Tracker (Missverständnis geklärt – die Issues lagen bisher nur als Dateien im Repo, nicht im Tracker)
- Token kommt aus den Git-Zugangsdaten statt aus einer zweiten Stelle; 20 Issues, 15 Labels und 13 Meilensteine in Gitea angelegt
- Alles nach Gitea gepusht: main bei 51243c2, Tags v0.1.0 bis v0.4.1
- #008 abgeschlossen: Laufzeit-Vorschläge bestätigen oder verwerfen, Rechnungen mit Positionen erfassen, PDF-Upload, Häkchen direkt in der Tabelle, Filter nach Status, Kunde und Jahr; Aufgabenliste auf dem Dashboard setzt jetzt echte Status
- Meilenstein v0.5.0 abgeschlossen; 78 Tests
- #009 abgeschlossen: Jahresbahn und Ablauf-Kalender (90 Tage) aus der Datenbank, dazu eine Karte für bereits abgelaufene Subscriptions; die Oberfläche nutzt keine Beispieldaten mehr
- #010 abgeschlossen: CSV- und PDF-Export für Hosts, Kunden, einzelne Kundenunterlage und Rechnungsliste; PDFs serverseitig ohne Browser
- Meilenstein v0.6.0 abgeschlossen
- #011 abgeschlossen: zehn Warnregeln als reine Funktionen, Abgleich mit offenen Warnungen, Worker mit stündlichem Zeitplan, Auswertung nach jedem Report, Warnungsliste und Einstellungsseite; 123 Tests
- Meilenstein v0.7.0 abgeschlossen
- #012 abgeschlossen: SMTP (Microsoft 365), generischer Webhook mit Signatur, Zusammenfassung, Versandprotokoll, Testversand; keine Doppelmeldungen dank Prüfung gegen das Protokoll
- Issue #021 angelegt: Zugangsdaten liegen noch unverschlüsselt in der Datenbank
- Meilenstein v0.8.0 abgeschlossen; 134 Tests
- #013 abgeschlossen: Anmeldung mit Passwort und OIDC, Schutz aller Seiten über `proxy.ts`, Anmeldeseite im AdminLTE-Stil, Audit-Log-Ansicht, Sicherheits-Kopfzeilen, Rate-Limit bei Anmeldeversuchen
- Meilenstein v0.9.0 abgeschlossen; 147 Tests
- #014 abgeschlossen: Dockerfile (Standalone, Non-root), Compose mit web/worker/postgres/migrate, LXC-Installer, Reverse-Proxy-Beispiele, Sicherungsskript, README mit Schnellstart und Betriebshinweisen
- Container-Stapel wirklich gebaut und geprüft: Agent registriert sich, Report kommt an, Warnung entsteht automatisch
- Meilenstein v0.10.0 abgeschlossen
- #015 abgeschlossen: Dark-Mode geprüft (Logo war unsichtbar – behoben), Mobilansicht ohne Querscrollen, Lasttest mit 200 Hosts und 365.000 Reports, Auswertung der Warnregeln von 3813 auf 293 ms beschleunigt, Sicherheitsdurchsicht
- Als v0.11.0 veröffentlicht statt 1.0.0: Feldtest, Handbuch, Favicons, CI und Verschlüsselung der Zugangsdaten stehen noch aus
- 0.11.1: Anmeldefehler behoben (Secure-Cookie über http)
- #016 abgeschlossen: Handbuch mit elf Kapiteln und 16 Bildern, dazu `npm run screenshots` zum Auffrischen
- #017 abgeschlossen: Symbole für Tab, Startbildschirm und Manifest, erzeugt mit `npm run icons` aus SVG-Vorlagen
- #019 abgeschlossen: Gitea-Actions-Workflow mit Lint, Typen, Tests, Build, ShellCheck und Doku-Prüfung
- #021 abgeschlossen: SMTP-Passwort und Webhook-Geheimnis liegen verschlüsselt in der Datenbank (AES-256-GCM, Schlüssel aus APP_SECRET)

### Entscheidungen
- **Warnungen sammelweise anlegen:** Einzelne Upserts kosteten bei 737 neuen Warnungen 3,8 s; mit `createMany` sind es 0,3 s.
- **Keine 1.0.0 ohne Feldtest:** Solange der Agent auf keinem echten Proxmox-Host lief, wäre die Zahl ein falsches Versprechen.
- **Kein Auth.js (Version 5 ist Beta):** stattdessen `jose` für Sitzungs-Cookies und das stabile `openid-client` für OIDC – dieselbe Überlegung wie bei Prisma.
- **Warnstufen im Fingerabdruck** (`…:7`): Der Wechsel 30 → 14 → 7 schließt die alte Warnung und öffnet eine neue. Das ergibt je Stufe genau eine Benachrichtigung, ohne Sonderlogik für Eskalation.
- **Rechnungsnummer als Schlüssel für Sammelrechnungen:** Dieselbe Nummer bei einer zweiten Laufzeit hängt eine Position an – kein eigener Dialog für „Sammelrechnung anlegen“ nötig.
- **PDF-Prüfung am Dateianfang** statt am gemeldeten Typ; abgelegt wird unter der Prüfsumme, gleiche Datei also nur einmal.
- **Screenshots mit Firefox headless** statt Playwright: Firefox ist vorhanden, es muss kein Browser samt Systembibliotheken nachinstalliert werden (dafür wäre root nötig).
- **Kennzahlen werden berechnet, nicht hinterlegt:** auch im Prototyp kommen alle Zahlen aus den Beispieldaten, damit Tabellen und Kacheln nie widersprüchlich sind.
- **AdminLTE 4.9.1 nur als CSS:** stabil, Bootstrap 5.3.8, kein jQuery; die JS-Plugins manipulieren das DOM und werden daher als React-Komponenten nachgebaut.
- **Host-Identität über Agent-Token statt Server-ID:** Die Server-ID ändert sich bei Hardwaretausch und soll dann eine Warnung auslösen, statt einen neuen Host zu erzeugen.
- **Rechnungen mit Positionen:** Proxmox-Sammelbestellungen und Sammelrechnungen an Kunden sollen ohne doppelte Rechnungsnummern abbildbar sein.
- **Eigener Worker-Prozess** für zeitgesteuerte Warnregeln und Benachrichtigungen, unabhängig von Seitenaufrufen.
- **Prototyp direkt im Next.js-Projekt**, damit die Komponenten weiterverwendet werden.
- **Prisma 7.10.0 fest gesetzt:** Der npm-Tag `latest` zeigt derzeit auf 8.0.0-rc, ein Release Candidate gehört nicht in ein neues Projekt.
- **Seed nutzt die Prototyp-Beispieldaten**, damit die Oberfläche ab #006 dieselben Fälle zeigt wie der Prototyp.
- **Keine Nur-Lese-Rolle** (Rückmeldung Florian): alle Benutzer sind Administratoren.
- **Prisma-Client wird lazy erzeugt** (Proxy), damit `next build` ohne gesetzte `DATABASE_URL` durchläuft.
- **Report-Idempotenz über eine vom Agent erzeugte `reportId`**: nachgesendete Reports aus dem Spool dürfen beliebig oft ankommen.
- **Unbekannte Subscription-Status werden zu `UNKNOWN`** statt abgelehnt – ein Report darf nie an einem neuen Statuswort scheitern.
- **Dashboard gleich mit auf die Datenbank umgestellt** (eigentlich #009): Eine frisch zugewiesene Zuordnung hätte dort sonst weiter als „nicht zugeordnet“ gestanden.
- **Server Actions rufen Services auf**, damit die Regeln ohne Next.js-Laufzeit testbar bleiben.

### Probleme / offene Fragen
- Von Florian im Betrieb gemeldet: Nach der Anmeldung führte jeder Klick zurück zur Anmeldeseite. Ursache: `Secure`-Cookie über `http://`. Behoben in 0.11.1.
- Der LXC-Installer ist ungetestet (kein Proxmox-Host verfügbar); gleiches gilt für den Agent im Feld (#018).
- Prisma-Client erzeugte in der Produktionsumgebung bei jedem Zugriff einen neuen Verbindungspool → „too many clients“. Behoben: Client wird im Modul festgehalten.
- Docker wurde von Florian installiert; die Entwicklungsdatenbank läuft auf Port 5433 (5432 bleibt für lokale Instanzen frei).
- Favicon-Dateien (.ico/PNG) fehlen noch, weil kein SVG-Konverter installiert ist.
- Der Agent wurde noch auf keinem echten Proxmox-Host installiert; die Tests arbeiten mit nachgebauten Befehlen.
- Offen: Rolle „readonly“ zusätzlich zu Admin? (vorläufig vorgesehen)

- #018 abgeschlossen: Feldtest auf zwei echten PVE-9.2-Hosts (einer mit, einer ohne Subscription, einer im Cluster); Installation, Timer, Zwischenspeicher und Nachsenden geprüft
- #022 abgeschlossen: Cluster-Abgleich – jeder Agent meldet die Mitglieder, das Dashboard warnt bei Knoten ohne Agent
- **Fehler im eigenen Werkzeug gefunden:** Alle Handbuch-Bilder waren in Wahrheit die Anmeldeseite. Firefox verwirft eine selbst angelegte Cookie-Datei stillschweigend. Jetzt läuft ein lokaler Vermittler mit, und das Skript bricht ab, wenn alle Aufnahmen gleich groß sind.

- Feldtest auf einem echten Proxmox Backup Server (#023): der Agent hätte dort **nichts** gelesen – PBS gibt eine Rahmentabelle aus, kein `feld: wert`. Behoben, mit den echten Ausgaben als Testfälle
- Der erfundene PBS-Testfall hatte den Fehler verdeckt. Lehre: ausgedachte Testdaten bestätigen nur die eigene Annahme
- Uninstall zum ersten Mal auf einem echten Host geprüft – restlos sauber, damit ist #018 vollständig

- Durchsicht nach OWASP (#024): drei echte Lücken gefunden – Server Actions ohne eigene Zugriffsprüfung, Login-CSRF und fehlende CSP. Alle behoben und mit Tests abgesichert
- Erkenntnis: Der Schutz lag vollständig in einer einzigen Schicht (`proxy.ts`). Das fällt erst auf, wenn man die Endpunkte einzeln betrachtet statt die Oberfläche

- Einstellungen im Dashboard (#025): vier Bereiche, alle Werte wirken auch wirklich – der Melderhythmus zum Beispiel bis in den erzeugten systemd-Timer hinein, live geprüft
- Dabei die OIDC-Lücke aus #024 geschlossen: Domänenliste und Schalter gegen automatisch angelegte Konten
- Bewusst nicht gebaut: „stumm nach X Tagen“ (steht schon bei den Warnregeln) und die Währung in der Browseransicht

- Auslieferung finalisiert (#026): Docker-Weg mit Update-Skript, dazu Skripte nach Art der Helper-Scripts für einen LXC ohne Docker
- Recherche dazu: Das Gerüst der community-scripts liegt inzwischen in einem eigenen Repository, und neue Skripte gehören zuerst nach ProxmoxVED. Eine Einreichung setzt öffentlichen Quelltext voraus – deshalb vorerst intern
- Roadmap geschrieben: Bis 1.0.0 fehlt kein Code mehr, sondern Erprobung (PMG, PBS mit Lizenz, ein Monat Dauerbetrieb, einmal eine Sicherung zurückspielen)

- Rollen und Benutzerverwaltung (#027): Die Einschränkung sitzt in den Abfragen selbst, damit keine Seite vergessen kann, sie weiterzugeben. Sechs Tests prüfen, dass ein Kundenkonto weder fremde Hosts noch Einkaufspreise sieht
- Dabei aufgefallen: Neu angelegte OIDC-Konten hätten die Modellvorgabe ADMIN geerbt – behoben, mit eigener Einstellung und Test
- Passkeys (#028): passwortlos, mehrere je Konto, Aufgabe in einem kurzlebigen Cookie. Nur über HTTPS nutzbar – die Seite sagt es, statt still zu scheitern

- Einrichtungsdokumentation (#029): Beim Aufschreiben des OIDC-Wegs fielen zwei Fehler auf, die nur hinter einem Reverse Proxy auftreten – Rückkehradresse und Code-Einlösung nahmen die interne Adresse. Beides behoben
- Erkenntnis: Eine Anleitung Schritt für Schritt aufzuschreiben findet Fehler, die kein Test findet, weil sie nur in einer bestimmten Betriebsform auftreten

- netbird Reverse Proxy (#030) in die Anleitung aufgenommen – Florians Hinweis, dass die Beta gut läuft. Beim Durchgehen der Möglichkeiten fiel der Fallstrick auf: Eine Anmeldehürde vor dem Dienst trifft auch `/api/agent` und legt alle Agents still

### 03.10.2026 – Prüfung vor dem Einsatz
- `npm audit` vor der Freigabe erneut laufen lassen: In den zwei Wochen seit dem letzten Stand kam eine kritische Meldung zu Next.js dazu (RCE in `next/og`). Wir nutzen `next/og` nicht, waren also nicht angreifbar – angehoben auf 16.3.8, Tests und Build grün
- Lehre für den Betrieb: Vor jedem Produktivgang und danach regelmäßig `npm audit` prüfen, nicht nur bei Änderungen am Code

- Update- und Sicherungsskript für beide Installationsarten (#031). Beim Durchspielen zwei Fehler gefunden: Die Zustandsprüfung des Web-Containers konnte nie gelingen (Next bindet an `HOSTNAME`, Docker setzt dort den Containernamen), und eine fehlgeschlagene Sicherung hielt die Aktualisierung nicht auf
- Lehre: Ein Skript, das nie unter echten Bedingungen gelaufen ist, ist eine Behauptung. Erst der Durchlauf gegen einen laufenden Stapel hat beide Fehler gezeigt

- Erster echter Einsatz durch Florian – und prompt zwei Fehler, die kein Test gezeigt hatte (#032, #033)
- #033 war hausgemacht: Mein `HOSTNAME=0.0.0.0` aus #031 hat den Healthcheck repariert und dafür alle Weiterleitungen aus Server Actions auf `0.0.0.0` gelenkt. Vorher stand dort der Containername – derselbe Fehler, nur unauffälliger
- Lehre: Weiterleitungen gehören aus der konfigurierten Adresse gebaut, nie aus dem, was der Server über sich selbst weiß

- Mobile Bedienung (#034): Das Menü ließ sich auf dem Telefon nicht schließen – AdminLTE-Markup ohne AdminLTE-JavaScript. Eigener Zustand, abdunkelnde Fläche, Schließen beim Navigieren und mit Escape
- Lehre: Die Mobilansicht war mit Screenshots geprüft, nicht mit den Fingern. Ein Bild zeigt nicht, dass etwas nicht wieder weggeht

- Breite Tabellen werden auf dem Telefon zu Karten (#035); dabei fiel auf, dass `pl-touch-target` am Kontrollkästchen selbst saß und es zum leeren Kasten aufblies
- Standort am Host (#036): Die Meldung lautete „kann man nicht einstellen“ – tatsächlich löschte jede Kundenzuweisung den vorhandenen Standort, weil das Formular ihn nicht mitsendete und die Aktion ihn trotzdem las
- Beide Fehler kamen aus dem echten Einsatz, nicht aus den Tests. Das bleibt die ergiebigste Quelle

- Eine echte Proxmox-Rechnung hat drei Fehler im Rechnungsteil aufgedeckt (#037): Rabatt an der falschen Ebene, nirgends abgezogen, und 19 % USt als Vorgabe, wo Reverse Charge gilt
- Florians Schilderung des Ablaufs (unbezahlte Rechnung → Kundenrechnung → Kunde zahlt → selbst zahlen → PAID-Fassung) ergab die zwölfte Warnregel
- Lehre: Ein Beleg aus der Praxis sagt mehr über das Datenmodell als jede Annahme darüber, wie Rechnungen aussehen

- Überbreite auf dem Handy (#038): Drei Verursacher, ein Muster – ein Element breiter als das Fenster zoomt die ganze Seite heraus
- Dabei einen eigenen Fehler aus #037 gefunden: Die Detailseite rechnete weiter mit dem Listenpreis. Beim Ändern einer Rechengröße reicht es nicht, die Abfragen anzupassen – auch die Seiten rechnen selbst
- Das Aufnahme-Skript kann jetzt gezielt in Telefonbreite aufnehmen; damit ließ sich die Behebung belegen statt nur behaupten

- #039: Auf dem Telefon führte kein Weg zu den Rechnungsformularen – die Laufzeit war nicht verlinkt und die Spalte erst ab 992 px sichtbar
- Dritte Stelle, die den Einkauf ohne Rabatt rechnete. Beim Ändern einer Rechengröße gehört jede Stelle gesucht, die sie selbst bildet – nicht nur die Abfragen
- Bootstraps `d-*`-Klassen setzen `display` mit `!important`; für Spalten in der Kartenansicht braucht es eigene Klassen

- Schlagworte und Notizen sichtbar gemacht (#040). Beides gab es längst – nur eben versteckt in einem Reiter, und damit nutzlos zum Unterscheiden gleichnamiger Hosts
- Kein neues Feld gebaut: Ein zweites „Kommentar“ hätte dieselbe Angabe an zwei Orten gehalten

### Nächster Schritt
- #016 Benutzerhandbuch mit Screenshots, danach #017 Favicons und #019 CI-Pipeline
- Für 1.0.0 fehlt noch: PMG (kein Host verfügbar) und der Fall „aktive Subscription auf PBS“ (#023)
