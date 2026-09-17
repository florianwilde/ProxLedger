import { prisma } from "@/lib/db";
import { protokolliere } from "@/server/audit";

export class ZuweisungsFehler extends Error {}

export interface ZuweisungsErgebnis {
  anzahl: number;
  kundenName: string;
}

/**
 * Weist mehrere Hosts einem Kunden (und optional einem seiner Standorte) zu.
 * Getrennt von der Server Action, damit die Regeln ohne Next.js testbar sind.
 */
export async function hostsZuweisenService(
  hostIds: string[],
  kundeId: string | null,
  standortId: string | null,
): Promise<ZuweisungsErgebnis> {
  if (hostIds.length === 0) {
    throw new ZuweisungsFehler("Bitte mindestens einen Host auswählen.");
  }
  if (!kundeId) {
    throw new ZuweisungsFehler("Bitte einen Kunden auswählen.");
  }

  const kunde = await prisma.kunde.findUnique({
    where: { id: kundeId },
    include: { standorte: { select: { id: true } } },
  });
  if (!kunde) {
    throw new ZuweisungsFehler("Der gewählte Kunde existiert nicht mehr.");
  }
  if (standortId && !kunde.standorte.some((standort) => standort.id === standortId)) {
    throw new ZuweisungsFehler("Der gewählte Standort gehört nicht zu diesem Kunden.");
  }

  const { count } = await prisma.host.updateMany({
    where: { id: { in: hostIds } },
    data: { kundeId, standortId },
  });

  // Die Warnung „Host ohne Kunde“ ist damit erledigt (die Regel selbst folgt in #011).
  await prisma.alert.updateMany({
    where: { regel: "host-ohne-kunde", hostId: { in: hostIds }, erledigtAm: null },
    data: { erledigtAm: new Date() },
  });

  await protokolliere("host.zugewiesen", "Host", null, { hostIds, kundeId, standortId, anzahl: count });

  return { anzahl: count, kundenName: kunde.name };
}
