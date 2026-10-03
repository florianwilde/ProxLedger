import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { datenbankLeeren, datenbankVerfuegbar, testPrisma } from "./helpers/db";

/** Zuweisung von Kunde und Standort an einen Host (#036). */
vi.mock("@/server/auth/sitzungspflicht", () => ({
  sitzungErforderlich: async () => ({ benutzerId: "test", rolle: "ADMIN", kundeId: null }),
  sichtbarerKunde: async () => null,
  darfEinkaufSehen: async () => true,
  angemeldet: async () => null,
}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

const { hostKundeSetzen } = await import("@/server/actions/host-detail");

async function aufbau() {
  const [kundeA, kundeB] = await Promise.all([
    testPrisma.kunde.create({ data: { name: "Kunde A", kundennummer: "K-A" } }),
    testPrisma.kunde.create({ data: { name: "Kunde B", kundennummer: "K-B" } }),
  ]);
  const [standortA, standortB] = await Promise.all([
    testPrisma.standort.create({ data: { kundeId: kundeA.id, name: "Rechenzentrum A" } }),
    testPrisma.standort.create({ data: { kundeId: kundeB.id, name: "Rechenzentrum B" } }),
  ]);
  const host = await testPrisma.host.create({
    data: { agentId: "a-1", hostname: "pve-01", produkt: "PVE" },
  });
  return { kundeA, kundeB, standortA, standortB, host };
}

function formular(werte: Record<string, string>) {
  const daten = new FormData();
  for (const [name, wert] of Object.entries(werte)) daten.set(name, wert);
  return daten;
}

describe.runIf(datenbankVerfuegbar)("Kunde und Standort setzen", () => {
  beforeEach(async () => {
    await datenbankLeeren();
  });

  afterAll(async () => {
    await testPrisma.$disconnect();
  });

  it("setzt Kunde und Standort zusammen", async () => {
    const { kundeA, standortA, host } = await aufbau();

    await hostKundeSetzen(formular({ hostId: host.id, kundeId: kundeA.id, standortId: standortA.id }));

    const danach = await testPrisma.host.findUniqueOrThrow({ where: { id: host.id } });
    expect(danach.kundeId).toBe(kundeA.id);
    expect(danach.standortId).toBe(standortA.id);
  });

  it("verwirft einen Standort, der zu einem anderen Kunden gehört", async () => {
    const { kundeA, standortB, host } = await aufbau();

    await hostKundeSetzen(formular({ hostId: host.id, kundeId: kundeA.id, standortId: standortB.id }));

    const danach = await testPrisma.host.findUniqueOrThrow({ where: { id: host.id } });
    expect(danach.kundeId).toBe(kundeA.id);
    expect(danach.standortId).toBeNull();
  });

  it("löst die Zuordnung samt Standort, wenn kein Kunde gewählt ist", async () => {
    const { kundeA, standortA, host } = await aufbau();
    await hostKundeSetzen(formular({ hostId: host.id, kundeId: kundeA.id, standortId: standortA.id }));

    await hostKundeSetzen(formular({ hostId: host.id, kundeId: "", standortId: "" }));

    const danach = await testPrisma.host.findUniqueOrThrow({ where: { id: host.id } });
    expect(danach.kundeId).toBeNull();
    expect(danach.standortId).toBeNull();
  });

  it("schließt die Warnung „Host ohne Kunde“ beim Zuweisen", async () => {
    const { kundeA, host } = await aufbau();
    await testPrisma.alert.create({
      data: {
        regel: "host-ohne-kunde",
        fingerprint: `host-ohne-kunde:${host.id}`,
        schwere: "INFO",
        titel: "Host ohne Kunde",
        beschreibung: "…",
        hostId: host.id,
      },
    });

    await hostKundeSetzen(formular({ hostId: host.id, kundeId: kundeA.id }));

    const alert = await testPrisma.alert.findFirstOrThrow({ where: { hostId: host.id } });
    expect(alert.erledigtAm).not.toBeNull();
  });
});
