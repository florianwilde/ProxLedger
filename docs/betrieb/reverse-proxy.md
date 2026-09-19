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

## Weg B: netbird Reverse Proxy (Beta)

Seit v0.65 bringt netbird einen **eigenen Reverse Proxy** mit; v0.72 hat private Dienste und „Bring
Your Own Proxy“ ergänzt. Damit entfällt der nginx Proxy Manager vollständig: netbird übernimmt die
TLS-Terminierung und reicht den Verkehr durch das Mesh an den Ziel-Peer weiter – **ohne offenen Port
und ohne Firewall-Regel auf dem ProxLedger-Host**.

Für ProxLedger ist das der bequemste Weg, weil er die beiden Dinge löst, an denen es sonst hakt: ein
gültiges Zertifikat (damit Passkeys funktionieren) und eine feste öffentliche Adresse.

> **Beta.** Die Funktion ist als Beta gekennzeichnet. Sie unterstützt derzeit **kein Rosenpass**, und
> wer netbird selbst hostet, braucht **Traefik** als äußeren Proxy – nur der beherrscht das nötige
> TLS-Passthrough.

### 1. Dienst anlegen

Im netbird-Dashboard unter *Services → Reverse Proxy → Create*:

| Reiter | Einstellung |
|---|---|
| **Details** | Mode `HTTP`; Subdomain `proxledger`, dazu eine Basis-Domäne; als Target den Peer mit ProxLedger, Protokoll `HTTP`, Port `3000` |
| **Authentication** | für ProxLedger **aus lassen** – Begründung unten |
| **Access Control** | nach Bedarf: IP-Bereiche, Länder, CrowdSec-Bewertung |
| **Settings** | *Host header forwarding* **an**, ebenso das Umschreiben von Weiterleitungen |

Das Zertifikat besorgt netbird selbst über ACME (Let's Encrypt); alternativ lassen sich eigene
Zertifikate hinterlegen.

**Host header forwarding ist nicht optional.** ProxLedger bildet Weiterleitungen, die OIDC-Rückkehr
und die `rpID` der Passkeys aus der öffentlichen Adresse. Kommt beim Dienst nur die interne Adresse
an, landet man nach der Anmeldung auf einer Adresse, die es im Browser nicht gibt.

### 2. Adresse eintragen

```bash
APP_URL="https://proxledger.<ihre-basis-domaene>"
```

und dieselbe Adresse unter *Einstellungen → System* als **Adresse des Dashboards**. Danach neu starten.

### 3. Warum die netbird-Anmeldung hier ausbleiben sollte

netbird kann den Dienst zusätzlich absichern – per SSO über den eigenen Identitätsanbieter, per
Passwort, PIN oder Kopfzeile. Verlockend, aber für ProxLedger meist falsch:

**Die Absicherung gilt für den ganzen Dienst, also auch für `/api/agent`.** Die Agents auf den
Proxmox-Hosts können sich dort nicht anmelden – sie weisen sich mit ihrem eigenen Token aus. Steht
eine SSO-Hürde davor, melden alle Hosts stumm ins Leere, bis der Zwischenspeicher voll ist.

Zwei Wege, wenn die zusätzliche Hürde gewünscht ist:

1. **Zwei Dienste anlegen:** einen für die Oberfläche mit SSO, einen zweiten (eigene Subdomain) ohne
   Anmeldung für die Agents. Im Installations-Einzeiler dann die Agent-Adresse verwenden
   (`--url https://agents.<domaene>`).
2. **Privater Dienst:** netbird kann einen Dienst so schalten, dass er **nur** aus dem eigenen Netz und
   nur für ausgewählte Gruppen erreichbar ist. Das ist die sauberste Lösung, wenn sowohl Arbeitsplätze
   als auch alle Proxmox-Hosts ohnehin im netbird-Netz sind: kein offener Zugang, trotzdem gültiges
   Zertifikat und damit Passkeys.

### 4. Prüfen

```bash
curl -fsS -o /dev/null -w "%{http_code}\n" https://proxledger.<domaene>/api/gesundheit
curl -fsS https://proxledger.<domaene>/install.sh | grep -m1 DASHBOARD_URL
```

Die zweite Zeile muss die **öffentliche** Adresse zeigen – das ist die, die später in jedem Agent steht.

---

## Weg C: netbird ohne Reverse Proxy (kein offener Port)

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
HTTPS gesperrt**. Am einfachsten ist hier der Reverse Proxy aus Weg B (auch als privater Dienst
nutzbar). Sonst bleiben zwei Möglichkeiten:

- **Empfohlen:** Zusätzlich einen kleinen Reverse Proxy im netbird-Netz betreiben (nginx oder Caddy)
  mit einem Zertifikat für einen internen Namen, ausgestellt über DNS-01 – dafür muss nichts nach
  außen offen sein.
- Oder ein eigenes CA-Zertifikat verteilen. Dann brauchen auch die Agents das CA-Zertifikat:
  `curl … | bash -s -- --token … --ca-cert /pfad/zur/ca.crt`.

Wer auf Passkeys verzichtet, kann ProxLedger im netbird-Netz auch schlicht über `http://100.x.y.z:3000`
betreiben. In dem Fall `APP_URL` auf genau diese Adresse setzen – sonst setzt ProxLedger ein
`Secure`-Cookie, das der Browser über `http` verwirft, und die Anmeldung läuft ins Leere.

---

## Welcher Weg wofür

| Lage | Empfehlung |
|---|---|
| Eigener Server, Domäne vorhanden, Kunden sollen zugreifen | **Weg A** – nginx Proxy Manager |
| Alles läuft ohnehin über netbird, Zertifikat gewünscht | **Weg B** – netbird Reverse Proxy, bei Bedarf als privater Dienst |
| Kein offener Zugang, keine Passkeys nötig | **Weg C** – netbird pur, `APP_URL` auf die netbird-Adresse |

Weg B ist der kürzeste, wenn netbird ohnehin im Einsatz ist: ein Dienst, ein Zertifikat, kein
offener Port. Nur die Beta-Kennzeichnung sollte man im Hinterkopf behalten und nicht gleichzeitig auf
etwas anderes umstellen, damit bei einem Problem klar ist, woran es liegt.

Der häufigste gemischte Aufbau:

| Zugang | Weg |
|---|---|
| Oberfläche für Mitarbeiter und Kunden | nginx Proxy Manager oder netbird Reverse Proxy |
| Agents aus Kundennetzen | netbird-Netz, oder dieselbe öffentliche Adresse |

Wichtig ist nur, dass die Agents dieselbe Adresse erreichen, die im Installations-Einzeiler steht.
Ändert sich die Adresse später, genügt der Einzeiler erneut auf jedem Host – die Zuordnung bleibt
erhalten, weil sie an der Maschinenkennung hängt, nicht an der Adresse.

## Merkposten

0. **Keine Anmeldehürde vor `/api/agent`.** Egal welcher Proxy: Wer die Oberfläche zusätzlich absichert,
   schließt damit auch die Agents aus – die weisen sich mit eigenem Token aus und können sich nirgends
   anmelden.
1. **Adresse zuerst festlegen, dann Passkeys anlegen.** Ein Passkey gilt nur für die Domäne, unter der
   er registriert wurde.
2. **`APP_URL` und die Dashboard-Adresse müssen auf die öffentliche Adresse zeigen** – daraus entstehen
   Weiterleitungen, OIDC-Rückkehradresse und der Agent-Einzeiler.
3. **`client_max_body_size` nicht vergessen**, sonst scheitert das Hochladen von Rechnungs-PDFs mit
   einem nichtssagenden 413.
