# Roadmap

Stand: 19.09.2026, Fassung 0.17.0

## Was steht

Alles, was im ursprünglichen Auftrag stand, ist gebaut und in Betrieb erprobt:

- Agent für PVE, PBS und PMG; Push-Modell über systemd-Timer, Zwischenspeicher bei Ausfall
- Zuordnung Key → Host → Kunde, Laufzeiten je Lizenzjahr, Einkaufs- und Verkaufsrechnung mit Marge
- Elf Warnregeln, Benachrichtigungen per E-Mail und Webhook, Zusammenfassung
- Anmeldung lokal und per OIDC, Audit-Log, verschlüsselte Zugangsdaten, Härtung nach OWASP
- Auslieferung als Docker-Stack und als LXC-Container (eigener Installer und Helper-Script-Weg)
- Handbuch mit Bildern, 190 Tests, CI bei jedem Push

## Was bis 1.0.0 fehlt

Nichts davon ist eine Baustelle im Code – es fehlt **Erprobung** und eine Handvoll Kanten:

| Punkt | Warum es zählt | Aufwand |
|---|---|---|
| **Mail Gateway im Feldtest** (#023) | Der einzige Produktzweig, den nie ein echter Host bestätigt hat. Bei PBS lag die Annahme daneben, und der Agent hätte dort nichts gemeldet – bei PMG kann es genauso sein. | 1 h, sobald ein Host da ist |
| **PBS mit aktiver Subscription** (#023) | Bisher nur der Fall „keine Subscription“ geprüft. Ablaufdatum, Sockel und Level sind auf PBS ungeprüft. | 30 min |
| **Ein Monat Dauerbetrieb** | Timer, Nachsendung, nächtliches Aufräumen und die Zusammenfassung laufen erst seit einem Tag. Ein Lizenzablauf in echt wäre der beste Beweis. | Zeit, keine Arbeit |
| **Sicherung einmal zurückspielen** | `deploy/backup.sh` schreibt Sicherungen. Eine Sicherung, die nie zurückgespielt wurde, ist keine Sicherung. | 30 min |

Danach ist 1.0.0 gerechtfertigt. Meine Empfehlung: erst laufen lassen, dann das Etikett vergeben.

## Nach 1.0 – Vorschläge, nach Nutzen sortiert

### Lohnt sich am ehesten

1. **Verlängerung mit einem Klick.** Heute wird eine Laufzeit bestätigt und die Rechnung von Hand
   erfasst. Ein Knopf „verlängern“, der die Folgelaufzeit anlegt, den Einkauf vormerkt und die
   Kundenrechnung mit dem eingestellten Aufschlag vorbereitet, spart bei jedem Lizenzjahr Klicks.
2. **Rechnungsnummern automatisch.** Ein Schema wie `PL-{jahr}-{nummer}` mit fortlaufendem Zähler;
   heute tippt man jede Nummer. (In #025 bewusst weggelassen, weil es eine Vergabelogik braucht.)
3. **Mehrere Benutzer mit Rollen.** Derzeit darf jeder Angemeldete alles – in `docs/sicherheit.md`
   offen vermerkt. Für Buchhaltung (nur Rechnungen) und Technik (nur Hosts) wären zwei Rollen genug.
   Dazu gehört eine Benutzerverwaltung in der Oberfläche statt auf der Kommandozeille.
4. **Währung und Zeitzone auch in der Browseransicht.** Beides steht schon in den Einstellungen, wirkt
   aber nur in PDF, CSV und Benachrichtigungen; die Oberfläche rechnet fest in Euro.

### Sinnvoll, wenn es wächst

5. **Kundenportal oder Bericht per E-Mail.** Ein monatlicher Stand je Kunde, automatisch verschickt –
   spart Rückfragen.
6. **Angebot vor der Verlängerung.** Aus der Jahresbahn heraus ein PDF-Angebot für das kommende
   Lizenzjahr erzeugen.
7. **Import der Proxmox-Shop-Rechnungen.** Wer dort per Sammelrechnung kauft, tippt heute jede Position
   ab. Ein CSV- oder PDF-Import mit Zuordnung über den Key wäre eine echte Ersparnis.
8. **Metriken für Prometheus** (`/metrics`): Hosts je Zustand, Tage bis zum nächsten Ablauf, Alter des
   letzten Reports. Wer schon Grafana betreibt, sieht ProxLedger damit im gewohnten Bild.
9. **Zwei-Faktor-Anmeldung** für den lokalen Zugang. Heute lautet die Antwort „dann nimm OIDC“ – das
   ist vertretbar, aber nicht für jeden.

### Nur falls der Bedarf entsteht

10. **Mandantenfähigkeit.** Mehrere Systemhäuser in einer Installation. Das ist ein Umbau, kein
    Anbau – die Zugriffskontrolle müsste durchgängig auf Mandanten umgestellt werden.
11. **Agent für weitere Produkte** (Proxmox Datacenter Manager), sobald der Bedarf da ist.
12. **Hochverfügbarkeit.** Die Ratenbremse liegt im Prozessspeicher; für mehrere Instanzen müsste sie
    in die Datenbank wandern. Bei einem Dashboard für ein Systemhaus ist das Aufwand ohne Gewinn.

## Was ich bewusst nicht vorschlage

- **Pull statt Push.** Das Dashboard würde dann Zugänge zu allen Kundenhosts brauchen. Der jetzige Weg
  kommt ohne gespeicherte root-Zugänge aus; das ist ein Sicherheitsgewinn, den man nicht aufgeben sollte.
- **Eigene Benutzer- und Rechteverwaltung mit Gruppen, Vererbung und allem.** Wer das braucht, hat schon
  ein IdP – dafür gibt es OIDC.
- **Agent mit Abhängigkeiten** (Python, jq). Er kommt heute mit Bash und curl aus und läuft damit auf
  jedem Proxmox-Host, auch auf einem alten.
