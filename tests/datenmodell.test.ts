import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { datenbankLeeren, datenbankVerfuegbar, testPrisma } from "./helpers/db";

describe.runIf(datenbankVerfuegbar)("Datenmodell", () => {
  beforeEach(async () => {
    await datenbankLeeren();
  });

  afterAll(async () => {
    await testPrisma.$disconnect();
  });

  it("verteilt eine Proxmox-Sammelrechnung auf mehrere Laufzeiten", async () => {
    const kunde = await testPrisma.kunde.create({
      data: { name: "Testkunde GmbH", kundennummer: "K-9001" },
    });

    const hostDaten = [
      { agentId: "test-1", hostname: "pve-test-01", key: "pve1c-aaaa111111" },
      { agentId: "test-2", hostname: "pve-test-02", key: "pve1c-bbbb222222" },
    ];

    const rechnung = await testPrisma.proxmoxRechnung.create({
      data: {
        nummer: "PX-TEST-1",
        datum: new Date("2026-09-01"),
        faelligAm: new Date("2026-09-15"),
        nettoBetrag: 230,
        bezahlt: false,
        positionen: {
          create: hostDaten.map((h) => ({ bezeichnung: h.key, nettoBetrag: 115 })),
        },
      },
      include: { positionen: true },
    });

    for (const [index, daten] of hostDaten.entries()) {
      const host = await testPrisma.host.create({
        data: {
          agentId: daten.agentId,
          hostname: daten.hostname,
          produkt: "PVE",
          kundeId: kunde.id,
          subKey: daten.key,
          subStatus: "ACTIVE",
          subNextduedate: new Date("2027-09-01"),
        },
      });

      await testPrisma.laufzeit.create({
        data: {
          hostId: host.id,
          key: daten.key,
          start: new Date("2026-09-01"),
          ende: new Date("2027-08-31"),
          status: "BESTAETIGT",
          proxmoxPositionId: rechnung.positionen[index].id,
        },
      });
    }

    const laufzeiten = await testPrisma.laufzeit.findMany({
      include: { proxmoxPosition: { include: { rechnung: true } } },
    });

    expect(laufzeiten).toHaveLength(2);
    expect(laufzeiten.every((l) => l.proxmoxPosition?.rechnung.nummer === "PX-TEST-1")).toBe(true);
    expect(
      laufzeiten.reduce((summe, l) => summe + Number(l.proxmoxPosition?.nettoBetrag ?? 0), 0),
    ).toBe(230);
  });

  it("erlaubt Hosts ohne Kunde und setzt die Zuordnung beim Löschen des Kunden zurück", async () => {
    const kunde = await testPrisma.kunde.create({
      data: { name: "Wegfallend GmbH", kundennummer: "K-9002" },
    });
    const host = await testPrisma.host.create({
      data: { agentId: "test-3", hostname: "pve-test-03", produkt: "PVE", kundeId: kunde.id },
    });

    await testPrisma.kunde.delete({ where: { id: kunde.id } });

    const danach = await testPrisma.host.findUnique({ where: { id: host.id } });
    expect(danach?.kundeId).toBeNull();
  });

  it("verhindert zwei Laufzeiten mit gleichem Start je Host", async () => {
    const host = await testPrisma.host.create({
      data: { agentId: "test-4", hostname: "pve-test-04", produkt: "PBS" },
    });
    const daten = {
      hostId: host.id,
      key: "pbsc-1111111111",
      start: new Date("2026-01-01"),
      ende: new Date("2026-12-31"),
    };

    await testPrisma.laufzeit.create({ data: daten });
    await expect(testPrisma.laufzeit.create({ data: daten })).rejects.toThrow();
  });
})
