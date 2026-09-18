import { prisma } from "@/lib/db";
import { sichtbarerKunde } from "@/server/auth/sitzungspflicht";

/** Frist, nach der ein Host als „meldet sich nicht“ gilt (konfigurierbar ab #011). */
export const MELDUNG_FRIST_STUNDEN = 48;

export function meldungsGrenze(jetzt: Date = new Date()): Date {
  return new Date(jetzt.getTime() - MELDUNG_FRIST_STUNDEN * 3_600_000);
}

export async function hostsOhneKunde() {
  // Ein Kundenkonto hat hier nichts zu suchen: Nicht zugeordnete Hosts gehören per Definition
  // noch niemandem, dürfen also auch niemandem gezeigt werden.
  if (await sichtbarerKunde()) return [];

  return prisma.host.findMany({
    where: { kundeId: null },
    orderBy: { erstmalsGesehenAm: "desc" },
  });
}

export async function hostAnzahl() {
  const kundeId = await sichtbarerKunde();
  return prisma.host.count({ where: kundeId ? { kundeId } : {} });
}

/** Kennzahlen für Dashboard-Kacheln und Sidebar-Badges. */
export async function kennzahlen(jetzt: Date = new Date()) {
  const in30Tagen = new Date(jetzt.getTime() + 30 * 86_400_000);
  const kundeId = await sichtbarerKunde();
  const hostSicht = kundeId ? { kundeId } : {};
  const laufzeitSicht = kundeId ? { host: { kundeId } } : {};

  const [gesamt, aktiv, ohneKunde, baldAblaufend, ohneMeldung, offeneAlerts] = await Promise.all([
    prisma.host.count({ where: hostSicht }),
    prisma.host.count({ where: { ...hostSicht, subStatus: "ACTIVE" } }),
    kundeId ? Promise.resolve(0) : prisma.host.count({ where: { kundeId: null } }),
    prisma.host.count({ where: { ...hostSicht, subNextduedate: { gte: jetzt, lte: in30Tagen } } }),
    prisma.host.count({
      where: {
        ...hostSicht,
        OR: [{ letzterReportAm: null }, { letzterReportAm: { lt: meldungsGrenze(jetzt) } }],
      },
    }),
    prisma.alert.count({ where: { erledigtAm: null, ...(kundeId ? { host: { kundeId } } : {}) } }),
  ]);

  const [offeneEinkaufsrechnungen, fehlendeKundenrechnungen] = await Promise.all([
    // Einkaufsrechnungen gehen ein Kundenkonto nichts an.
    kundeId
      ? Promise.resolve(0)
      : prisma.laufzeit.count({
          where: { status: "BESTAETIGT", proxmoxPosition: { rechnung: { bezahlt: false } } },
        }),
    kundeId
      ? Promise.resolve(0)
      : prisma.laufzeit.count({
          where: {
            ...laufzeitSicht,
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
  const kundeId = await sichtbarerKunde();

  return prisma.alert.findMany({
    where: { erledigtAm: null, ...(kundeId ? { host: { kundeId } } : {}) },
    orderBy: [{ schwere: "asc" }, { geoeffnetAm: "desc" }],
    take: anzahl,
  });
}

/** Einträge für die globale Suche (Strg+K). */
export async function suchIndex() {
  const kundeId = await sichtbarerKunde();

  const [hosts, kunden, proxmoxRechnungen, kundenrechnungen] = await Promise.all([
    prisma.host.findMany({
      where: kundeId ? { kundeId } : {},
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
      where: kundeId ? { id: kundeId } : {},
      select: { id: true, name: true, kundennummer: true, ansprechpartner: true, email: true },
    }),
    // Proxmox-Rechnungen sind Einkauf – für ein Kundenkonto gibt es sie schlicht nicht.
    kundeId
      ? Promise.resolve([])
      : prisma.proxmoxRechnung.findMany({
          select: { id: true, nummer: true, positionen: { select: { laufzeit: { select: { hostId: true } } } } },
        }),
    prisma.kundenrechnung.findMany({
      where: { nummer: { not: null }, ...(kundeId ? { kundeId } : {}) },
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
