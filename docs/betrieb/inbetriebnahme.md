# Inbetriebnahme

Der kürzeste Weg von null zu einem Dashboard, das Hosts meldet. Rechnen Sie mit einer halben Stunde.

## Reihenfolge

Die Reihenfolge ist nicht beliebig – zwei Schritte hängen an der endgültigen Adresse:

1. Dashboard installieren
2. **Adresse festlegen** (Reverse Proxy, DNS)
3. OIDC einrichten (falls gewünscht)
4. Passkeys anlegen
5. Agents ausrollen

Wer Schritt 4 oder 5 vorzieht, macht sie nach einem Adresswechsel noch einmal: Passkeys gelten nur für
die Domäne, unter der sie entstanden sind, und die Adresse steckt im Installations-Einzeiler.

## 1. Installieren

**Docker** (beliebiger Host mit Docker):

```bash
git clone https://github.com/florianwilde/ProxLedger.git proxledger && cd proxledger
cp .env.example .env
# Pflicht: APP_SECRET, POSTGRES_PASSWORD, ADMIN_PASSWORD, APP_URL
docker compose up -d
```

**LXC auf Proxmox**, zwei Möglichkeiten:

```bash
bash deploy/lxc-installer.sh                    # Container mit Docker darin
```

```bash
# Nach Art der Proxmox VE Helper-Scripts, ohne Docker:
bash -c "$(curl -fsSL https://raw.githubusercontent.com/florianwilde/ProxLedger/main/deploy/community-scripts/ct/proxledger.sh)"
```

Der erste Administrator entsteht beim Einrichten aus `ADMIN_EMAIL` und `ADMIN_PASSWORD`; beim
LXC-Weg stehen die erzeugten Zugangsdaten in `/opt/proxledger/.credentials`.

Das Repository liegt seit Oktober 2026 auf GitHub. Eine Installation, die noch von
`git.wilde-server.de` geklont wurde, holt Updates weiter von dort. Das bleibt so in Ordnung, weil ein
Workflow `main` und alle Tags nach Gitea spiegelt. Wer trotzdem direkt von GitHub holen will:
`git -C <installationsverzeichnis> remote set-url origin https://github.com/florianwilde/ProxLedger.git`.

**`APP_SECRET` gehört sofort in die Sicherung.** Er signiert die Sitzungen und verschlüsselt die
gespeicherten Zugangsdaten für SMTP und Webhooks. Ohne ihn sind beide unbrauchbar.

## 2. Adresse festlegen

Siehe [reverse-proxy.md](reverse-proxy.md). Danach unter *Einstellungen → System* die **Adresse des
Dashboards** eintragen – sie landet im Installations-Einzeiler und in den Benachrichtigungen.

## 3. Anmeldung einrichten

- Optional OIDC: [authentik.md](authentik.md)
- Weitere Konten unter *Einstellungen → Benutzer* (Administrator, Techniker, Kunde)
- Jeder legt sich unter *Meine Passkeys* einen Passkey an – danach entfällt das Passwort

## 4. Agents ausrollen

1. *Einstellungen → Agent-Tokens* → Enrollment-Token erzeugen (mit Kundenbindung spart es den
   Zuordnungsschritt)
2. Auf jedem Proxmox-Host als root:
   ```bash
   curl -fsSL https://proxledger.firma.de/install.sh | bash -s -- --token <ENROLL_TOKEN>
   ```
3. **In einem Cluster auf jedem Knoten** – jeder Knoten hat eine eigene Subscription. Das Dashboard
   warnt von selbst, wenn ein Knoten fehlt.
4. Danach den Enrollment-Token widerrufen.

## 5. Benachrichtigungen

*Einstellungen → Benachrichtigungen*: SMTP-Zugang oder Webhook eintragen, Testnachricht schicken,
Zusammenfassung auf täglich oder wöchentlich stellen.

## Prüfliste

- [ ] `https://…/api/gesundheit` antwortet mit 200
- [ ] Anmeldung klappt, die Adresszeile bleibt auf der öffentlichen Adresse
- [ ] Ein Host meldet sich (*Hosts* zeigt ihn mit Ablaufdatum)
- [ ] Testnachricht ist angekommen
- [ ] Sicherung läuft und wurde **einmal zurückgespielt** ([sicherung.md](sicherung.md))
- [ ] `APP_SECRET` liegt an einem zweiten Ort
