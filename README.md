# ProxLedger

Zentrales Dashboard für den Subscription-Status aller Proxmox-Hosts (VE, Backup Server, Mail Gateway).
Auf jedem Host meldet ein schlanker Agent täglich per HTTPS seinen Status (Push-Modell) – auch aus Kundennetzen hinter NAT.

> **Status:** in Entwicklung (0.1.0-dev). Noch nicht produktiv einsetzen.

## Entwicklung

Voraussetzungen: Node.js ≥ 24, Docker (für PostgreSQL ab #003).

```bash
npm install
npm run dev        # http://localhost:3000
npm run lint
npm run typecheck
npm test
```

## Dokumentation

- [Architektur- und Umsetzungsplan](docs/architektur.md)
- [Issues](docs/issues/README.md)
- [Changelog](CHANGELOG.md) · [Devlog](DEVLOG.md)
