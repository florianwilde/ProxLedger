# Changelog

Alle nennenswerten Änderungen an ProxLedger werden in dieser Datei dokumentiert.

Das Format basiert auf [Keep a Changelog](https://keepachangelog.com/de/1.1.0/),
und dieses Projekt folgt [Semantic Versioning](https://semver.org/lang/de/).

## [Unveröffentlicht]

### Hinzugefügt

### Geändert

### Behoben

### Entfernt

### Sicherheit

## [0.27.1] – 2026-10-23

### Sicherheit
- **Next.js auf 16.4.2.** Für 16.0.0 bis 16.4.0 wurden drei Lücken gemeldet, zwei davon **kritisch**: Remote Code Execution über die Bildoptimierung mit SVG-Dateien (GHSA-2464-fhr4-w9xw), Remote Code Execution in `use cache` (GHSA-673q-mjm6-r5xr) und eine Blockade über Server Actions (GHSA-p3m5-59mp-jv5r)
- ProxLedger nutzt weder `next/image` noch `use cache`; die Blockade über Server Actions betraf die Installation dagegen unmittelbar. **Wer öffentlich erreichbar ist, sollte sofort aktualisieren.**

## [0.27.0] – 2026-10-10

### Hinzugefügt
- `deploy/restore.sh`: spielt Datenbank **und** hochgeladene PDFs aus einer Sicherung zurück, startet die Dienste und prüft die Erreichbarkeit (#045)

### Behoben
- **Sicherungen ließen sich nur in eine leere Datenbank zurückspielen** – im Ernstfall also gerade nicht. `pg_dump` läuft jetzt mit `--clean --if-exists` (#045)
- Für die hochgeladenen PDFs gab es keinen beschriebenen Weg zurück (#045)

### Dokumentation
- `docs/betrieb/sicherung.md` beschreibt den **geprobten** Ablauf: Daten zerstört, zurückgespielt, geprüft (#045)

## [0.26.1] – 2026-10-10

### Sicherheit
- `sharp` auf 0.35.5 angehoben: Für ältere Fassungen wurde eine als hoch eingestufte Lücke in der mitgelieferten librsvg gemeldet (CVE-2026-96889). ProxLedger nutzt `sharp` nur beim Erzeugen der Symbole, nicht zur Laufzeit – die Fassung gehört trotzdem aktualisiert
- `source-map-js` über `overrides` auf 1.2.2 angehoben (Denial of Service, kam über postcss und vite mit)
- Next.js auf 16.4.0

## [0.26.0] – 2026-10-04

### Hinzugefügt
- Kennzeichen **Eigenbedarf** am Kunden: für eigene Hosts entfallen Kundenrechnung, die zugehörigen Warnungen, die Aufgabe „Kundenrechnung erstellen“ und die Marge – die Proxmox-Rechnung wird weiterhin geführt (#044)

## [0.25.0] – 2026-10-03

### Hinzugefügt
- **Laufzeit von Hand anlegen** – für Hosts, die (noch) kein Ablaufdatum melden, und für Nachträge (#043)
- **Laufzeit bearbeiten**: Key, Beginn, Ende und Notiz lassen sich nachträglich ändern (#043)
- **Laufzeiten zusammenführen**, wenn neben einer erfassten Laufzeit ein Vorschlag mit abweichendem Datum steht; die Rechnungen wandern mit (#043)
- Kundenansicht: Laufzeit und Host verlinkt, dazu Marge und Rabatt je Zeile (#043)

## [0.24.1] – 2026-10-03

### Behoben
- **Cluster mit QDevice meldeten falsche Knotennamen** (`A,V,NMW`, `NR`) und das QDevice als zusätzlichen Knoten: `pvecm nodes` hat dann eine Spalte mehr. Die Namensspalte wird jetzt aus der Kopfzeile bestimmt (#042)
- Agent-Version 0.2.2

## [0.24.0] – 2026-10-03

### Hinzugefügt
- Dreizehnte Warnregel: Mehrere Hosts desselben Kunden tragen denselben Namen – mit IP-Adressen zum Unterscheiden (#041)
- Hosts lassen sich **stilllegen**: Sie verschwinden aus Listen, Zahlen, Suche und Warnungen, ihre Laufzeiten und Rechnungen bleiben erhalten (#041)
- Endgültiges Löschen für Hosts, an denen keine Laufzeit hängt (#041)
- Schalter „stillgelegte Hosts zeigen“ in der Host-Liste (#041)

## [0.23.0] – 2026-10-03

### Hinzugefügt
- Schlagworte stehen jetzt in der Host-Liste und oben im Host-Detail; ein Klick darauf filtert die Liste (#040)
- Filter „Alle Schlagworte“ in der Host-Liste (#040)
- Eine vorhandene Notiz zeigt ein Zettel-Symbol in der Liste; der Text erscheint beim Überfahren und steht oben im Host-Detail (#040)
- Suche und globale Suche finden Hosts auch über Schlagwort und Notiztext (#040)

## [0.22.2] – 2026-10-03

### Behoben
- **Auf dem Telefon führte kein Weg zu den Rechnungsformularen**: Im Reiter *Rechnungen* der Host-Detailansicht war die Laufzeit nicht verlinkt, und in der Rechnungsliste ist diese Spalte erst ab 992 px sichtbar (#039)
- Der Reiter *Rechnungen* rechnete den Einkauf noch ohne Rabatt (#039)

### Geändert
- Der Reiter *Rechnungen* nutzt auf dem Telefon das Kartenlayout (#039)

## [0.22.1] – 2026-10-03

### Behoben
- **Die ganze Seite wurde auf dem Telefon herausgezoomt**, sobald die Warnungen geöffnet wurden oder eine Host-Detailansicht eine lange Server-ID enthielt. Ursache war jeweils ein Element breiter als das Fenster (#038)
- Die Laufzeit-Detailseite rechnete noch mit dem Listenpreis statt mit dem Betrag nach Rabatt – Marge und der Vorschlag für die Kundenrechnung waren um den Rabatt zu hoch (#037)

### Hinzugefügt
- `npm run screenshots -- --mobil name=/pfad` für gezielte Aufnahmen in Telefonbreite (#038)

## [0.22.0] – 2026-10-03

### Geändert
- **Der Rabatt gehört jetzt zur Rechnungsposition statt zur Rechnung** – so, wie Proxmox abrechnet: je Subscription-Key eine Zeile mit Listenpreis und eine mit „Client Discount“. Nur so bleibt er bei einer Sammelrechnung dem richtigen Host zugeordnet (#037)
- Der Rechnungsbetrag ist die Summe der Positionen nach Abzug ihrer Rabatte; Marge und Summen rechnen mit dem tatsächlich gezahlten Betrag (#037)
- Eigener Steuersatz für den Einkauf, Vorgabe 0 % wegen Reverse Charge (#037)
- Das Betragsfeld heißt „Listenpreis netto“ und zeigt beim Tippen, womit gerechnet wird (#037)

### Hinzugefügt
- Zwölfte Warnregel `kunde-bezahlt-einkauf-offen`: Der Kunde hat bezahlt, die Proxmox-Rechnung ist noch offen – der Moment, an dem man selbst zahlt (#037)

### Behoben
- Der Rabatt wurde bisher **nirgends abgezogen**, weder in der Summe noch in der Marge (#037)

## [0.21.0] – 2026-10-03

### Hinzugefügt
- Standort eines Hosts lässt sich in der Detailansicht setzen; die Auswahl richtet sich nach dem gewählten Kunden (#036)
- Breite Tabellen werden auf dem Telefon zu Karten: jede Angabe mit ihrer Beschriftung, statt rechts abgeschnitten zu sein (#035)

### Behoben
- **Jede Kundenzuweisung löschte den Standort des Hosts**, weil das Formular ihn nicht mitsendete, die Aktion ihn aber las (#036)
- Ein Standort, der zu einem anderen Kunden gehört, wird nicht mehr gespeichert (#036)
- Kartenköpfe mit Knöpfen liefen auf dem Telefon über den Rand (#035)
- Das Kontrollkästchen für den Rechnungsstatus wurde auf dem Telefon zum 44 Pixel hohen leeren Kasten (#035)

## [0.20.2] – 2026-10-03

### Behoben
- **Das Seitenmenü ließ sich auf dem Handy nicht schließen.** Es gab weder eine Fläche zum Antippen noch ein Schließen beim Navigieren – das Markup stammt von AdminLTE, dessen JavaScript wir bewusst nicht einbinden (#034)
- Die Dashboard-Tabelle war auf dem Telefon rechts abgeschnitten; sie zeigt dort jetzt Host und Ablauf, den Kunden klein darunter (#034)

### Hinzugefügt
- Schließen-Knopf im Menükopf, Schließen per Escape, und der Inhalt hinter dem offenen Menü scrollt nicht mehr mit (#034)

## [0.20.1] – 2026-10-03

### Behoben
- **Abmelden führte auf `0.0.0.0:3000`** und damit ins Leere. Next.js macht Weiterleitungen aus Server Actions serverseitig absolut und nahm dafür die Lausch-Adresse des Servers. Betroffen waren Abmelden, die Sitzungsprüfung und das Löschen eines Kunden (#033)
- Eine als Lausch-Adresse eingetragene `APP_URL` (`0.0.0.0`, `::`) wird jetzt übergangen statt übernommen (#033)
- Die LXC-Installation brach mit *404 – Could not fetch install/proxledger-install.sh* ab: Ein per curl geladenes ct-Skript kennt seine Herkunft nicht und suchte bei den community-scripts (#032)

### Geändert
- Vorgabe für den Arbeitsspeicher des LXC von 2 auf 4 GB – `next build` scheitert sonst während der Installation am Speicher (#032)

## [0.20.0] – 2026-10-03

### Hinzugefügt
- `deploy/update.sh` und `deploy/backup.sh` erkennen die Installationsart selbst und beherrschen jetzt auch die Installation als Dienst (Node und PostgreSQL direkt im Container) – nicht mehr nur Docker (#031)
- Eine fehlgeschlagene Sicherung bricht die Aktualisierung ab, bevor etwas verändert wird (#031)

### Behoben
- Die Zustandsprüfung des Web-Containers konnte nie gelingen: Next bindet im Standalone-Modus an die Adresse aus `HOSTNAME`, und Docker setzt dort den Containernamen – der Server lauschte nur auf der Container-IP. `web` blieb dauerhaft auf „health: starting“ (#031)

## [0.19.2] – 2026-10-03

### Sicherheit
- Next.js auf 16.3.8 angehoben. Für 16.2.0 bis 16.3.5 wurde eine als **kritisch** eingestufte Lücke in `next/og` gemeldet (Remote Code Execution, GHSA-vcvr-r3jv-pc5j). ProxLedger nutzt `next/og` nicht, war also nicht angreifbar – die Fassung gehört trotzdem aktualisiert, bevor etwas produktiv läuft
- `@simplewebauthn/server` auf 14.0.3

## [0.19.1] – 2026-09-19

### Hinzugefügt
- Anleitung für den netbird Reverse Proxy (Beta): Dienst anlegen, Zertifikat, private Dienste – samt Warnung, dass eine Anmeldehürde vor dem Dienst auch die Agents aussperrt (#030)

## [0.19.0] – 2026-09-19

### Hinzugefügt
- `docs/betrieb/`: Inbetriebnahme, Reverse Proxy (nginx Proxy Manager und netbird), OIDC mit authentik und Sicherung – jeweils Schritt für Schritt (#029)

### Behoben
- Die OIDC-Rückkehradresse berücksichtigte die im Dashboard eingetragene Adresse nicht, sondern nur `APP_URL` (#029)
- Beim Einlösen des OIDC-Codes wurde hinter einem Reverse Proxy die interne Adresse verwendet; der Tausch wäre am Anbieter gescheitert (#029)

## [0.18.0] – 2026-09-19

### Hinzugefügt
- Drei Rollen: Administrator, Techniker und Kunde. Kundenkonten sehen nur die eigenen Hosts und Rechnungen – ohne Einkaufspreise und Marge – und dürfen Notizen schreiben sowie Warnungen quittieren (#027)
- Benutzerverwaltung unter *Einstellungen → Benutzer*: anlegen, Rolle ändern, sperren, Passwort setzen, löschen (#027)
- Anmeldung mit Passkeys (WebAuthn), gleichwertig neben Passwort und OIDC; eigene Seite *Meine Passkeys* (#028)
- Einstellung, welche Rolle automatisch angelegte OIDC-Konten bekommen (#027)

### Behoben
- Neu über OIDC angelegte Konten hätten die Vorgabe des Datenmodells geerbt und wären Administratoren geworden; Vorgabe ist jetzt *Techniker* (#027)
- Das Screenshot-Skript meldete sich mit einem erfundenen Konto an – seit der Sitzungsprüfung gegen die Datenbank landete es auf der Anmeldeseite (#027)

## [0.17.0] – 2026-09-19

### Hinzugefügt
- `deploy/update.sh`: sichert, baut neu, migriert und prüft, ob das Dashboard wieder antwortet (#026)
- Installationsskripte nach Art der Proxmox VE Helper-Scripts unter `deploy/community-scripts/` – Container mit Node und PostgreSQL, ohne Docker (#026)
- `docs/roadmap.md`: was bis 1.0.0 fehlt und was danach lohnt (#026)
- Zustandsprüfung für den Worker im Docker-Stack (#026)

### Behoben
- Nach der Anmeldung führte die Weiterleitung im Container auf den internen Containernamen (`http://<container-id>:3000`) statt auf die erreichbare Adresse – hinter einem Reverse Proxy landete man damit im Nichts. Beim Prüfen des Docker-Stapels aufgefallen (#026)

### Geändert
- README auf den tatsächlichen Stand gebracht: Der Feldtest ist erledigt, der Hinweis „noch nicht erprobt“ war überholt (#026)

## [0.16.0] – 2026-09-18

### Hinzugefügt
- *Einstellungen → System*: Dashboard-Adresse, Melderhythmus und Selbstaktualisierung der Agents, kaufmännische Vorgaben, Sicherheitsgrenzen, Firmenangaben und Zeitzone (#025)
- Die Dashboard-Adresse und der Melderhythmus landen im ausgelieferten Installations-Einzeiler und im systemd-Timer (#025)
- OIDC lässt sich auf bestimmte E-Mail-Domänen begrenzen; das automatische Anlegen unbekannter Konten ist abschaltbar (#025)
- Nächtliches Aufräumen nach einstellbaren Aufbewahrungsfristen für Reports und Protokoll – der jüngste Report jedes Hosts bleibt erhalten (#025)
- Firmenangaben erscheinen im Kopf der PDF-Ausgaben (#025)

### Geändert
- Steuersatz, Zahlungsziel und Aufschlag kommen aus den Einstellungen statt aus fest eingetragenen 19 % (#025)

## [0.15.0] – 2026-09-18

### Hinzugefügt
- `docs/sicherheit.md`: Zuordnung aller Maßnahmen zu den OWASP Top 10, samt der Punkte, die bewusst offen bleiben (#024)
- Content-Security-Policy mit frischem Nonce je Anfrage (#024)
- Sitzungen lassen sich widerrufen: gesperrtes Konto oder neues Passwort beendet laufende Sitzungen sofort (#024)
- Benutzerverwaltung auf der Kommandozeile: `npm run benutzer -- liste|sperren|entsperren|passwort` (#024)

### Behoben
- Server Actions verließen sich allein auf den Schutz in `proxy.ts`; jede der 27 Aktionen prüft die Sitzung jetzt selbst (#024)
- Die Anmeldung prüfte die Herkunft des Formulars nicht – damit war Login-CSRF möglich (#024)
- `npm audit` meldete vier hohe Schwachstellen in Beiwerk von Prisma (`mysql2`, `deepmerge-ts`); über `overrides` angehoben, jetzt ohne Befund (#024)

## [0.14.1] – 2026-09-18

### Behoben
- Auf Proxmox Backup Server las der Agent **keine einzige Angabe** aus: `proxmox-backup-manager subscription get` gibt eine Rahmentabelle aus, keine `feld: wert`-Zeilen. Jetzt wird für PBS `--output-format json` genutzt, und die Tabelle wird als Rückfall ausgewertet (#023)
- Die PBS-Version enthielt die laufende Fassung ein zweites Mal (#023)
- Der Agent meldete eine „neue Version“, auch wenn die installierte neuer war als die des Dashboards (#023)

### Geändert
- Agent-Version 0.2.1; die Tests prüfen die Versionsangabe jetzt gegen die Konstante des Dashboards statt gegen eine abgeschriebene Zahl (#023)

## [0.14.0] – 2026-09-18

### Hinzugefügt
- Der Agent meldet die Mitglieder seines Proxmox-Clusters; das Dashboard warnt bei Knoten ohne eigenen Agent (#022)
- Host-Detail zeigt alle Cluster-Knoten mit Zustand „meldet sich“ oder „kein Agent“ (#022)
- Wartezeiten zwischen Sendeversuchen über `PROXLEDGER_WARTEZEITEN` einstellbar, damit sich der Zwischenspeicher testen lässt (#018)

### Behoben
- Die Produktversion enthielt bei Proxmox VE den Kernel ein zweites Mal (#018)
- Die Bilder des Handbuchs zeigten allesamt die Anmeldeseite: Firefox verwirft fremd erzeugte Cookie-Dateien stillschweigend. Das Skript nutzt jetzt einen lokalen Vermittler, der die Sitzung mitschickt, und bricht ab, wenn alle Aufnahmen gleich groß sind (#016)

## [0.13.1] – 2026-09-17

### Sicherheit
- SMTP-Passwort und Webhook-Geheimnis werden verschlüsselt in der Datenbank abgelegt (AES-256-GCM, Schlüssel aus `APP_SECRET`); eine Sicherung gibt sie damit nicht mehr im Klartext preis (#021)
- Werte aus der Zeit davor werden weiterhin gelesen und beim nächsten Speichern umgeschlüsselt (#021)

## [0.13.0] – 2026-09-17

### Hinzugefügt
- Prüfung bei jedem Push über Gitea Actions: Lint, Typen, Tests gegen PostgreSQL, Build, ShellCheck und Dokumentationsprüfung (#019)
- `npm run pruefe:doku` vergleicht Version, Issue-Übersicht und Handbuch-Bilder auf Konsistenz (#019)

## [0.12.1] – 2026-09-17

### Hinzugefügt
- Symbole für Browser-Tab (SVG und ICO), iOS-Startbildschirm und Web-Manifest, erzeugt mit `npm run icons` aus den SVG-Vorlagen in `assets/` (#017)

## [0.12.0] – 2026-09-17

### Hinzugefügt
- Handbuch mit Bildern: Installation, Agent-Rollout, Zuweisung, Rechnungen, Warnungen, Benachrichtigungen, Exporte, Sicherung und Fehlersuche (#016)
- `npm run screenshots` erzeugt alle Bilder des Handbuchs neu, auch im dunklen Design und in der Mobilansicht (#016)

## [0.11.1] – 2026-09-17

### Behoben
- Nach der Anmeldung führte jeder Klick zurück zur Anmeldeseite: Das Sitzungs-Cookie erhielt im Produktionsbau immer das Merkmal `Secure` und wurde über `http://` vom Browser verworfen. Maßgeblich ist jetzt die tatsächliche Adresse (`APP_URL`) (#013)

### Geändert
- Die Anmeldung läuft über ein gewöhnliches Formular statt über eine Server-Action; damit funktioniert sie auch ohne JavaScript (#013)

## [0.11.0] – 2026-09-17

### Geändert
- Auswertung der Warnregeln um den Faktor 13 beschleunigt: neue Warnungen entstehen sammelweise (#015)
- Aufgaben-Karte auf dem Dashboard zeigt höchstens zwölf Punkte und verweist für den Rest auf die Rechnungsliste (#015)
- Große Tabellen blenden auf schmalen Bildschirmen gestaffelt Spalten aus, statt quer zu scrollen (#015)

### Behoben
- Das Logo war im dunklen Design praktisch unsichtbar; seine Farben folgen jetzt dem Farbschema (#015)

## [0.10.0] – 2026-09-17

### Hinzugefügt
- Dockerfile (mehrstufig, Standalone-Ausgabe, Betrieb ohne root) und `docker-compose.yml` mit Dashboard, Worker, Datenbank und einmaligem Migrationsdienst (#014)
- LXC-Installer für Proxmox-Hosts: legt den Container an, installiert Docker, erzeugt Zufallspasswörter und startet alles (#014)
- Beispiele für Caddy, nginx und Traefik als Reverse Proxy (#014)
- Sicherungsskript für Datenbank, PDFs und Konfiguration (#014)
- Zustandsprüfung unter `/api/gesundheit` (#014)
- README mit Schnellstart, Agent-Rollout, Betriebs- und Sicherungshinweisen (#014)

## [0.9.0] – 2026-09-17

### Hinzugefügt
- Anmeldung mit E-Mail und Passwort sowie über OIDC (z. B. authentik); der lokale Zugang bleibt als Rückfallweg immer nutzbar (#013)
- Anmeldeseite im AdminLTE-Stil mit Logo (#013)
- Audit-Log-Ansicht mit Filter nach Aktion und Entität (#013)

### Geändert
- Audit-Einträge vermerken den angemeldeten Benutzer; Worker und Skripte erscheinen als „System“ (#013)

### Sicherheit
- Alle Seiten der Oberfläche sind ohne Anmeldung nicht erreichbar; Agent-API und Skript-Auslieferung bleiben offen (#013)
- Sitzungen als signiertes Cookie (`APP_SECRET`), fünf Anmeldeversuche je Kennung und Viertelstunde (#013)
- Sicherheits-Kopfzeilen: HSTS, nosniff, DENY für Frames, Referrer-Policy, Permissions-Policy (#013)

## [0.8.0] – 2026-09-17

### Hinzugefügt
- E-Mail-Versand über SMTP mit STARTTLS, abgestimmt auf Microsoft 365 (#012)
- Generischer Webhook mit JSON-Nutzdaten und optionaler HMAC-Signatur (#012)
- Tägliche oder wöchentliche Zusammenfassung mit offenen Warnungen, Rechnungspunkten und bald ablaufenden Subscriptions (#012)
- Einstellungsseite mit Testversand und Versandprotokoll (#012)

### Sicherheit
- Benachrichtigungen werden je Warnung nur einmal verschickt; fehlgeschlagene Versuche werden protokolliert und später wiederholt (#012)

## [0.7.0] – 2026-09-17

### Hinzugefügt
- Zehn Warnregeln: Ablauf in 30/14/7 Tagen, Status nicht aktiv, Socket-Abweichung, keine Meldung seit 48 Stunden, geänderte Server-ID, mehrfach gemeldeter Key, Host ohne Kunde, fällige Proxmox-Rechnung, fehlende und überfällige Kundenrechnung (#011)
- Worker-Prozess (`npm run worker`), der die Regeln stündlich auswertet; zusätzlich Auswertung nach jedem eingehenden Report (#011)
- Seite „Warnungen“ mit Filter offen/erledigt, Quittieren, Schließen und sofortiger Prüfung (#011)
- Einstellungsseite für Regeln und Schwellwerte (#011)

### Geändert
- Warnungen schließen sich automatisch, sobald die Ursache behoben ist; Titel und Beschreibung werden laufend nachgeführt (#011)

## [0.6.0] – 2026-09-17

### Hinzugefügt
- Jahresbahn mit zwölf Monaten, Heute-Linie und Gruppierung nach Kunde, aus echten Daten (#009)
- Ablauf-Kalender für die nächsten 90 Tage samt Rechnungsstatus und eine Übersicht bereits abgelaufener Subscriptions (#009)
- CSV-Export für Kundenübersicht und Rechnungsliste, PDF-Export für Hosts, Kunden und Rechnungen (#010)
- Kundenunterlage als PDF: Hosts, Laufzeiten, Summen pro Jahr und Marge eines Kunden (#010)

### Geändert
- Die Oberfläche arbeitet vollständig mit der Datenbank; Beispieldaten dienen nur noch dem Seed (#009)

## [0.5.0] – 2026-09-17

### Hinzugefügt
- Laufzeit-Vorschläge der Agents bestätigen oder verwerfen (#008)
- Proxmox- und Kundenrechnungen erfassen; gleiche Rechnungsnummer fasst mehrere Laufzeiten zu einer Sammelrechnung zusammen (#008)
- PDF-Upload für beide Rechnungsarten mit Prüfung des Dateiinhalts und Ablage unter der Prüfsumme (#008)
- Rechnungsübersicht mit Häkchen „bezahlt“ und „erstellt“ direkt in der Zeile, Filter nach Status, Kunde, Jahr und Suchbegriff (#008)
- Detailseite je Laufzeit mit Beträgen, Marge und Übersicht der Sammelrechnung (#008)
- Laufzeiten lassen sich von Hand anlegen (#008)

### Geändert
- Die Aufgabenliste auf dem Dashboard setzt beim Abhaken den Rechnungsstatus in der Datenbank (#008)

## [0.4.2] – 2026-09-17

### Geändert
- Der Issue-Abgleich holt Serveradresse und Repository aus dem Git-Remote und den Token aus den hinterlegten Git-Zugangsdaten; ein zweiter Token in der `.env` ist nicht mehr nötig (#020)

## [0.4.1] – 2026-09-17

### Hinzugefügt
- Abgleich der Issue-Dateien mit dem Gitea-Tracker über `npm run issues:sync`, inklusive Labels, Meilensteinen und Trockenlauf (#020)

## [0.4.0] – 2026-09-17

### Hinzugefügt
- Host-Tabelle mit Suche über Hostname, FQDN, Key, Server-ID, IP, Kunde und Rechnungsnummer (#007)
- Filter nach Kunde, Status, Produkt, Ablauffrist und offenen Rechnungspunkten; Sortierung und Seitenblättern (#007)
- CSV-Export der Host-Liste unter Berücksichtigung der aktiven Filter (#007)
- Host-Detailansicht mit Übersicht, Subscription-Historie, Reports, Rechnungen, Notizen mit Tags und Tokens (#007)
- Kunde eines Hosts direkt in der Detailansicht ändern (#007)

### Geändert
- Host-Tabelle und Host-Detail arbeiten mit echten Daten statt Beispieldaten (#007)

## [0.3.0] – 2026-09-17

### Hinzugefügt
- Kunden anlegen, bearbeiten und löschen; Standorte je Kunde verwalten (#006)
- Seite „Nicht zugeordnete Hosts“ mit Mehrfachauswahl und Zuweisung in einem Schritt (#006)
- Enrollment-Tokens erzeugen (mit Gültigkeit, Nutzungsgrenze und optionaler Kundenbindung), anzeigen und widerrufen; Host-Tokens widerrufen (#006)
- Audit-Log-Einträge für alle Änderungen an Kunden, Standorten, Zuweisungen und Tokens (#006)

### Geändert
- Dashboard, Kundenübersicht, Kunden-Detail und globale Suche arbeiten mit echten Daten statt Beispieldaten (#006)

### Behoben
- Prisma-Client öffnete in der Produktionsumgebung bei jedem Zugriff einen neuen Verbindungspool (#006)

## [0.2.0] – 2026-09-17

### Hinzugefügt
- Agent-Skript in Bash: erkennt Proxmox VE, Backup Server und Mail Gateway, sammelt Subscription-, Host- und Systemdaten (#005)
- Installation per One-Liner mit Enrollment-Token, systemd-Service und -Timer (täglich, zufällig versetzt) (#005)
- Zwischenspeicher für Reports samt Nachsenden, wenn das Dashboard nicht erreichbar ist (#005)
- Update- und Uninstall-Funktion sowie Verbindungstest (`--test`) und Vorschau (`--dry-run`) (#005)
- Dashboard liefert `install.sh` und `agent.sh` mit eingesetzter Adresse und Version aus (#005)

### Sicherheit
- Konfiguration des Agents mit Rechten 600, TLS-Prüfung standardmäßig aktiv, optional eigenes CA-Zertifikat (#005)

## [0.1.0] – 2026-09-17

### Hinzugefügt
- Projektorganisation: Devlog, Changelog, Issue-Übersicht und Issues pro Phase (#001)
- Architektur- und Umsetzungsplan in `docs/architektur.md` (#001)
- Next.js-Grundgerüst mit AdminLTE-CSS, Bootstrap Icons, zod, ESLint, Prettier und Vitest (#001)
- Klickbarer Prototyp mit Beispieldaten: Dashboard, Kunden- und Host-Ansichten, Rechnungen, Jahresbahn (#002)
- ProxLedger-Logo als SVG-Komponente, Farbschema nach Vorgabe inklusive Dark-Mode (#002)
- Globale Suche über Key, Host, Kunde und Rechnungsnummer mit Strg+K (#002)
- Datenmodell mit Prisma: Kunden, Standorte, Hosts, Reports, Key- und Server-ID-Historie, Laufzeiten, Proxmox- und Kundenrechnungen mit Positionen, Tokens, Warnungen, Benachrichtigungen, Benutzer und Audit-Log (#003)
- Erste Migration, Seed für Administrator, Warnregeln und Demo-Daten (#003)
- Docker-Compose für die Entwicklungsdatenbank und Testdatenbank-Setup für Vitest (#003)
- Agent-API unter `/api/agent/v1`: Registrierung, Report und Verbindungstest (#004)
- Automatischer Laufzeit-Vorschlag, sobald ein Agent ein neues Ablaufdatum meldet (#004)
- Key- und Server-ID-Historie je Host (#004)

### Geändert

### Behoben

### Entfernt

### Sicherheit

### Sicherheit
- API-Tokens werden nur als SHA-256-Hash gespeichert und sind einzeln widerrufbar (#004)
- Rate-Limiting und strikte zod-Validierung auf der Agent-API (#004)
