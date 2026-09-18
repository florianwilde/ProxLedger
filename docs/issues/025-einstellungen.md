# #025 Einstellungen im Dashboard
**Status:** erledigt
**Meilenstein:** v0.16.0
**Labels:** backend, ui
**Geschätzt:** 5 h   **Tatsächlich:** 1 h 10 min

## Ziel
Werte, die heute im Quelltext oder in der Umgebung stehen, sollen sich im Dashboard ändern lassen –
allen voran die Dashboard-Adresse, die im Installations-Einzeiler landet.

## Aufgaben
- [x] Typisierter Einstellungsdienst mit Vorgaben und Prüfung (zod), alles in einer JSON-Zeile
- [x] Oberfläche unter *Einstellungen → System* mit vier Bereichen
- [x] **Adresse und Agent:** Dashboard-Adresse, Melderhythmus, Streuung, Selbstaktualisierung
- [x] **Kaufmännisches:** Währung, Steuersatz, Zahlungsziel, Aufschlag
- [x] **Sicherheit:** Sitzungsdauer, Anmeldeversuche, OIDC-Domänen, Konten anlegen, Aufbewahrungsfristen
- [x] **Firma und Darstellung:** Name, Anschrift, E-Mail, Zeitzone
- [x] Werte wirksam machen (nicht nur speichern)
- [x] Nächtliches Aufräumen nach den Aufbewahrungsfristen
- [x] Tests und Handbuchkapitel

## Wo die Werte wirken
| Einstellung | Wirkt in |
|---|---|
| Dashboard-Adresse | `/install.sh`, `/agent.sh`, Benachrichtigungen |
| Rhythmus, Streuung, Selbstaktualisierung | erzeugte systemd-Timer und `agent.conf` |
| Steuersatz | neue Rechnungspositionen (Einkauf und Verkauf) |
| Zahlungsziel | vorgeschlagenes Fälligkeitsdatum |
| Aufschlag | vorgeschlagener Verkaufspreis aus dem Einkaufspreis |
| Sitzungsdauer | Gültigkeit des Tokens und Lebensdauer des Cookies |
| Anmeldeversuche | Ratenbremse der Anmeldung |
| OIDC-Domänen, Konten anlegen | `mitOidcAnmelden` – schließt die in #024 vermerkte Lücke |
| Aufbewahrungsfristen | nächtlicher Lauf im Worker (03:30) |
| Firma, Zeitzone | Kopf und Datum der PDF-Ausgaben |

## Entscheidungen
- **Eine JSON-Zeile statt vieler Schlüssel:** Speichern ist ein Schreibvorgang, fehlende Felder
  bekommen ihren Vorgabewert, und eine kaputte Zeile legt den Betrieb nicht lahm – dann gelten die Vorgaben.
- **Zehn Sekunden Zwischenspeicher:** Die Werte werden bei fast jeder Anfrage gebraucht, ändern sich
  aber selten. Eine Änderung ist trotzdem sofort spürbar.
- **`APP_SECRET` und `DATABASE_URL` bleiben in der Umgebung**; beide werden vor dem ersten
  Datenbankzugriff gebraucht.
- **„Stumm nach X Tagen“ bewusst weggelassen:** Das steht schon als Schwellwert bei den Warnregeln.
  Zwei Stellen für denselben Wert wären eine Fehlerquelle.
- **Währung und Zeitzone wirken vorerst nur serverseitig** (PDF, CSV, Benachrichtigungen). Die
  Browseransicht rechnet weiterhin fest in Euro und Europe/Berlin – das nachzuziehen heißt, die
  Formatierung durch alle Client-Komponenten zu reichen, und gehört in einen eigenen Schritt.
