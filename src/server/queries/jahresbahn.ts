import { prisma } from "@/lib/db";
import { sichtbarerKunde } from "@/server/auth/sitzungspflicht";

/** Hosts mit Ablaufdatum, gruppiert nach Kunde – Grundlage für Jahresbahn und Ablauf-Kalender. */
export async function ablaufDaten(jetzt: Date = new Date()) {
  const nurKunde = await sichtbarerKunde();

  const hosts = await prisma.host.findMany({
    where: { subNextduedate: { not: null }, archiviertAm: null, ...(nurKunde ? { kundeId: nurKunde } : {}) },
    orderBy: [{ subNextduedate: "asc" }],
    select: {
      id: true,
      hostname: true,
      subKey: true,
      subNextduedate: true,
      subStatus: true,
      kunde: { select: { id: true, name: true } },
      laufzeiten: {
        where: { status: "BESTAETIGT" },
        orderBy: { start: "desc" },
        take: 2,
        select: {
          id: true,
          start: true,
          proxmoxPosition: { select: { rechnung: { select: { bezahlt: true } } } },
          kundenPosition: { select: { rechnung: { select: { erstellt: true } } } },
        },
      },
    },
  });

  const eintraege = hosts.map((host) => {
    const ablauf = host.subNextduedate!;
    const verlaengerung = host.laufzeiten.find((l) => l.start.getTime() === ablauf.getTime());

    return {
      hostId: host.id,
      hostname: host.hostname,
      key: host.subKey,
      ablauf,
      status: host.subStatus,
      kunde: host.kunde,
      laufzeitId: verlaengerung?.id ?? null,
      einkaufBezahlt: verlaengerung?.proxmoxPosition?.rechnung.bezahlt ?? null,
      verkaufErstellt: verlaengerung?.kundenPosition?.rechnung.erstellt ?? null,
      tage: Math.round((ablauf.getTime() - jetzt.getTime()) / 86_400_000),
    };
  });

  // Nach Kunde gruppieren; Hosts ohne Kunde kommen ans Ende.
  const gruppen = new Map<string, { name: string; kundeId: string | null; eintraege: typeof eintraege }>();
  for (const eintrag of eintraege) {
    const schluessel = eintrag.kunde?.id ?? "ohne";
    const gruppe = gruppen.get(schluessel) ?? {
      name: eintrag.kunde?.name ?? "Nicht zugeordnet",
      kundeId: eintrag.kunde?.id ?? null,
      eintraege: [],
    };
    gruppe.eintraege.push(eintrag);
    gruppen.set(schluessel, gruppe);
  }

  const sortiert = [...gruppen.values()].sort((a, b) => {
    if (a.kundeId === null) return 1;
    if (b.kundeId === null) return -1;
    return a.name.localeCompare(b.name, "de");
  });

  return {
    gruppen: sortiert,
    naechste90Tage: eintraege.filter((e) => e.tage >= 0 && e.tage <= 90),
    abgelaufen: eintraege.filter((e) => e.tage < 0),
  };
}

export type AblaufEintrag = Awaited<ReturnType<typeof ablaufDaten>>["naechste90Tage"][number];
