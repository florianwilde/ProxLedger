import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { darfEinkaufSehen, sichtbarerKunde } from "@/server/auth/sitzungspflicht";

export interface RechnungsFilter {
  status?: "offen" | "erledigt" | "alle" | "vorschlaege";
  kunde?: string;
  jahr?: string;
  q?: string;
}

function bedingung(filter: RechnungsFilter): Prisma.LaufzeitWhereInput {
  const und: Prisma.LaufzeitWhereInput[] = [];

  if (filter.status === "vorschlaege") {
    und.push({ status: "VORSCHLAG" });
  } else {
    und.push({ status: "BESTAETIGT" });
  }

  if (filter.status === "offen") {
    und.push({
      OR: [
        { proxmoxPosition: null },
        { proxmoxPosition: { rechnung: { bezahlt: false } } },
        { kundenPosition: null },
        { kundenPosition: { rechnung: { erstellt: false } } },
      ],
    });
  }

  if (filter.status === "erledigt") {
    und.push({ proxmoxPosition: { rechnung: { bezahlt: true } } });
    und.push({ kundenPosition: { rechnung: { erstellt: true } } });
  }

  if (filter.kunde) und.push({ host: { kundeId: filter.kunde } });

  if (filter.jahr) {
    const jahr = Number(filter.jahr);
    und.push({
      start: { gte: new Date(Date.UTC(jahr, 0, 1)), lt: new Date(Date.UTC(jahr + 1, 0, 1)) },
    });
  }

  if (filter.q?.trim()) {
    const suche = filter.q.trim();
    und.push({
      OR: [
        { key: { contains: suche, mode: "insensitive" } },
        { host: { hostname: { contains: suche, mode: "insensitive" } } },
        { proxmoxPosition: { rechnung: { nummer: { contains: suche, mode: "insensitive" } } } },
        { kundenPosition: { rechnung: { nummer: { contains: suche, mode: "insensitive" } } } },
      ],
    });
  }

  return { AND: und };
}

export async function rechnungsListe(filter: RechnungsFilter) {
  const nurKunde = await sichtbarerKunde();
  const einkaufSichtbar = await darfEinkaufSehen();
  const where = nurKunde ? { AND: [bedingung(filter), { host: { kundeId: nurKunde } }] } : bedingung(filter);

  const laufzeiten = await prisma.laufzeit.findMany({
    where,
    orderBy: [{ start: "desc" }],
    include: {
      host: { select: { id: true, hostname: true, kunde: { select: { id: true, name: true } } } },
      proxmoxPosition: { include: { rechnung: true } },
      kundenPosition: { include: { rechnung: true } },
    },
  });

  const zeilen = laufzeiten.map((laufzeit) => {
    // Einkaufspreis und Marge sind nichts für ein Kundenkonto. Sie werden hier entfernt,
    // nicht erst in der Anzeige – sonst stünden sie im ausgelieferten HTML.
    const einkauf =
      einkaufSichtbar && laufzeit.proxmoxPosition ? Number(laufzeit.proxmoxPosition.nettoBetrag) : null;
    const verkauf = laufzeit.kundenPosition ? Number(laufzeit.kundenPosition.nettoBetrag) : null;

    return {
      id: laufzeit.id,
      hostId: laufzeit.host.id,
      hostname: laufzeit.host.hostname,
      kunde: laufzeit.host.kunde,
      key: laufzeit.key,
      start: laufzeit.start,
      ende: laufzeit.ende,
      vorschlag: laufzeit.status === "VORSCHLAG",
      einkaufNummer: einkaufSichtbar ? (laufzeit.proxmoxPosition?.rechnung.nummer ?? null) : null,
      einkaufBetrag: einkauf,
      einkaufBezahlt:
        einkaufSichtbar && laufzeit.proxmoxPosition ? laufzeit.proxmoxPosition.rechnung.bezahlt : null,
      einkaufFaelligAm: einkaufSichtbar ? (laufzeit.proxmoxPosition?.rechnung.faelligAm ?? null) : null,
      verkaufNummer: laufzeit.kundenPosition?.rechnung.nummer ?? null,
      verkaufBetrag: verkauf,
      verkaufErstellt: laufzeit.kundenPosition?.rechnung.erstellt ?? false,
      verkaufBezahlt: laufzeit.kundenPosition?.rechnung.bezahlt ?? false,
      marge: einkauf !== null && verkauf !== null ? verkauf - einkauf : null,
    };
  });

  const summen = zeilen.reduce(
    (summe, zeile) => ({
      einkauf: summe.einkauf + (zeile.einkaufBetrag ?? 0),
      verkauf: summe.verkauf + (zeile.verkaufBetrag ?? 0),
    }),
    { einkauf: 0, verkauf: 0 },
  );

  return {
    zeilen,
    summen: { ...summen, marge: summen.verkauf - summen.einkauf },
  };
}

export type RechnungsZeile = Awaited<ReturnType<typeof rechnungsListe>>["zeilen"][number];

/** Jahre, für die Laufzeiten vorliegen – für den Zeitraum-Filter. */
export async function laufzeitJahre(): Promise<string[]> {
  const nurKunde = await sichtbarerKunde();
  const laufzeiten = await prisma.laufzeit.findMany({
    where: nurKunde ? { host: { kundeId: nurKunde } } : {},
    select: { start: true },
  });
  return [...new Set(laufzeiten.map((l) => String(l.start.getUTCFullYear())))].sort((a, b) =>
    b.localeCompare(a),
  );
}

export async function laufzeitDetail(id: string) {
  const nurKunde = await sichtbarerKunde();
  const einkaufSichtbar = await darfEinkaufSehen();

  const laufzeit = await prisma.laufzeit.findFirst({
    where: nurKunde ? { id, host: { kundeId: nurKunde } } : { id },
    include: {
      host: {
        select: {
          id: true,
          hostname: true,
          produkt: true,
          kunde: { select: { id: true, name: true } },
        },
      },
      proxmoxPosition: {
        include: {
          rechnung: {
            include: { anhang: true, positionen: { include: { laufzeit: { include: { host: true } } } } },
          },
        },
      },
      kundenPosition: {
        include: {
          rechnung: {
            include: { anhang: true, positionen: { include: { laufzeit: { include: { host: true } } } } },
          },
        },
      },
    },
  });

  if (!laufzeit) return null;
  // Für Kundenkonten fällt der gesamte Einkaufsteil weg.
  return einkaufSichtbar ? laufzeit : { ...laufzeit, proxmoxPosition: null };
}

export async function anzahlVorschlaege() {
  // Vorschläge sind Arbeitsvorrat für das Systemhaus, kein Thema für Kundenkonten.
  if (await sichtbarerKunde()) return 0;
  return prisma.laufzeit.count({ where: { status: "VORSCHLAG" } });
}
