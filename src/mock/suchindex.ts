import { hosts, kunden, laufzeiten } from "./data";
import { PRODUKT_NAME, getKunde } from "./queries";

export interface SuchEintrag {
  typ: "Host" | "Kunde" | "Rechnung";
  titel: string;
  untertitel: string;
  href: string;
  /** Alle durchsuchbaren Werte in Kleinschreibung. */
  begriffe: string[];
}

/** Flacher Suchindex für die globale Suche (Strg+K) im Prototyp. */
export function suchIndex(): SuchEintrag[] {
  const eintraege: SuchEintrag[] = [];

  for (const host of hosts) {
    const kunde = getKunde(host.kundeId);
    eintraege.push({
      typ: "Host",
      titel: host.hostname,
      untertitel: `${PRODUKT_NAME[host.produkt]} · ${kunde?.name ?? "Nicht zugeordnet"}${
        host.subscription.key ? ` · ${host.subscription.key}` : ""
      }`,
      href: `/hosts/${host.id}`,
      begriffe: [host.hostname, host.fqdn, host.serverId, host.subscription.key, ...host.ips]
        .filter((w): w is string => Boolean(w))
        .map((w) => w.toLowerCase()),
    });
  }

  for (const kunde of kunden) {
    eintraege.push({
      typ: "Kunde",
      titel: kunde.name,
      untertitel: `${kunde.kundennummer}${kunde.ansprechpartner ? ` · ${kunde.ansprechpartner}` : ""}`,
      href: `/kunden/${kunde.id}`,
      begriffe: [kunde.name, kunde.kundennummer, kunde.ansprechpartner, kunde.email]
        .filter((w): w is string => Boolean(w))
        .map((w) => w.toLowerCase()),
    });
  }

  for (const laufzeit of laufzeiten) {
    const host = hosts.find((h) => h.id === laufzeit.hostId);
    const kunde = getKunde(host?.kundeId ?? null);
    for (const [art, rechnung] of [
      ["Proxmox-Rechnung", laufzeit.einkauf],
      ["Kundenrechnung", laufzeit.verkauf],
    ] as const) {
      if (!rechnung?.nummer) continue;
      eintraege.push({
        typ: "Rechnung",
        titel: rechnung.nummer,
        untertitel: `${art} · ${host?.hostname ?? "?"} · ${kunde?.name ?? "Nicht zugeordnet"}`,
        href: `/hosts/${laufzeit.hostId}`,
        begriffe: [rechnung.nummer.toLowerCase()],
      });
    }
  }

  return eintraege;
}
