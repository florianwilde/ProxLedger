import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { alertsAbgleichen, warnregelnSicherstellen } from "@/server/alerts/abgleich";
import { datenbankLeeren, datenbankVerfuegbar, testPrisma } from "./helpers/db";

const JETZT = new Date("2026-09-17T12:00:00Z");

async function hostMitAblauf(tage: number) {
  return testPrisma.host.create({
    data: {
      agentId: "agent-1",
      hostname: "pve-01",
      produkt: "PVE",
      subStatus: "ACTIVE",
      subKey: "pve1c-aaaa",
      subNextduedate: new Date(JETZT.getTime() + tage * 86_400_000),
      letzterReportAm: JETZT,
    },
  });
}

describe.runIf(datenbankVerfuegbar)("Abgleich der Warnungen", () => {
  beforeEach(async () => {
    await datenbankLeeren();
    await warnregelnSicherstellen();
  });

  afterAll(async () => {
    await testPrisma.$disconnect();
  });

  it("legt die Standard-Einstellungen für alle Regeln an", async () => {
    const einstellungen = await testPrisma.warnregelEinstellung.findMany();
    expect(einstellungen).toHaveLength(10);
    const ablauf = einstellungen.find((e) => e.regel === "subscription-laeuft-ab");
    expect(ablauf?.schwellwerte).toEqual({ tage: [30, 14, 7] });
  });

  it("öffnet eine Warnung und meldet sie nicht doppelt", async () => {
    await hostMitAblauf(5);

    const erster = await alertsAbgleichen(JETZT);
    expect(erster.geoeffnet.map((a) => a.regel)).toContain("subscription-laeuft-ab");

    const zweiter = await alertsAbgleichen(JETZT);
    expect(zweiter.geoeffnet).toHaveLength(0);

    const offene = await testPrisma.alert.findMany({ where: { erledigtAm: null } });
    expect(offene.filter((a) => a.regel === "subscription-laeuft-ab")).toHaveLength(1);
  });

  it("schließt eine Warnung, sobald die Ursache behoben ist", async () => {
    const host = await hostMitAblauf(5);
    await alertsAbgleichen(JETZT);

    // Verlängert: neues Ablaufdatum weit in der Zukunft.
    await testPrisma.host.update({
      where: { id: host.id },
      data: { subNextduedate: new Date(JETZT.getTime() + 400 * 86_400_000) },
    });

    const ergebnis = await alertsAbgleichen(JETZT);
    expect(ergebnis.erledigt).toContain(`subscription-laeuft-ab:${host.id}:7`);

    const alert = await testPrisma.alert.findFirstOrThrow({
      where: { fingerprint: `subscription-laeuft-ab:${host.id}:7` },
    });
    expect(alert.erledigtAm).not.toBeNull();
  });

  it("öffnet einen erledigten Fall erneut, wenn er wieder auftritt", async () => {
    const host = await hostMitAblauf(5);
    await alertsAbgleichen(JETZT);
    await testPrisma.host.update({
      where: { id: host.id },
      data: { subNextduedate: new Date(JETZT.getTime() + 400 * 86_400_000) },
    });
    await alertsAbgleichen(JETZT);

    await testPrisma.host.update({
      where: { id: host.id },
      data: { subNextduedate: new Date(JETZT.getTime() + 5 * 86_400_000) },
    });
    const ergebnis = await alertsAbgleichen(JETZT);

    expect(ergebnis.geoeffnet.map((a) => a.fingerprint)).toContain(
      `subscription-laeuft-ab:${host.id}:7`,
    );
    const alerts = await testPrisma.alert.findMany({
      where: { fingerprint: `subscription-laeuft-ab:${host.id}:7` },
    });
    // Derselbe Eintrag wird wiederverwendet, es entsteht kein zweiter.
    expect(alerts).toHaveLength(1);
    expect(alerts[0].erledigtAm).toBeNull();
  });

  it("führt die Beschreibung nach, wenn sich der Fall ändert", async () => {
    const host = await hostMitAblauf(5);
    await alertsAbgleichen(JETZT);

    const spaeter = new Date(JETZT.getTime() + 2 * 86_400_000);
    await alertsAbgleichen(spaeter);

    const alert = await testPrisma.alert.findFirstOrThrow({
      where: { fingerprint: `subscription-laeuft-ab:${host.id}:7` },
    });
    expect(alert.titel).toBe("Subscription läuft in 3 Tagen ab");
  });

  it("steigt von der 30- auf die 7-Tage-Stufe", async () => {
    const host = await hostMitAblauf(25);
    const erster = await alertsAbgleichen(JETZT);
    expect(erster.geoeffnet.some((a) => a.fingerprint.endsWith(":30"))).toBe(true);

    const spaeter = new Date(JETZT.getTime() + 20 * 86_400_000);
    const zweiter = await alertsAbgleichen(spaeter);

    expect(zweiter.geoeffnet.some((a) => a.fingerprint.endsWith(":7"))).toBe(true);
    expect(zweiter.erledigt).toContain(`subscription-laeuft-ab:${host.id}:30`);
  });

  it("beachtet abgeschaltete Regeln", async () => {
    await testPrisma.host.create({
      data: { agentId: "agent-2", hostname: "pve-ohne-kunde", produkt: "PVE", letzterReportAm: JETZT },
    });

    await testPrisma.warnregelEinstellung.update({
      where: { regel: "host-ohne-kunde" },
      data: { aktiv: false },
    });

    const ergebnis = await alertsAbgleichen(JETZT);
    expect(ergebnis.geoeffnet.some((a) => a.regel === "host-ohne-kunde")).toBe(false);
  });
});
