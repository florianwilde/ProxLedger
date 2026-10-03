import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { datenbankLeeren, datenbankVerfuegbar, testPrisma } from "./helpers/db";

/**
 * Rabatt je Position und Sammelrechnung über mehrere Hosts – so, wie Proxmox abrechnet (#037):
 * je Key eine Zeile mit Listenpreis und eine Zeile mit „Client Discount“.
 */
vi.mock("@/server/auth/sitzungspflicht", () => ({
  sitzungErforderlich: async () => ({ benutzerId: "test", rolle: "ADMIN", kundeId: null }),
  sichtbarerKunde: async () => null,
  darfEinkaufSehen: async () => true,
  angemeldet: async () => null,
}));

const { proxmoxRechnungErfassen } = await import("@/server/services/rechnungen");

async function laufzeit(key: string) {
  const kunde = await testPrisma.kunde.upsert({
    where: { kundennummer: "K-1" },
    update: {},
    create: { name: "Wilde IT", kundennummer: "K-1" },
  });
  const host = await testPrisma.host.create({
    data: { agentId: `a-${key}`, hostname: `hv-${key}`, produkt: "PVE", kundeId: kunde.id },
  });
  return testPrisma.laufzeit.create({
    data: {
      hostId: host.id,
      key,
      start: new Date("2026-10-17"),
      ende: new Date("2027-10-16"),
      status: "VORSCHLAG",
    },
  });
}

const eingabe = {
  nummer: "291017",
  datum: new Date("2026-09-17"),
  faelligAm: new Date("2026-10-17"),
  nettoBetrag: 1100,
  rabatt: 110,
  ustSatz: 0,
  bezahlt: false,
  bezahltAm: null,
  zahlungsart: null,
  anhangId: null,
  notizen: null,
};

describe.runIf(datenbankVerfuegbar)("Proxmox-Rechnung mit Rabatt", () => {
  beforeEach(async () => {
    await datenbankLeeren();
  });

  afterAll(async () => {
    await testPrisma.$disconnect();
  });

  it("legt den Rabatt an der Position ab, nicht an der Rechnung", async () => {
    const l = await laufzeit("pve2s-3ef3be4d75");
    await proxmoxRechnungErfassen(l.id, eingabe);

    const position = await testPrisma.proxmoxRechnungPosition.findFirstOrThrow({});
    expect(Number(position.nettoBetrag)).toBe(1100);
    expect(Number(position.rabatt)).toBe(110);
  });

  it("rechnet die Rechnungssumme als Listenpreise minus Rabatte", async () => {
    // Genau der Fall aus der echten Rechnung 291017: zwei Keys, je 1100 minus 110 = 1980.
    const ersteLaufzeit = await laufzeit("pve2s-3ef3be4d75");
    const zweiteLaufzeit = await laufzeit("pve2s-b7a0d516af");

    await proxmoxRechnungErfassen(ersteLaufzeit.id, eingabe);
    await proxmoxRechnungErfassen(zweiteLaufzeit.id, eingabe);

    const rechnung = await testPrisma.proxmoxRechnung.findUniqueOrThrow({
      where: { nummer: "291017" },
      include: { positionen: true },
    });

    expect(rechnung.positionen).toHaveLength(2);
    expect(Number(rechnung.nettoBetrag)).toBe(1980);
  });

  it("bestätigt die Laufzeit beim Erfassen", async () => {
    const l = await laufzeit("pve2s-3ef3be4d75");
    await proxmoxRechnungErfassen(l.id, eingabe);

    const danach = await testPrisma.laufzeit.findUniqueOrThrow({ where: { id: l.id } });
    expect(danach.status).toBe("BESTAETIGT");
  });

  it("führt die Summe nach, wenn sich ein Betrag ändert", async () => {
    const l = await laufzeit("pve2s-3ef3be4d75");
    await proxmoxRechnungErfassen(l.id, eingabe);
    await proxmoxRechnungErfassen(l.id, { ...eingabe, nettoBetrag: 1200, rabatt: 0 });

    const rechnung = await testPrisma.proxmoxRechnung.findUniqueOrThrow({ where: { nummer: "291017" } });
    expect(Number(rechnung.nettoBetrag)).toBe(1200);
  });
});
