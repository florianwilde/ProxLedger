# #002 Klickbarer Prototyp
**Status:** offen
**Meilenstein:** v0.1.0
**Labels:** ui, prototyp
**Geschätzt:** 8 h   **Tatsächlich:** –

## Ziel
Klickbarer UI-Prototyp der Seiten „Dashboard“, „Kunden-Detail“ und „Host-Detail“ mit realistischen Beispieldaten und ohne Backend, als Abstimmungsgrundlage für Look & Feel. Die Komponenten werden in den späteren Phasen weiterverwendet.

## Aufgaben
- [ ] Logo-Komponente (Standard, Sidebar-Variante, einfarbig, Favicon 32/16) + `favicon.svg`, `favicon.ico`, PNGs, `apple-touch-icon`
- [ ] Theme: Farb-Tokens (abgedunkelte Info/Erfolg), Source Sans 3 (16 px), Monospace-Klasse mit Kopier-Button
- [ ] Layout: Sidebar (250 px, einklappbar, Overlay mobil), Kopfleiste, Inhaltskopf mit Breadcrumb, Footer mit Version
- [ ] Komponenten: SmallBox, InfoBox, Card, Badge, Callout, TodoList, ProgressBar, Tabs, CopyableCode
- [ ] Beispieldaten (`src/mock/`): 4 Kunden, ~8 Hosts (PVE/PBS/PMG), Laufzeiten, Rechnungen, Alerts
- [ ] Dashboard: 4 Small Boxes, Callout „Nicht zugeordnete Hosts“, Card „Subscriptions nach Ablauf“, Card „Aufgaben“, Card „Rechnungsstatus je Kunde“
- [ ] Kunden-Detail: Info-Boxen (Hosts, Einkauf, Verkauf, Marge), Host-Tabelle, Laufzeiten-Tabelle, Summen pro Jahr, Ansprechpartner, Notizen
- [ ] Host-Detail: Profil-Card + Tabs Übersicht, Subscription-Historie, Reports, Rechnungen, Notizen
- [ ] Warnglocke mit Dropdown, Strg+K-Suchdialog (clientseitig über Mock-Daten)
- [ ] Dark-Mode-Umschalter (Grundfunktion)

## Akzeptanzkriterien
- [ ] Alle drei Seiten sind über Sidebar/Links erreichbar und klickbar
- [ ] Suche nach `pve1c-a6bd21fcb6` findet Host und Kunde
- [ ] Mobil (375 px) benutzbar: Sidebar als Overlay, Tabellen scrollbar
- [ ] Weiße Schrift auf Info/Erfolg erfüllt 4,5:1

## Abhängigkeiten
#001

## Notizen / Entscheidungen
