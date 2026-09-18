# Anmeldung über authentik (OIDC)

ProxLedger kann die Anmeldung an einen OIDC-Anbieter abgeben. Getestet ist authentik; mit jedem
anderen Anbieter, der OpenID Connect Discovery beherrscht, funktioniert es genauso.

**Der lokale Zugang bleibt daneben immer bestehen.** Das ist Absicht: Fällt authentik aus, kommt man
trotzdem noch ins Dashboard.

---

## 1. In authentik: Provider anlegen

*Applications → Providers → Create → OAuth2/OpenID Provider*

| Feld | Wert |
|---|---|
| Name | `ProxLedger` |
| Authorization flow | der übliche (z. B. *default-provider-authorization-implicit-consent*) |
| Client type | **Confidential** |
| Client ID | übernehmen, wird gleich gebraucht |
| Client Secret | übernehmen, wird gleich gebraucht |
| Redirect URIs | `https://proxledger.firma.de/api/auth/oidc/callback` |
| Scopes | `openid`, `email`, `profile` |
| Signing Key | ein vorhandenes Zertifikat auswählen |

Zur Rückkehradresse zwei Hinweise, an denen die meisten Einrichtungen scheitern:

- Sie muss **wortgleich** übereinstimmen – einschließlich `https`, Portangabe und ohne Schrägstrich am
  Ende. ProxLedger bildet sie aus der Dashboard-Adresse unter *Einstellungen → System*, ersatzweise aus
  `APP_URL`.
- authentik erlaubt auch reguläre Ausdrücke. Für eine einzelne Installation ist die genaue Adresse die
  bessere Wahl; ein zu weiter Ausdruck öffnet eine Umleitung auf fremde Ziele.

## 2. In authentik: Application anlegen

*Applications → Applications → Create*

| Feld | Wert |
|---|---|
| Name | `ProxLedger` |
| Slug | `proxledger` |
| Provider | der eben angelegte |

Der Slug bestimmt die Discovery-Adresse:

```
https://authentik.firma.de/application/o/proxledger/.well-known/openid-configuration
```

Diese Adresse **ohne** den Teil `/.well-known/openid-configuration` ist der Aussteller
(`OIDC_ISSUER`) – also `https://authentik.firma.de/application/o/proxledger/`.

Prüfen lässt sie sich mit:

```bash
curl -fsS https://authentik.firma.de/application/o/proxledger/.well-known/openid-configuration | head
```

Wer darf sich anmelden, entscheidet in authentik die **Policy-Bindung** an der Application
(*Applications → ProxLedger → Policy / Group / User Bindings*). Ohne Bindung darf jeder, der bei
authentik ein Konto hat.

## 3. In ProxLedger: Werte eintragen

In die `.env` (Docker) oder `/opt/proxledger/.env` (LXC):

```bash
OIDC_ISSUER="https://authentik.firma.de/application/o/proxledger/"
OIDC_CLIENT_ID="…"
OIDC_CLIENT_SECRET="…"
OIDC_NAME="authentik"          # Beschriftung des Knopfes auf der Anmeldeseite
APP_URL="https://proxledger.firma.de"
```

Danach neu starten:

```bash
docker compose up -d           # Docker
systemctl restart proxledger   # LXC
```

Auf der Anmeldeseite erscheint jetzt **Mit authentik anmelden**.

## 4. Rollen festlegen

ProxLedger liest **keine** Gruppen aus authentik. Wer sich zum ersten Mal anmeldet, bekommt die Rolle
aus *Einstellungen → System → Rolle für neue OIDC-Konten* – Vorgabe ist **Techniker**. Die endgültige
Rolle vergibt ein Administrator unter *Einstellungen → Benutzer*.

Das ist bewusst so: Eine Gruppenzuordnung, die stillschweigend Administratorrechte verteilt, ist
schwerer zu überblicken als eine Liste, in der jeder Zugang sichtbar ist.

Zwei Einstellungen helfen dabei, den Kreis klein zu halten:

- **Erlaubte E-Mail-Domänen** – etwa `firma.de`. Alles andere wird abgewiesen, auch wenn die Anmeldung
  bei authentik geklappt hat.
- **Unbekannte OIDC-Anmeldungen legen ein Konto an** – abgeschaltet kommt nur herein, wer hier bereits
  ein Konto hat. Dann legt man Konten vorab an (ohne Passwort) und die Anmeldung läuft trotzdem über
  authentik.

## 5. Prüfen

1. Abmelden, dann **Mit authentik anmelden**.
2. Unter *Einstellungen → Protokoll* steht `anmeldung.erfolgreich` mit `weg: oidc`.
3. Unter *Einstellungen → Benutzer* steht das Konto mit der vergebenen Rolle und der Anmeldeart `OIDC`.

## Wenn es nicht klappt

| Meldung | Ursache |
|---|---|
| „Die Anmeldung über den Anbieter hat nicht geklappt.“ | Sammelmeldung – die Einzelheiten stehen im Protokoll des Containers (`docker compose logs web`). |
| authentik zeigt *Redirect URI Error* | Die Adresse stimmt nicht wortgleich. Häufig: `http` statt `https`, Schrägstrich am Ende, oder die interne statt der öffentlichen Adresse. |
| `invalid_client` | Client-ID oder -Secret falsch, oder der Provider steht auf *Public* statt *Confidential*. |
| Anmeldung klappt, aber ProxLedger meldet „keine E-Mail-Adresse“ | Der Scope `email` fehlt am Provider. |
| Nach der Anmeldung landet man auf einer unerreichbaren Adresse | `APP_URL` bzw. die Dashboard-Adresse zeigt nicht auf die öffentliche Adresse. |

Siehe auch: [Reverse Proxy](reverse-proxy.md) – ohne HTTPS gibt es weder sinnvolle OIDC-Anmeldung noch
Passkeys.
