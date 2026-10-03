# #037 Rabatt je Position und der tatsächliche Ablauf
**Status:** erledigt
**Meilenstein:** v0.22.0
**Labels:** backend, ui
**Geschätzt:** 3 h   **Tatsächlich:** 0 h 55 min

## Auslöser
Florian zeigte eine echte Proxmox-Rechnung (#291017) und beschrieb den Ablauf:

```
Proxmox VE Standard Subscription 2 CPUs/year - pve2s-3ef3be4d75   € 1.100,00
Proxmox VE Standard Subscription 2 CPUs/year - pve2s-b7a0d516af   € 1.100,00
Client Discount - … pve2s-3ef3be4d75                              €  -110,00
Client Discount - … pve2s-b7a0d516af                              €  -110,00
Sub Total                                                         € 1.980,00
```

Dazu: Man bekommt die Rechnung zuerst als **UNPAID**. Erst wenn der Kunde seine Rechnung bezahlt hat,
zahlt man selbst bei Proxmox – und bekommt dieselbe Rechnung dann als **PAID** mit Transaktion.

## Was falsch war
1. **Der Rabatt hing an der Rechnung, nicht an der Position.** Bei einer Sammelrechnung über zwei
   Hosts ließe sich ein Rabatt keinem Host zuordnen; die Marge je Host wäre falsch.
2. **Er wurde nirgends abgezogen** – weder in der Summe noch in der Marge. Ein Feld, das aussieht wie
   eine Rechengröße und keine ist.
3. **Vorgabe 19 % USt** für den Einkauf. Proxmox sitzt in Österreich und rechnet gegenüber Unternehmen
   mit USt-IdNr. über Reverse Charge ab – richtig sind 0 %.

## Behebung
- `rabatt` wandert an `ProxmoxRechnungPosition`; die Migration verteilt vorhandene Werte anteilig auf
  die Positionen und rechnet die Rechnungssummen neu. Nichts geht verloren.
- Rechnungsbetrag = Summe der Positionen **nach Abzug ihrer Rabatte** – wie das „Sub Total“ auf der
  echten Rechnung.
- Marge und alle Summen rechnen mit dem Betrag nach Abzug.
- Das Formular heißt jetzt „Listenpreis netto“ und zeigt beim Tippen, womit gerechnet wird.
- Eigener Steuersatz für den Einkauf, Vorgabe 0 (Reverse Charge).
- Die Sammelrechnung listet je Position „1.100,00 € − 110,00 € = 990,00 €“.

## Neue Warnregel
`kunde-bezahlt-einkauf-offen`: Der Kunde hat bezahlt, die Proxmox-Rechnung ist noch offen. Genau der
Zustand aus Florians Ablauf – das Geld ist da, die Rechnung auch, jetzt kann gezahlt werden. Bewusst
unabhängig vom Fälligkeitsdatum, denn die Reihenfolge ist Absicht und keine Nachlässigkeit.

## Zum PDF
Die PAID-Fassung ersetzt beim erneuten Hochladen einfach die UNPAID-Fassung – gleiche Rechnungsnummer,
gleiche Rechnung. Gleiche Dateien werden an ihrer Prüfsumme erkannt und nicht doppelt abgelegt.
