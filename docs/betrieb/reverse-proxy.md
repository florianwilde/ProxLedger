# HTTPS einrichten: nginx Proxy Manager oder netbird

ProxLedger spricht selbst kein HTTPS – davor gehört ein Reverse Proxy. Ohne ihn fehlen drei Dinge:

- **Passkeys** funktionieren nur im sicheren Kontext (HTTPS oder `localhost`).
- Das Sitzungs-Cookie bekommt kein `Secure`-Kennzeichen.
- Die Agent-Kommunikation läuft unverschlüsselt durchs Netz.

Fertige Beispiele für nginx, Caddy und Traefik liegen unter [`deploy/reverse-proxy/`](../../deploy/reverse-proxy/).
Dieses Dokument beschreibt die beiden Wege, die in der Praxis am häufigsten vorkommen.

---

## Weg A: nginx Proxy Manager

### 1. Proxy Host anlegen

*Hosts → Proxy Hosts → Add Proxy Host*, Reiter **Details**:

| Feld | Wert |
|---|---|
| Domain Names | `proxledger.firma.de` |
| Scheme | `http` |
| Forward Hostname / IP | IP des Docker-Hosts oder des LXC |
| Forward Port | `3000` |
| Cache Assets | aus |
| Block Common Exploits | an |
| Websockets Support | **an** |

Reiter **SSL**: *Request a new SSL Certificate*, dazu **Force SSL** und **HTTP/2 Support**.

### 2. Kopfzeilen ergänzen

Reiter **Advanced**, in das Feld *Custom Nginx Configuration*:

```nginx
# Ohne diese Angaben baut ProxLedger seine Weiterleitungen aus der internen Adresse
# (etwa http://172.18.0.4:3000) – im Browser landet man dann im Nichts.
proxy_set_header Host              $host;
proxy_set_header X-Forwarded-Host  $host;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header X-Real-IP         $remote_addr;
proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;

# Rechnungs-PDFs sind größer als die Standardgrenze von 1 MB.
client_max_body_size 12m;
```

### 3. In ProxLedger eintragen

```bash
APP_URL="https://proxledger.firma.de"
```

und unter *Einstellungen → System* dieselbe Adresse als **Adresse des Dashboards**. Sie steht danach
im Installations-Einzeiler für die Agents und ist die Grundlage für Passkeys und OIDC.

### 4. Prüfen

```bash
curl -fsS -o /dev/null -w "%{http_code}\n" https://proxledger.firma.de/api/gesundheit
curl -fsSI https://proxledger.firma.de/login | grep -i "content-security-policy\|strict-transport"
```

Danach einmal anmelden und darauf achten, dass die Adresszeile auf `proxledger.firma.de` bleibt.

---

## Weg B: netbird (kein offener Port)

netbird spannt ein privates Netz über WireGuard. ProxLedger ist dann **nur** für Geräte im Netz
erreichbar – kein Port im Internet, kein Zertifikat von außen nötig.

Das passt gut zu diesem Werkzeug: Die Oberfläche braucht niemand aus dem Internet, und die Proxmox-
Hosts stehen ohnehin meist in Kundennetzen mit netbird oder VPN.

### Aufbau

```
Proxmox-Host (netbird-Client) ──┐
Proxmox-Host (netbird-Client) ──┼── netbird-Netz ──► ProxLedger (netbird-Client, Port 3000)
Arbeitsplatz (netbird-Client) ──┘
```

### 1. netbird auf dem ProxLedger-Host

```bash
curl -fsSL https://pkgs.netbird.io/install.sh | sh
netbird up --setup-key <SETUP-KEY>
netbird status        # zeigt die vergebene Adresse, z. B. 100.x.y.z
```

### 2. netbird auf jedem Proxmox-Host

Gleiche Schritte. Danach von dort prüfen:

```bash
curl -fsS -o /dev/null -w "%{http_code}\n" http://100.x.y.z:3000/api/gesundheit
```

### 3. Zugriff einschränken

In der netbird-Verwaltung eine Access-Policy anlegen: Gruppe `proxmox-hosts` darf Gruppe
`proxledger` auf Port 3000 erreichen, sonst nichts. Damit können die Hosts melden, aber nicht
untereinander sprechen.

### 4. HTTPS trotzdem einrichten

netbird verschlüsselt den Transport – der Browser weiß davon aber nichts, und **Passkeys bleiben ohne
HTTPS gesperrt**. Zwei Möglichkeiten:

- **Empfohlen:** Zusätzlich einen kleinen Reverse Proxy im netbird-Netz betreiben (nginx oder Caddy)
  mit einem Zertifikat für einen internen Namen, ausgestellt über DNS-01 – dafür muss nichts nach
  außen offen sein.
- Oder ein eigenes CA-Zertifikat verteilen. Dann brauchen auch die Agents das CA-Zertifikat:
  `curl … | bash -s -- --token … --ca-cert /pfad/zur/ca.crt`.

Wer auf Passkeys verzichtet, kann ProxLedger im netbird-Netz auch schlicht über `http://100.x.y.z:3000`
betreiben. In dem Fall `APP_URL` auf genau diese Adresse setzen – sonst setzt ProxLedger ein
`Secure`-Cookie, das der Browser über `http` verwirft, und die Anmeldung läuft ins Leere.

---

## Beides zusammen

Der häufigste Aufbau in der Praxis:

| Zugang | Weg |
|---|---|
| Oberfläche für Mitarbeiter und Kunden | nginx Proxy Manager mit Let's-Encrypt-Zertifikat |
| Agents aus Kundennetzen | netbird, oder dieselbe öffentliche Adresse |

Wichtig ist nur, dass die Agents dieselbe Adresse erreichen, die im Installations-Einzeiler steht.
Ändert sich die Adresse später, genügt der Einzeiler erneut auf jedem Host – die Zuordnung bleibt
erhalten, weil sie an der Maschinenkennung hängt, nicht an der Adresse.

## Merkposten

1. **Adresse zuerst festlegen, dann Passkeys anlegen.** Ein Passkey gilt nur für die Domäne, unter der
   er registriert wurde.
2. **`APP_URL` und die Dashboard-Adresse müssen auf die öffentliche Adresse zeigen** – daraus entstehen
   Weiterleitungen, OIDC-Rückkehradresse und der Agent-Einzeiler.
3. **`client_max_body_size` nicht vergessen**, sonst scheitert das Hochladen von Rechnungs-PDFs mit
   einem nichtssagenden 413.
