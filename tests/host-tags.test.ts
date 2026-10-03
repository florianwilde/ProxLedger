import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { datenbankLeeren, datenbankVerfuegbar, testPrisma } from "./helpers/db";

/** Schlagworte und Notizen in Liste, Filter und Suche (#040). */
vi.mock("@/server/auth/sitzungspflicht", () => ({
  sichtbarerKunde: async () => null,
  darfEinkaufSehen: async () => true,
  angemeldet: async () => null,
  sitzungErforderlich: async () => {
    throw new Error("in diesem Test nicht vorgesehen");
  },
}));

const { hostListe, filterOptionen } = await import("@/server/queries/hostliste");
const { suchIndex } = await import("@/server/queries/hosts");

async function hosts() {
  // Zwei Hosts mit demselben Namen bei verschiedenen Kunden – genau der Fall aus der Praxis.
  const [kundeA, kundeB] = await Promise.all([
    testPrisma.kunde.create({ data: { name: "Kunde A", kundennummer: "K-A" } }),
    testPrisma.kunde.create({ data: { name: "Kunde B", kundennummer: "K-B" } }),
  ]);

  await testPrisma.host.create({
    data: {
      agentId: "a-1",
      hostname: "hv-pve-01",
      produkt: "PVE",
      kundeId: kundeA.id,
      notizen: "Steht im Serverraum links",
      tags: { connectOrCreate: [{ where: { name: "rechenzentrum" }, create: { name: "rechenzentrum" } }] },
    },
  });
  await testPrisma.host.create({
    data: {
      agentId: "a-2",
      hostname: "hv-pve-01",
      produkt: "PVE",
      kundeId: kundeB.id,
      tags: { connectOrCreate: [{ where: { name: "aussenstelle" }, create: { name: "aussenstelle" } }] },
    },
  });
}

describe.runIf(datenbankVerfuegbar)("Schlagworte und Notizen", () => {
  beforeEach(async () => {
    await datenbankLeeren();
    await hosts();
  });

  afterAll(async () => {
    await testPrisma.$disconnect();
  });

  it("liefert die Schlagworte zu jedem Host mit", async () => {
    const liste = await hostListe({});
    const namen = liste.hosts.flatMap((host) => host.tags.map((tag) => tag.name)).sort();
    expect(namen).toEqual(["aussenstelle", "rechenzentrum"]);
  });

  it("filtert nach Schlagwort", async () => {
    const liste = await hostListe({ tag: "aussenstelle" });
    expect(liste.gesamt).toBe(1);
    expect(liste.hosts[0].kunde?.name).toBe("Kunde B");
  });

  it("findet einen Host über sein Schlagwort", async () => {
    const liste = await hostListe({ q: "rechenzentrum" });
    expect(liste.gesamt).toBe(1);
    expect(liste.hosts[0].kunde?.name).toBe("Kunde A");
  });

  it("findet einen Host über seine Notiz", async () => {
    const liste = await hostListe({ q: "serverraum" });
    expect(liste.gesamt).toBe(1);
  });

  it("bietet nur vergebene Schlagworte zur Auswahl an", async () => {
    const { tags } = await filterOptionen();
    expect(tags).toEqual(["aussenstelle", "rechenzentrum"]);
  });

  it("nimmt Schlagworte und Notizen in die globale Suche auf", async () => {
    const eintraege = await suchIndex();
    const treffer = eintraege.filter((eintrag) => eintrag.begriffe.includes("rechenzentrum"));
    expect(treffer).toHaveLength(1);
    expect(treffer[0].untertitel).toContain("rechenzentrum");
  });
});
