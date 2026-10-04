# Roadmap

Stand: 04.10.2026, Fassung 0.26.0

Die erste Fassung dieser Roadmap entstand vor dem produktiven Einsatz. Seitdem läuft ProxLedger mit
echten Daten, und das hat die Reihenfolge deutlich verändert: Was aus der Benutzung kam, war fast
immer wichtiger als das, was vorher auf der Liste stand.

## Was seit dem Produktivgang dazukam

Rollen und Benutzerverwaltung, Passkeys, Einstellungen im Dashboard, Betriebsdokumentation, die
mobile Bedienung, Schlagworte und Notizen in der Übersicht, Stilllegen doppelter Hosts, Laufzeiten
anlegen/bearbeiten/zusammenführen, Rabatt je Rechnungsposition, Eigenbedarf.

Ebenso die Fehler, die erst der Einsatz gezeigt hat: QDevice-Spalte im Cluster, PBS-Rahmentabelle,
Weiterleitungen auf die Lausch-Adresse, Standort beim Zuweisen gelöscht, Einkauf ohne Rabatt an drei
Stellen.

---

## Bis 1.0.0

Kein neuer Funktionsumfang – es fehlt Erprobung.

| Punkt | Warum | Aufwand |
|---|---|---|
| **PMG im Feldtest** ([#023](issues/023-feldtest-pbs-pmg.md)) | Der einzige Produktzweig ohne echten Host. Bei PBS lag die Annahme daneben, und der Agent hätte dort nichts gemeldet. | 1 h, sobald ein Host da ist |
| **PBS mit aktiver Lizenz** | Bisher nur „keine Subscription“ geprüft. | 30 min |
| **Sicherung einmal zurückspielen** | Eine Sicherung, die nie zurückgespielt wurde, ist keine. | 30 min |
| **Ein Lizenzjahr durchlaufen lassen** | Warnung → Verlängerung → Einkauf → Kundenrechnung → bezahlt, einmal vollständig in echt. Die nächsten Abläufe stehen am 17.10.2026 an. | nur Zeit |

---

## Danach – nach Nutzen sortiert

### 1. Proxmox-Rechnung einlesen statt abtippen

Die Rechnungen von Proxmox haben eine feste Form: je Key eine Zeile mit Zeitraum und Betrag, dazu die
Rabattzeilen. Ein Import, der das PDF liest und die Positionen den Laufzeiten über den Key zuordnet,
spart bei jeder Sammelrechnung das meiste Tippen – und vermeidet Zahlendreher.

**Aufwand:** mittel (PDF-Text auslesen, Zeilen erkennen, Zuordnung bestätigen lassen).
**Voraussetzung:** zwei, drei echte Rechnungen als Vorlage.

### 2. Verlängerung mit einem Klick

Heute wird eine Laufzeit bestätigt und die Folgelaufzeit von Hand angelegt. Ein Knopf „verlängern“,
der die nächste Laufzeit anlegt, den Einkauf vormerkt und die Kundenrechnung mit dem eingestellten
Aufschlag vorbereitet, nimmt bei jedem Lizenzjahr vier Schritte ab.

**Aufwand:** klein bis mittel.

### 3. Kundenrechnung als Dokument

ProxLedger führt die Kundenrechnung bisher nur als Datensatz – geschrieben wird sie woanders. Mit
Nummernkreis, Firmenangaben (stehen schon in den Einstellungen) und PDF-Ausgabe wäre der Kreis
geschlossen. Zu klären wäre, ob das die vorhandene Buchhaltung ersetzen soll oder nur ergänzt.

**Aufwand:** mittel. **Rückfrage zuerst:** Soll ProxLedger Rechnungen *schreiben* oder nur *führen*?

### 4. Oberflächentests mit echtem Browser

Die letzten sechs Fehler hat keiner der 251 Tests gefunden – alle kamen aus der Benutzung: Menü ließ
sich nicht schließen, Seite zoomte heraus, kein Weg zur Laufzeit, falscher Betrag in einer Tabelle.
Ein knappes Dutzend Abläufe mit Playwright (anmelden, Host zuweisen, Rechnung erfassen, auf dem
Telefon navigieren) würde genau diese Klasse abdecken.

**Aufwand:** mittel. **Nutzen:** steigt mit jeder weiteren Änderung.

### 5. Verlauf statt einer Notiz

Die Notiz am Host ist ein Textfeld – was wann passiert ist, verschwindet darin. Datierte Einträge
(„17.10.2026 · Sockets von 1 auf 2 erhöht“) wären bei Wechseln und Hardwaretausch nützlich.

**Aufwand:** klein.

### 6. Ablauf-Kalender abonnieren

Ein ICS-Feed mit allen Ablaufdaten, den man in Outlook oder Nextcloud einbindet. Dann stehen die
Verlängerungen im gewohnten Kalender, nicht nur im Dashboard.

**Aufwand:** klein.

### 7. Kundenzugang wirklich nutzen

Die Rolle *Kunde* existiert samt eingeschränkter Sicht, aber es gibt keinen Weg, jemanden einzuladen:
kein Einladungslink, keine erste Anmeldung ohne Passwort. Ohne das bleibt die Rolle Theorie.

**Aufwand:** klein bis mittel.

### 8. Metriken für Prometheus

`/metrics` mit Hosts je Zustand, Tagen bis zum nächsten Ablauf und Alter des letzten Reports. Wer
Grafana betreibt, sieht ProxLedger damit im gewohnten Bild – und merkt auch, wenn das Dashboard
selbst steht.

**Aufwand:** klein.

---

## Später, falls der Bedarf entsteht

- **Mandantenfähigkeit** – mehrere Systemhäuser in einer Installation. Ein Umbau, kein Anbau.
- **Agent für Proxmox Datacenter Manager**, sobald es dort Subscriptions gibt, die das rechtfertigen.
- **Mehrere Instanzen** (Hochverfügbarkeit). Die Ratenbremse liegt im Prozessspeicher und müsste in
  die Datenbank wandern. Für ein Dashboard eines Systemhauses Aufwand ohne Gewinn.
- **Angebot vor der Verlängerung** als PDF aus der Jahresbahn heraus.

## Bewusst nicht

- **Pull statt Push.** Das Dashboard bräuchte Zugang zu allen Kundenhosts. Der jetzige Weg kommt ohne
  gespeicherte root-Zugänge aus – ein Sicherheitsgewinn, den man nicht aufgeben sollte.
- **Eigene Rechteverwaltung mit Gruppen und Vererbung.** Wer das braucht, hat ein IdP; dafür gibt es OIDC.
- **Agent mit Abhängigkeiten** (Python, jq). Er kommt mit Bash und curl aus und läuft damit auf jedem
  Proxmox-Host.
- **Hosts automatisch zusammenführen.** Beim Doppeleintrag müsste geraten werden, welcher Eintrag
  welche Rechnung erbt. Die Warnung nennt beide; entscheiden soll der Mensch.
