import { prisma } from "@/lib/db";

/** Abfragen rund um Kunden. Beträge kommen als Decimal aus der Datenbank und werden hier zu Zahlen. */

export async function kundenListe() {
  const kunden = await prisma.kunde.findMany({
    orderBy: { name: "asc" },
    include: {
      standorte: true,
      hosts: {
        select: { id: true, subStatus: true, subNextduedate: true },
      },
      _count: { select: { hosts: true } },
    },
  });

  const offeneAlerts = await prisma.alert.groupBy({
    by: ["kundeId"],
    where: { erledigtAm: null, kundeId: { not: null } },
    _count: { _all: true },
  });

  const alertsProKunde = new Map(offeneAlerts.map((e) => [e.kundeId, e._count._all]));

  return kunden.map((kunde) => {
    const ablaufDaten = kunde.hosts
      .map((h) => h.subNextduedate)
      .filter((d): d is Date => d !== null)
      .sort((a, b) => a.getTime() - b.getTime());

    return {
      id: kunde.id,
      name: kunde.name,
      kundennummer: kunde.kundennummer,
      ansprechpartner: kunde.ansprechpartner,
      hosts: kunde._count.hosts,
      aktiv: kunde.hosts.filter((h) => h.subStatus === "ACTIVE").length,
      naechsterAblauf: ablaufDaten[0] ?? null,
      offeneAlerts: alertsProKunde.get(kunde.id) ?? 0,
    };
  });
}

export async function kundeMitDetails(id: string) {
  return prisma.kunde.findUnique({
    where: { id },
    include: {
      standorte: { orderBy: { name: "asc" } },
      hosts: { orderBy: { hostname: "asc" } },
      alerts: { where: { erledigtAm: null }, orderBy: { geoeffnetAm: "desc" } },
    },
  });
}

/** Laufzeiten eines Kunden samt Rechnungsangaben, aufbereitet für Tabellen und Summen. */
export async function laufzeitenVonKunde(kundeId: string) {
  const laufzeiten = await prisma.laufzeit.findMany({
    where: { host: { kundeId } },
    orderBy: { start: "desc" },
    include: {
      host: { select: { id: true, hostname: true } },
      proxmoxPosition: { include: { rechnung: true } },
      kundenPosition: { include: { rechnung: true } },
    },
  });

  return laufzeiten.map((laufzeit) => ({
    id: laufzeit.id,
    hostId: laufzeit.hostId,
    hostname: laufzeit.host.hostname,
    key: laufzeit.key,
    start: laufzeit.start,
    ende: laufzeit.ende,
    vorschlag: laufzeit.status === "VORSCHLAG",
    einkauf: laufzeit.proxmoxPosition
      ? {
          nummer: laufzeit.proxmoxPosition.rechnung.nummer,
          nettoBetrag: Number(laufzeit.proxmoxPosition.nettoBetrag),
          bezahlt: laufzeit.proxmoxPosition.rechnung.bezahlt,
          faelligAm: laufzeit.proxmoxPosition.rechnung.faelligAm,
        }
      : null,
    verkauf: laufzeit.kundenPosition
      ? {
          nummer: laufzeit.kundenPosition.rechnung.nummer,
          nettoBetrag: Number(laufzeit.kundenPosition.nettoBetrag),
          erstellt: laufzeit.kundenPosition.rechnung.erstellt,
          bezahlt: laufzeit.kundenPosition.rechnung.bezahlt,
        }
      : null,
  }));
}

export type KundenLaufzeit = Awaited<ReturnType<typeof laufzeitenVonKunde>>[number];

export function summen(laufzeiten: KundenLaufzeit[]) {
  const einkauf = laufzeiten.reduce((s, l) => s + (l.einkauf?.nettoBetrag ?? 0), 0);
  const verkauf = laufzeiten.reduce((s, l) => s + (l.verkauf?.nettoBetrag ?? 0), 0);
  return { einkauf, verkauf, marge: verkauf - einkauf };
}

export function summenProJahr(laufzeiten: KundenLaufzeit[]) {
  const proJahr = new Map<string, { einkauf: number; verkauf: number }>();
  for (const laufzeit of laufzeiten) {
    const jahr = String(laufzeit.start.getUTCFullYear());
    const eintrag = proJahr.get(jahr) ?? { einkauf: 0, verkauf: 0 };
    eintrag.einkauf += laufzeit.einkauf?.nettoBetrag ?? 0;
    eintrag.verkauf += laufzeit.verkauf?.nettoBetrag ?? 0;
    proJahr.set(jahr, eintrag);
  }
  return [...proJahr.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([jahr, werte]) => ({ jahr, ...werte, marge: werte.verkauf - werte.einkauf }));
}

/** Offene Rechnungspunkte je Kunde: unbezahlter Einkauf bzw. fehlende Kundenrechnung. */
export async function offeneRechnungspunkteProKunde() {
  const laufzeiten = await prisma.laufzeit.findMany({
    where: { status: "BESTAETIGT", host: { kundeId: { not: null } } },
    select: {
      host: { select: { kundeId: true } },
      proxmoxPosition: { select: { rechnung: { select: { bezahlt: true } } } },
      kundenPosition: { select: { rechnung: { select: { erstellt: true } } } },
    },
  });

  const proKunde = new Map<string, { offen: number; gesamt: number }>();
  for (const laufzeit of laufzeiten) {
    const kundeId = laufzeit.host.kundeId;
    if (!kundeId) continue;
    const eintrag = proKunde.get(kundeId) ?? { offen: 0, gesamt: 0 };
    eintrag.gesamt += 2;
    if (!laufzeit.proxmoxPosition?.rechnung.bezahlt) eintrag.offen += 1;
    if (!laufzeit.kundenPosition?.rechnung.erstellt) eintrag.offen += 1;
    proKunde.set(kundeId, eintrag);
  }
  return proKunde;
}
