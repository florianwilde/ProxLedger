import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { datenbankLeeren, datenbankVerfuegbar, testPrisma } from "./helpers/db";

/**
 * Prüft, dass ein Kundenkonto wirklich nur die eigenen Daten sieht – und keine Einkaufspreise.
 * Die Anmeldung wird ersetzt, weil in einem Test keine Cookies existieren.
 */
let sichtbar: string | null = null;

vi.mock("@/server/auth/sitzungspflicht", () => ({
  sichtbarerKunde: async () => sichtbar,
  darfEinkaufSehen: async () => sichtbar === null,
  angemeldet: async () => null,
  sitzungErforderlich: async () => {
    throw new Error("in diesem Test nicht vorgesehen");
  },
}));

const { hostListe } = await import("@/server/queries/hostliste");
const { rechnungsListe } = await import("@/server/queries/rechnungen");
const { kennzahlen } = await import("@/server/queries/hosts");
const { kundenListe } = await import("@/server/queries/kunden");

async function daten() {
  const [eigener, fremder] = await Promise.all([
    testPrisma.kunde.create({ data: { name: "Eigen GmbH", kundennummer: "K-1" } }),
    testPrisma.kunde.create({ data: { name: "Fremd AG", kundennummer: "K-2" } }),
  ]);

  const [hostA, hostB] = await Promise.all([
    testPrisma.host.create({
      data: { agentId: "a-1", hostname: "pve-eigen", produkt: "PVE", kundeId: eigener.id, subStatus: "ACTIVE" },
    }),
    testPrisma.host.create({
      data: { agentId: "a-2", hostname: "pve-fremd", produkt: "PVE", kundeId: fremder.id, subStatus: "ACTIVE" },
    }),
  ]);

  // Je eine Laufzeit mit Einkauf (Proxmox) und Verkauf (Kunde).
  for (const [host, kunde, nummer] of [
    [hostA, eigener, "PX-1"],
    [hostB, fremder, "PX-2"],
  ] as const) {
    const laufzeit = await testPrisma.laufzeit.create({
      data: {
        hostId: host.id,
        key: `pve1c-${host.hostname}`,
        start: new Date("2026-01-01"),
        ende: new Date("2026-12-31"),
        status: "BESTAETIGT",
      },
    });
    const rechnung = await testPrisma.proxmoxRechnung.create({
      data: { nummer, datum: new Date("2026-01-02"), nettoBetrag: 100, ustSatz: 19, bezahlt: true },
    });
    // Die Verbindung liegt auf der Laufzeit, nicht auf der Position.
    const position = await testPrisma.proxmoxRechnungPosition.create({
      data: { rechnungId: rechnung.id, bezeichnung: "Position", nettoBetrag: 100 },
    });
    await testPrisma.laufzeit.update({
      where: { id: laufzeit.id },
      data: { proxmoxPosition: { connect: { id: position.id } } },
    });
    const kundenrechnung = await testPrisma.kundenrechnung.create({
      data: { kundeId: kunde.id, nummer: `KR-${nummer}`, ustSatz: 19, erstellt: true, bezahlt: false },
    });
    const kundenPosition = await testPrisma.kundenrechnungPosition.create({
      data: { rechnungId: kundenrechnung.id, bezeichnung: "Position", nettoBetrag: 130 },
    });
    await testPrisma.laufzeit.update({
      where: { id: laufzeit.id },
      data: { kundenPosition: { connect: { id: kundenPosition.id } } },
    });
  }

  return { eigener, fremder };
}

describe.runIf(datenbankVerfuegbar)("Sicht eines Kundenkontos", () => {
  beforeEach(async () => {
    await datenbankLeeren();
    sichtbar = null;
  });

  afterAll(async () => {
    await testPrisma.$disconnect();
  });

  it("zeigt ohne Einschränkung alle Hosts", async () => {
    await daten();
    const liste = await hostListe({});
    expect(liste.gesamt).toBe(2);
  });

  it("zeigt einem Kundenkonto nur die eigenen Hosts", async () => {
    const { eigener } = await daten();
    sichtbar = eigener.id;

    const liste = await hostListe({});
    expect(liste.gesamt).toBe(1);
    expect(liste.hosts[0].hostname).toBe("pve-eigen");
  });

  it("verbirgt Einkaufspreis und Marge vor dem Kundenkonto", async () => {
    const { eigener } = await daten();

    const alles = await rechnungsListe({});
    expect(alles.zeilen.every((z) => z.einkaufBetrag === 100)).toBe(true);
    expect(alles.summen.marge).toBe(60);

    sichtbar = eigener.id;
    const eingeschraenkt = await rechnungsListe({});
    expect(eingeschraenkt.zeilen).toHaveLength(1);
    expect(eingeschraenkt.zeilen[0].einkaufBetrag).toBeNull();
    expect(eingeschraenkt.zeilen[0].einkaufNummer).toBeNull();
    expect(eingeschraenkt.zeilen[0].marge).toBeNull();
    expect(eingeschraenkt.zeilen[0].verkaufBetrag).toBe(130);
  });

  it("zählt für das Kundenkonto nur die eigenen Hosts", async () => {
    const { eigener } = await daten();
    sichtbar = eigener.id;

    const zahlen = await kennzahlen();
    expect(zahlen.hostsGesamt).toBe(1);
    expect(zahlen.offeneEinkaufsrechnungen).toBe(0);
  });

  it("zeigt in der Kundenliste nur den eigenen Kunden", async () => {
    const { eigener } = await daten();
    sichtbar = eigener.id;

    const liste = await kundenListe();
    expect(liste).toHaveLength(1);
    expect(liste[0].name).toBe("Eigen GmbH");
  });

  it("sperrt ein Kundenkonto ohne Kundenbindung vollständig aus", async () => {
    await daten();
    sichtbar = "kein-kunde-zugeordnet";

    const liste = await hostListe({});
    expect(liste.gesamt).toBe(0);
  });
});
