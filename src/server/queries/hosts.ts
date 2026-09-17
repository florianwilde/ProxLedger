import { prisma } from "@/lib/db";

/** Frist, nach der ein Host als „meldet sich nicht“ gilt (konfigurierbar ab #011). */
export const MELDUNG_FRIST_STUNDEN = 48;

export function meldungsGrenze(jetzt: Date = new Date()): Date {
  return new Date(jetzt.getTime() - MELDUNG_FRIST_STUNDEN * 3_600_000);
}

export async function hostsOhneKunde() {
  return prisma.host.findMany({
    where: { kundeId: null },
    orderBy: { erstmalsGesehenAm: "desc" },
  });
}

export async function hostAnzahl() {
  return prisma.host.count();
}

/** Kennzahlen für Dashboard-Kacheln und Sidebar-Badges. */
export async function kennzahlen(jetzt: Date = new Date()) {
  const in30Tagen = new Date(jetzt.getTime() + 30 * 86_400_000);

  const [gesamt, aktiv, ohneKunde, baldAblaufend, ohneMeldung, offeneAlerts] = await Promise.all([
    prisma.host.count(),
    prisma.host.count({ where: { subStatus: "ACTIVE" } }),
    prisma.host.count({ where: { kundeId: null } }),
    prisma.host.count({ where: { subNextduedate: { gte: jetzt, lte: in30Tagen } } }),
    prisma.host.count({
      where: { OR: [{ letzterReportAm: null }, { letzterReportAm: { lt: meldungsGrenze(jetzt) } }] },
    }),
    prisma.alert.count({ where: { erledigtAm: null } }),
  ]);

  const [offeneEinkaufsrechnungen, fehlendeKundenrechnungen] = await Promise.all([
    prisma.laufzeit.count({
      where: { status: "BESTAETIGT", proxmoxPosition: { rechnung: { bezahlt: false } } },
    }),
    prisma.laufzeit.count({
      where: {
        status: "BESTAETIGT",
        proxmoxPosition: { isNot: null },
        OR: [{ kundenPosition: null }, { kundenPosition: { rechnung: { erstellt: false } } }],
      },
    }),
  ]);

  return {
    hostsGesamt: gesamt,
    aktivLizenziert: aktiv,
    ohneSubscription: gesamt - aktiv,
    ohneKunde,
    baldAblaufend,
    ohneMeldung,
    offeneAlerts,
    offeneEinkaufsrechnungen,
    fehlendeKundenrechnungen,
    offeneRechnungspunkte: offeneEinkaufsrechnungen + fehlendeKundenrechnungen,
  };
}

export async function offeneAlerts(anzahl = 20) {
  return prisma.alert.findMany({
    where: { erledigtAm: null },
    orderBy: [{ schwere: "asc" }, { geoeffnetAm: "desc" }],
    take: anzahl,
  });
}

/** Einträge für die globale Suche (Strg+K). */
export async function suchIndex() {
  const [hosts, kunden, proxmoxRechnungen, kundenrechnungen] = await Promise.all([
    prisma.host.findMany({
      select: {
        id: true,
        hostname: true,
        fqdn: true,
        serverId: true,
        subKey: true,
        ips: true,
        produkt: true,
        kunde: { select: { name: true } },
      },
    }),
    prisma.kunde.findMany({
      select: { id: true, name: true, kundennummer: true, ansprechpartner: true, email: true },
    }),
    prisma.proxmoxRechnung.findMany({
      select: { id: true, nummer: true, positionen: { select: { laufzeit: { select: { hostId: true } } } } },
    }),
    prisma.kundenrechnung.findMany({
      where: { nummer: { not: null } },
      select: { id: true, nummer: true, kunde: { select: { id: true, name: true } } },
    }),
  ]);

  const eintraege = [
    ...hosts.map((host) => ({
      typ: "Host" as const,
      titel: host.hostname,
      untertitel: `${host.produkt} · ${host.kunde?.name ?? "Nicht zugeordnet"}${
        host.subKey ? ` · ${host.subKey}` : ""
      }`,
      href: `/hosts/${host.id}`,
      begriffe: [host.hostname, host.fqdn, host.serverId, host.subKey, ...host.ips]
        .filter((w): w is string => Boolean(w))
        .map((w) => w.toLowerCase()),
    })),
    ...kunden.map((kunde) => ({
      typ: "Kunde" as const,
      titel: kunde.name,
      untertitel: `${kunde.kundennummer}${kunde.ansprechpartner ? ` · ${kunde.ansprechpartner}` : ""}`,
      href: `/kunden/${kunde.id}`,
      begriffe: [kunde.name, kunde.kundennummer, kunde.ansprechpartner, kunde.email]
        .filter((w): w is string => Boolean(w))
        .map((w) => w.toLowerCase()),
    })),
    ...proxmoxRechnungen.map((rechnung) => ({
      typ: "Rechnung" as const,
      titel: rechnung.nummer,
      untertitel: `Proxmox-Rechnung · ${rechnung.positionen.length} Position(en)`,
      href: `/rechnungen?q=${encodeURIComponent(rechnung.nummer)}`,
      begriffe: [rechnung.nummer.toLowerCase()],
    })),
    ...kundenrechnungen.map((rechnung) => ({
      typ: "Rechnung" as const,
      titel: rechnung.nummer ?? "",
      untertitel: `Kundenrechnung · ${rechnung.kunde.name}`,
      href: `/kunden/${rechnung.kunde.id}`,
      begriffe: [(rechnung.nummer ?? "").toLowerCase()],
    })),
  ];

  return eintraege;
}
