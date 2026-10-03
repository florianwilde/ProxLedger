# #041 Gleichnamige Hosts erkennen und stilllegen
**Status:** erledigt
**Meilenstein:** v0.24.0
**Labels:** backend, ui, alerts
**Geschätzt:** 3 h   **Tatsächlich:** 0 h 50 min

## Auslöser
Florian markierte in der Host-Liste zwei Paare: `hv-pve-01` und `hv-pve-02` standen jeweils **zweimal
beim selben Kunden** – einmal „Aktiv“ mit einer IP, einmal „Keine Subscription“ mit drei anderen.

## Was dahintersteckt
Hosts werden an ihrer Kennung aus `/etc/machine-id` erkannt, nicht am Namen. Ändert sich diese Kennung
– Neuinstallation, geklonter Container, zurückgespielte Sicherung –, meldet sich dieselbe Maschine als
**neuer** Host, und der alte Eintrag bleibt stehen. Zwei getrennte Maschinen mit gleichem Namen sind
aber genauso möglich. Welcher Fall vorliegt, weiß nur der Betreiber.

## Was fehlte
1. Kein Hinweis auf den Doppeleintrag.
2. **Keine Möglichkeit, einen Host loszuwerden.** Ein Eintrag, der nicht mehr existiert, blieb für
   immer in Listen, Zahlen und Warnungen stehen.

## Behebung
- **Dreizehnte Warnregel `hostname-doppelt`:** meldet mehrere Hosts desselben Kunden mit gleichem
  Namen und nennt die IP-Adressen zum Unterscheiden. Gleiche Namen bei **verschiedenen** Kunden sind
  der Normalfall und bleiben still.
- **Stilllegen** (`archiviertAm`): Der Host verschwindet aus Listen, Zahlen, Suche und Warnungen;
  seine offenen Warnungen werden geschlossen. Laufzeiten und Rechnungen bleiben erhalten.
- **Wieder aufnehmen** mit demselben Knopf.
- **Endgültig löschen** nur, solange keine Laufzeit am Host hängt – Buchhaltung wirft man nicht weg.
- In der Liste ein Schalter „stillgelegte Hosts zeigen“ und ein Abzeichen an der Zeile.

## Entscheidung
Stilllegen statt automatisch zusammenführen. Ein Zusammenführen müsste raten, welcher Eintrag welche
Rechnung erbt – im Zweifel zulasten der Buchhaltung. Die Warnung nennt beide Hosts mit IPs; die
Entscheidung trifft der Mensch.
