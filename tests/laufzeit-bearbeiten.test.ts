import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { datenbankLeeren, datenbankVerfuegbar, testPrisma } from "./helpers/db";

/** Laufzeiten nachträglich ändern und zusammenführen (#043). */
vi.mock("@/server/auth/sitzungspflicht", () => ({
  sitzungErforderlich: async () => ({ benutzerId: "test", rolle: "ADMIN", kundeId: null }),
  sichtbarerKunde: async () => null,
  darfEinkaufSehen: async () => true,
  angemeldet: async () => null,
}));

const { laufzeitBearbeiten, laufzeitenZusammenfuehren, RechnungsFehler } = await import(
  "@/server/services/rechnungen"
);

async function host(name = "hv-pve-01") {
  return testPrisma.host.create({ data: { agentId: `a-${name}`, hostname: name, produkt: "PVE" } });
}

async function laufzeit(hostId: string, start: string, key = "pve2s-aaaa") {
  return testPrisma.laufzeit.create({
    data: {
      hostId,
      key,
      start: new Date(start),
      ende: new Date(new Date(start).setUTCFullYear(new Date(start).getUTCFullYear() + 1)),
      status: "VORSCHLAG",
    },
  });
}

async function mitEinkauf(laufzeitId: string, nummer: string) {
  const rechnung = await testPrisma.proxmoxRechnung.create({
    data: { nummer, datum: new Date("2026-09-17"), nettoBetrag: 990, ustSatz: 0 },
  });
  const position = await testPrisma.proxmoxRechnungPosition.create({
    data: { rechnungId: rechnung.id, bezeichnung: "Position", nettoBetrag: 1100, rabatt: 110 },
  });
  await testPrisma.laufzeit.update({
    where: { id: laufzeitId },
    data: { proxmoxPosition: { connect: { id: position.id } } },
  });
}

describe.runIf(datenbankVerfuegbar)("Laufzeit bearbeiten", () => {
  beforeEach(async () => {
    await datenbankLeeren();
  });

  afterAll(async () => {
    await testPrisma.$disconnect();
  });

  it("ändert Key und Zeitraum und bestätigt dabei den Vorschlag", async () => {
    const h = await host();
    const l = await laufzeit(h.id, "2026-10-17");

    await laufzeitBearbeiten(l.id, {
      key: "pve2s-neu",
      start: new Date("2026-10-18"),
      ende: new Date("2027-10-17"),
      notizen: "Datum laut Bestellung",
    });

    const danach = await testPrisma.laufzeit.findUniqueOrThrow({ where: { id: l.id } });
    expect(danach.key).toBe("pve2s-neu");
    expect(danach.start.toISOString().slice(0, 10)).toBe("2026-10-18");
    expect(danach.status).toBe("BESTAETIGT");
  });

  it("weist ein Ende vor dem Beginn ab", async () => {
    const h = await host();
    const l = await laufzeit(h.id, "2026-10-17");

    await expect(
      laufzeitBearbeiten(l.id, { key: "pve2s-aaaa", start: new Date("2026-10-17"), ende: new Date("2026-10-01") }),
    ).rejects.toBeInstanceOf(RechnungsFehler);
  });

  it("weist ein Startdatum ab, das am selben Host schon belegt ist", async () => {
    const h = await host();
    const ersteLaufzeit = await laufzeit(h.id, "2026-10-17");
    await laufzeit(h.id, "2025-10-17");

    await expect(
      laufzeitBearbeiten(ersteLaufzeit.id, {
        key: "pve2s-aaaa",
        start: new Date("2025-10-17"),
        ende: new Date("2026-10-16"),
      }),
    ).rejects.toBeInstanceOf(RechnungsFehler);
  });

  it("führt zwei Laufzeiten zusammen und nimmt die Rechnung mit", async () => {
    const h = await host();
    const ziel = await laufzeit(h.id, "2026-10-17");
    const quelle = await laufzeit(h.id, "2026-10-18");
    await mitEinkauf(quelle.id, "291017");

    await laufzeitenZusammenfuehren(ziel.id, quelle.id);

    const danach = await testPrisma.laufzeit.findUniqueOrThrow({ where: { id: ziel.id } });
    expect(danach.proxmoxPositionId).not.toBeNull();
    expect(danach.status).toBe("BESTAETIGT");
    expect(await testPrisma.laufzeit.count()).toBe(1);
    // Die Rechnung selbst bleibt erhalten – nur die doppelte Laufzeit verschwindet.
    expect(await testPrisma.proxmoxRechnungPosition.count()).toBe(1);
  });

  it("verweigert das Zusammenführen, wenn beide eine Einkaufsrechnung haben", async () => {
    const h = await host();
    const ziel = await laufzeit(h.id, "2026-10-17");
    const quelle = await laufzeit(h.id, "2026-10-18");
    await mitEinkauf(ziel.id, "291017");
    await mitEinkauf(quelle.id, "291018");

    await expect(laufzeitenZusammenfuehren(ziel.id, quelle.id)).rejects.toBeInstanceOf(RechnungsFehler);
    expect(await testPrisma.laufzeit.count()).toBe(2);
  });

  it("führt nichts über Hostgrenzen hinweg zusammen", async () => {
    const [a, b] = await Promise.all([host("hv-pve-01"), host("hv-pve-02")]);
    const ziel = await laufzeit(a.id, "2026-10-17");
    const quelle = await laufzeit(b.id, "2026-10-17");

    await expect(laufzeitenZusammenfuehren(ziel.id, quelle.id)).rejects.toBeInstanceOf(RechnungsFehler);
  });
});
