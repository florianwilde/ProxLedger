import { prisma } from "@/lib/db";
import { einstellungen } from "@/server/einstellungen";

/**
 * Löscht alte Reports und Protokolleinträge nach den eingestellten Fristen (#025).
 *
 * Der jüngste Report jedes Hosts bleibt **immer** erhalten – sonst stünde ein Host, der lange
 * nicht gemeldet hat, plötzlich ohne jede Angabe da. Eine Frist von 0 heißt: nichts löschen.
 */
export async function altdatenLoeschen(jetzt: Date = new Date()): Promise<{
  reports: number;
  protokoll: number;
}> {
  const { aufbewahrungReportsTage, aufbewahrungAuditTage } = await einstellungen();

  let reports = 0;
  if (aufbewahrungReportsTage > 0) {
    const grenze = new Date(jetzt.getTime() - aufbewahrungReportsTage * 86_400_000);

    const neueste = await prisma.report.groupBy({
      by: ["hostId"],
      _max: { erhobenAm: true },
    });
    const behalten = await prisma.report.findMany({
      where: {
        OR: neueste
          .filter((eintrag) => eintrag._max.erhobenAm !== null)
          .map((eintrag) => ({ hostId: eintrag.hostId, erhobenAm: eintrag._max.erhobenAm as Date })),
      },
      select: { id: true },
    });

    const ergebnis = await prisma.report.deleteMany({
      where: {
        erhobenAm: { lt: grenze },
        id: { notIn: behalten.map((eintrag) => eintrag.id) },
      },
    });
    reports = ergebnis.count;
  }

  let protokoll = 0;
  if (aufbewahrungAuditTage > 0) {
    const grenze = new Date(jetzt.getTime() - aufbewahrungAuditTage * 86_400_000);
    const ergebnis = await prisma.auditEintrag.deleteMany({ where: { erstelltAm: { lt: grenze } } });
    protokoll = ergebnis.count;
  }

  return { reports, protokoll };
}
