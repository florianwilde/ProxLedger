import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { altdatenLoeschen } from "@/server/aufraeumen";
import { einstellungenSpeichern, VORGABEN, zwischenspeicherLeeren } from "@/server/einstellungen";
import { datenbankLeeren, datenbankVerfuegbar, testPrisma } from "./helpers/db";

const JETZT = new Date("2026-09-18T12:00:00Z");
const tageVorher = (tage: number) => new Date(JETZT.getTime() - tage * 86_400_000);

async function hostMitReports(tage: number[]) {
  const host = await testPrisma.host.create({
    data: { agentId: "agent-1", hostname: "pve-01", produkt: "PVE", letzterReportAm: JETZT },
  });

  for (const alter of tage) {
    await testPrisma.report.create({
      data: {
        hostId: host.id,
        reportId: `report-${alter}`,
        erhobenAm: tageVorher(alter),
        empfangenAm: tageVorher(alter),
        subStatus: "ACTIVE",
        rohdaten: {},
      },
    });
  }

  return host;
}

describe.runIf(datenbankVerfuegbar)("Altdaten löschen", () => {
  beforeEach(async () => {
    await datenbankLeeren();
    zwischenspeicherLeeren();
  });

  afterAll(async () => {
    await testPrisma.$disconnect();
  });

  it("löscht Reports, die älter sind als die Frist", async () => {
    await einstellungenSpeichern({ ...VORGABEN, aufbewahrungReportsTage: 30 });
    await hostMitReports([1, 10, 45, 400]);

    const ergebnis = await altdatenLoeschen(JETZT);

    expect(ergebnis.reports).toBe(2);
    expect(await testPrisma.report.count()).toBe(2);
  });

  it("behält den jüngsten Report jedes Hosts, auch wenn er zu alt ist", async () => {
    await einstellungenSpeichern({ ...VORGABEN, aufbewahrungReportsTage: 30 });
    await hostMitReports([200, 400]);

    await altdatenLoeschen(JETZT);

    const uebrig = await testPrisma.report.findMany();
    expect(uebrig).toHaveLength(1);
    expect(uebrig[0].erhobenAm).toEqual(tageVorher(200));
  });

  it("löscht nichts, wenn die Frist auf 0 steht", async () => {
    await einstellungenSpeichern({
      ...VORGABEN,
      aufbewahrungReportsTage: 0,
      aufbewahrungAuditTage: 0,
    });
    await hostMitReports([400, 800]);
    await testPrisma.auditEintrag.create({
      data: { aktion: "test", entitaet: "Host", erstelltAm: tageVorher(3000) },
    });

    const ergebnis = await altdatenLoeschen(JETZT);

    expect(ergebnis).toEqual({ reports: 0, protokoll: 0 });
    expect(await testPrisma.report.count()).toBe(2);
    expect(await testPrisma.auditEintrag.count()).toBe(1);
  });

  it("räumt auch das Protokoll auf", async () => {
    await einstellungenSpeichern({ ...VORGABEN, aufbewahrungAuditTage: 365 });
    for (const alter of [10, 400]) {
      await testPrisma.auditEintrag.create({
        data: { aktion: "test", entitaet: "Host", erstelltAm: tageVorher(alter) },
      });
    }

    const ergebnis = await altdatenLoeschen(JETZT);

    expect(ergebnis.protokoll).toBe(1);
    expect(await testPrisma.auditEintrag.count()).toBe(1);
  });
});
