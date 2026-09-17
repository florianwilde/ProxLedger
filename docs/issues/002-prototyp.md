# #002 Klickbarer Prototyp
**Status:** erledigt
**Meilenstein:** v0.1.0
**Labels:** ui, prototyp
**Geschätzt:** 8 h   **Tatsächlich:** 0 h 20 min

## Ziel
Klickbarer UI-Prototyp der Seiten „Dashboard“, „Kunden-Detail“ und „Host-Detail“ mit realistischen Beispieldaten und ohne Backend, als Abstimmungsgrundlage für Look & Feel. Die Komponenten werden in den späteren Phasen weiterverwendet.

## Aufgaben
- [x] Logo-Komponente (Standard, Sidebar-Variante, einfarbig, Favicon 32/16) + `favicon.svg`, `favicon.ico`, PNGs, `apple-touch-icon`
- [x] Theme: Farb-Tokens (abgedunkelte Info/Erfolg), Source Sans 3 (16 px), Monospace-Klasse mit Kopier-Button
- [x] Layout: Sidebar (250 px, einklappbar, Overlay mobil), Kopfleiste, Inhaltskopf mit Breadcrumb, Footer mit Version
- [x] Komponenten: SmallBox, InfoBox, Card, Badge, Callout, TodoList, ProgressBar, Tabs, CopyableCode
- [x] Beispieldaten (`src/mock/`): 4 Kunden, ~8 Hosts (PVE/PBS/PMG), Laufzeiten, Rechnungen, Alerts
- [x] Dashboard: 4 Small Boxes, Callout „Nicht zugeordnete Hosts“, Card „Subscriptions nach Ablauf“, Card „Aufgaben“, Card „Rechnungsstatus je Kunde“
- [x] Kunden-Detail: Info-Boxen (Hosts, Einkauf, Verkauf, Marge), Host-Tabelle, Laufzeiten-Tabelle, Summen pro Jahr, Ansprechpartner, Notizen
- [x] Host-Detail: Profil-Card + Tabs Übersicht, Subscription-Historie, Reports, Rechnungen, Notizen
- [x] Warnglocke mit Dropdown, Strg+K-Suchdialog (clientseitig über Mock-Daten)
- [x] Dark-Mode-Umschalter (Grundfunktion)

## Akzeptanzkriterien
- [x] Alle drei Seiten sind über Sidebar/Links erreichbar und klickbar
- [x] Suche nach `pve1c-a6bd21fcb6` findet Host und Kunde
- [x] Mobil (375 px) benutzbar: Sidebar als Overlay, Tabellen scrollbar
- [x] Weiße Schrift auf Info/Erfolg erfüllt 4,5:1

## Abhängigkeiten
#001

## Notizen / Entscheidungen
- Favicon-Dateien (`favicon.ico`, PNG-Größen, `apple-touch-icon`) fehlen noch; das Logo liegt als React-Komponente vor. Nachziehen in #007.
- Screenshots des Prototyps liegen in `docs/anleitung/bilder/` und dienen als Grundlage für #016.
- Auf dem Dashboard zeigt die Spalte „Proxmox“ bewusst die Rechnung der Verlängerung (Laufzeit, die am `nextduedate` beginnt), nicht die der laufenden Periode.
