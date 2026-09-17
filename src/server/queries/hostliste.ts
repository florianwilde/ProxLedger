import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { meldungsGrenze } from "./hosts";

export interface HostFilter {
  q?: string;
  kunde?: string;
  status?: string;
  produkt?: string;
  ablauf?: "30" | "14" | "abgelaufen";
  rechnung?: "offen";
  sortierung?: string;
  seite?: number;
}

export const SEITENGROESSE = 25;

/** Baut die Where-Bedingung aus den Filtern der Host-Tabelle. */
function bedingung(filter: HostFilter, jetzt: Date): Prisma.HostWhereInput {
  const und: Prisma.HostWhereInput[] = [];

  if (filter.q && filter.q.trim().length > 0) {
    const suche = filter.q.trim();
    und.push({
      OR: [
        { hostname: { contains: suche, mode: "insensitive" } },
        { fqdn: { contains: suche, mode: "insensitive" } },
        { serverId: { contains: suche, mode: "insensitive" } },
        { subKey: { contains: suche, mode: "insensitive" } },
        { ips: { has: suche } },
        { kunde: { name: { contains: suche, mode: "insensitive" } } },
        // Suche nach einer Proxmox-Rechnungsnummer führt ebenfalls zum Host.
        {
          laufzeiten: {
            some: {
              OR: [
                { proxmoxPosition: { rechnung: { nummer: { contains: suche, mode: "insensitive" } } } },
                { kundenPosition: { rechnung: { nummer: { contains: suche, mode: "insensitive" } } } },
              ],
            },
          },
        },
      ],
    });
  }

  if (filter.kunde === "ohne") und.push({ kundeId: null });
  else if (filter.kunde) und.push({ kundeId: filter.kunde });

  if (filter.status === "keine-meldung") {
    und.push({
      OR: [{ letzterReportAm: null }, { letzterReportAm: { lt: meldungsGrenze(jetzt) } }],
    });
  } else if (filter.status) {
    und.push({ subStatus: filter.status as Prisma.EnumSubscriptionStatusFilter["equals"] });
  }

  if (filter.produkt) und.push({ produkt: filter.produkt as Prisma.EnumProduktFilter["equals"] });

  if (filter.ablauf === "30") {
    und.push({ subNextduedate: { gte: jetzt, lte: new Date(jetzt.getTime() + 30 * 86_400_000) } });
  } else if (filter.ablauf === "14") {
    und.push({ subNextduedate: { gte: jetzt, lte: new Date(jetzt.getTime() + 14 * 86_400_000) } });
  } else if (filter.ablauf === "abgelaufen") {
    und.push({ subNextduedate: { lt: jetzt } });
  }

  if (filter.rechnung === "offen") {
    und.push({
      laufzeiten: {
        some: {
          status: "BESTAETIGT",
          OR: [
            { proxmoxPosition: { rechnung: { bezahlt: false } } },
            { kundenPosition: null },
            { kundenPosition: { rechnung: { erstellt: false } } },
          ],
        },
      },
    });
  }

  return und.length > 0 ? { AND: und } : {};
}

// Hosts ohne Ablaufdatum bzw. ohne Meldung stehen immer am Ende, egal in welche Richtung sortiert wird.
const SORTIERUNGEN: Record<string, Prisma.HostOrderByWithRelationInput> = {
  hostname: { hostname: "asc" },
  "hostname-ab": { hostname: "desc" },
  ablauf: { subNextduedate: { sort: "asc", nulls: "last" } },
  "ablauf-ab": { subNextduedate: { sort: "desc", nulls: "last" } },
  kunde: { kunde: { name: "asc" } },
  "kunde-ab": { kunde: { name: "desc" } },
  status: { subStatus: "asc" },
  "status-ab": { subStatus: "desc" },
  meldung: { letzterReportAm: { sort: "desc", nulls: "last" } },
  "meldung-ab": { letzterReportAm: { sort: "asc", nulls: "last" } },
};

export async function hostListe(filter: HostFilter, jetzt: Date = new Date()) {
  const where = bedingung(filter, jetzt);
  const seite = Math.max(1, filter.seite ?? 1);
  const orderBy = SORTIERUNGEN[filter.sortierung ?? "hostname"] ?? SORTIERUNGEN.hostname;

  const [gesamt, hosts] = await Promise.all([
    prisma.host.count({ where }),
    prisma.host.findMany({
      where,
      orderBy,
      skip: (seite - 1) * SEITENGROESSE,
      take: SEITENGROESSE,
      include: {
        kunde: { select: { id: true, name: true } },
        standort: { select: { name: true } },
      },
    }),
  ]);

  const grenze = meldungsGrenze(jetzt);

  return {
    gesamt,
    seite,
    seiten: Math.max(1, Math.ceil(gesamt / SEITENGROESSE)),
    hosts: hosts.map((host) => ({
      ...host,
      meldetNicht: !host.letzterReportAm || host.letzterReportAm < grenze,
      socketAbweichung:
        host.subLizenzierteSockets !== null &&
        host.sockets !== null &&
        host.subLizenzierteSockets !== host.sockets,
    })),
  };
}

/** Alle Daten der Host-Detailansicht in einem Rutsch. */
export async function hostMitDetails(id: string) {
  return prisma.host.findUnique({
    where: { id },
    include: {
      kunde: { select: { id: true, name: true } },
      standort: { select: { id: true, name: true, ort: true } },
      tags: true,
      alerts: { where: { erledigtAm: null }, orderBy: { geoeffnetAm: "desc" } },
      keyHistorie: { orderBy: { letzteMeldung: "desc" } },
      serverIdHistorie: { orderBy: { letzteMeldung: "desc" } },
      tokens: { orderBy: { erstelltAm: "desc" } },
      reports: { orderBy: { erhobenAm: "desc" }, take: 30 },
      laufzeiten: {
        orderBy: { start: "desc" },
        include: {
          proxmoxPosition: { include: { rechnung: true } },
          kundenPosition: { include: { rechnung: true } },
        },
      },
    },
  });
}

export type HostDetail = NonNullable<Awaited<ReturnType<typeof hostMitDetails>>>;

/** Auswahllisten für die Filterleiste. */
export async function filterOptionen() {
  const kunden = await prisma.kunde.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  return { kunden };
}
