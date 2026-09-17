import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
  einkaufBezahltSetzen,
  kundenrechnungErfassen,
  laufzeitAnlegen,
  laufzeitBestaetigen,
  laufzeitVerwerfen,
  proxmoxRechnungErfassen,
  RechnungsFehler,
  verkaufBezahltSetzen,
  verkaufErstelltSetzen,
} from "@/server/services/rechnungen";
import { datenbankLeeren, datenbankVerfuegbar, testPrisma } from "./helpers/db";

async function aufbau() {
  const kunde = await testPrisma.kunde.create({
    data: { name: "Brandl Elektrotechnik GmbH", kundennummer: "K-1001" },
  });

  const hostA = await testPrisma.host.create({
    data: { agentId: "a-1", hostname: "pve-01", produkt: "PVE", kundeId: kunde.id },
  });
  const hostB = await testPrisma.host.create({
    data: { agentId: "a-2", hostname: "pve-02", produkt: "PVE", kundeId: kunde.id },
  });

  const laufzeitA = await testPrisma.laufzeit.create({
    data: {
      hostId: hostA.id,
      key: "pve1c-aaaa",
      start: new Date("2026-09-24"),
      ende: new Date("2027-09-23"),
      status: "VORSCHLAG",
    },
  });
  const laufzeitB = await testPrisma.laufzeit.create({
    data: {
      hostId: hostB.id,
      key: "pve2c-bbbb",
      start: new Date("2026-10-08"),
      ende: new Date("2027-10-07"),
      status: "VORSCHLAG",
    },
  });

  return { kunde, hostA, hostB, laufzeitA, laufzeitB };
}

const EINKAUF = {
  nummer: "PX-2026-14790",
  datum: new Date("2026-09-10"),
  faelligAm: new Date("2026-09-24"),
  nettoBetrag: 115,
  bezahlt: false,
};

describe.runIf(datenbankVerfuegbar)("Laufzeiten und Rechnungen", () => {
  beforeEach(async () => {
    await datenbankLeeren();
  });

  afterAll(async () => {
    await testPrisma.$disconnect();
  });

  describe("Laufzeiten", () => {
    it("bestätigt einen Vorschlag", async () => {
      const { laufzeitA } = await aufbau();
      await laufzeitBestaetigen(laufzeitA.id);

      const danach = await testPrisma.laufzeit.findUniqueOrThrow({ where: { id: laufzeitA.id } });
      expect(danach.status).toBe("BESTAETIGT");
    });

    it("verwirft einen Vorschlag, aber keine bestätigte Laufzeit", async () => {
      const { laufzeitA, laufzeitB } = await aufbau();

      await laufzeitVerwerfen(laufzeitA.id);
      expect(await testPrisma.laufzeit.findUnique({ where: { id: laufzeitA.id } })).toBeNull();

      await laufzeitBestaetigen(laufzeitB.id);
      await expect(laufzeitVerwerfen(laufzeitB.id)).rejects.toThrow(RechnungsFehler);
    });

    it("legt eine Laufzeit von Hand an und verhindert doppelte Startdaten", async () => {
      const { hostA } = await aufbau();

      const daten = {
        hostId: hostA.id,
        key: "pve1c-manuell",
        start: new Date("2028-01-01"),
        ende: new Date("2028-12-31"),
      };
      await laufzeitAnlegen(daten);
      await expect(laufzeitAnlegen(daten)).rejects.toThrow(RechnungsFehler);
      await expect(
        laufzeitAnlegen({ ...daten, start: new Date("2029-01-01"), ende: new Date("2028-12-31") }),
      ).rejects.toThrow(RechnungsFehler);
    });
  });

  describe("Proxmox-Rechnung", () => {
    it("erfasst eine Rechnung und bestätigt die Laufzeit dabei", async () => {
      const { laufzeitA } = await aufbau();
      const ergebnis = await proxmoxRechnungErfassen(laufzeitA.id, EINKAUF);

      expect(ergebnis.sammelrechnung).toBe(false);

      const laufzeit = await testPrisma.laufzeit.findUniqueOrThrow({
        where: { id: laufzeitA.id },
        include: { proxmoxPosition: { include: { rechnung: true } } },
      });
      expect(laufzeit.status).toBe("BESTAETIGT");
      expect(laufzeit.proxmoxPosition?.rechnung.nummer).toBe("PX-2026-14790");
      expect(Number(laufzeit.proxmoxPosition?.nettoBetrag)).toBe(115);
      expect(laufzeit.proxmoxPosition?.rechnung.faelligAm?.toISOString().slice(0, 10)).toBe("2026-09-24");
    });

    it("hängt eine zweite Laufzeit an dieselbe Rechnungsnummer an (Sammelrechnung)", async () => {
      const { laufzeitA, laufzeitB } = await aufbau();

      await proxmoxRechnungErfassen(laufzeitA.id, EINKAUF);
      const zweite = await proxmoxRechnungErfassen(laufzeitB.id, { ...EINKAUF, nettoBetrag: 220 });

      expect(zweite.sammelrechnung).toBe(true);
      expect(await testPrisma.proxmoxRechnung.count()).toBe(1);

      const rechnung = await testPrisma.proxmoxRechnung.findUniqueOrThrow({
        where: { nummer: "PX-2026-14790" },
        include: { positionen: true },
      });
      expect(rechnung.positionen).toHaveLength(2);
      // Der Rechnungsbetrag ist die Summe der Positionen.
      expect(Number(rechnung.nettoBetrag)).toBe(335);
    });

    it("ändert eine bereits erfasste Rechnung, statt eine zweite Position anzulegen", async () => {
      const { laufzeitA } = await aufbau();
      await proxmoxRechnungErfassen(laufzeitA.id, EINKAUF);
      await proxmoxRechnungErfassen(laufzeitA.id, { ...EINKAUF, nettoBetrag: 130, bezahlt: true });

      const rechnung = await testPrisma.proxmoxRechnung.findUniqueOrThrow({
        where: { nummer: "PX-2026-14790" },
        include: { positionen: true },
      });
      expect(rechnung.positionen).toHaveLength(1);
      expect(Number(rechnung.nettoBetrag)).toBe(130);
      expect(rechnung.bezahlt).toBe(true);
      expect(rechnung.bezahltAm).not.toBeNull();
    });

    it("verlangt eine Rechnungsnummer", async () => {
      const { laufzeitA } = await aufbau();
      await expect(proxmoxRechnungErfassen(laufzeitA.id, { ...EINKAUF, nummer: "  " })).rejects.toThrow(
        RechnungsFehler,
      );
    });
  });

  describe("Kundenrechnung", () => {
    it("erfasst eine Kundenrechnung mit Position", async () => {
      const { laufzeitA, kunde } = await aufbau();
      await kundenrechnungErfassen(laufzeitA.id, {
        erstellt: true,
        nummer: "RE-2026-0001",
        datum: new Date("2026-10-01"),
        nettoBetrag: 165,
        bezahlt: false,
      });

      const rechnung = await testPrisma.kundenrechnung.findUniqueOrThrow({
        where: { nummer: "RE-2026-0001" },
        include: { positionen: true },
      });
      expect(rechnung.kundeId).toBe(kunde.id);
      expect(rechnung.erstellt).toBe(true);
      expect(Number(rechnung.nettoBetrag)).toBe(165);
      expect(rechnung.positionen).toHaveLength(1);
    });

    it("fasst mehrere Laufzeiten desselben Kunden zu einer Rechnung zusammen", async () => {
      const { laufzeitA, laufzeitB } = await aufbau();

      await kundenrechnungErfassen(laufzeitA.id, {
        erstellt: true,
        nummer: "RE-2026-0002",
        nettoBetrag: 165,
        bezahlt: false,
      });
      const zweite = await kundenrechnungErfassen(laufzeitB.id, {
        erstellt: true,
        nummer: "RE-2026-0002",
        nettoBetrag: 320,
        bezahlt: false,
      });

      expect(zweite.sammelrechnung).toBe(true);
      const rechnung = await testPrisma.kundenrechnung.findUniqueOrThrow({
        where: { nummer: "RE-2026-0002" },
        include: { positionen: true },
      });
      expect(rechnung.positionen).toHaveLength(2);
      expect(Number(rechnung.nettoBetrag)).toBe(485);
    });

    it("weist eine Rechnungsnummer ab, die einem anderen Kunden gehört", async () => {
      const { laufzeitA } = await aufbau();
      const fremderKunde = await testPrisma.kunde.create({
        data: { name: "Huber Logistik AG", kundennummer: "K-1002" },
      });
      const fremderHost = await testPrisma.host.create({
        data: { agentId: "a-3", hostname: "pve-huber", produkt: "PVE", kundeId: fremderKunde.id },
      });
      const fremdeLaufzeit = await testPrisma.laufzeit.create({
        data: {
          hostId: fremderHost.id,
          key: "pve1c-cccc",
          start: new Date("2026-11-01"),
          ende: new Date("2027-10-31"),
          status: "BESTAETIGT",
        },
      });

      await kundenrechnungErfassen(fremdeLaufzeit.id, {
        erstellt: true,
        nummer: "RE-2026-0003",
        nettoBetrag: 100,
        bezahlt: false,
      });

      await expect(
        kundenrechnungErfassen(laufzeitA.id, {
          erstellt: true,
          nummer: "RE-2026-0003",
          nettoBetrag: 165,
          bezahlt: false,
        }),
      ).rejects.toThrow(RechnungsFehler);
    });

    it("lehnt eine Kundenrechnung für einen Host ohne Kunde ab", async () => {
      const host = await testPrisma.host.create({
        data: { agentId: "a-ohne", hostname: "pve-ohne-kunde", produkt: "PVE" },
      });
      const laufzeit = await testPrisma.laufzeit.create({
        data: {
          hostId: host.id,
          key: "pve1c-dddd",
          start: new Date("2026-09-01"),
          ende: new Date("2027-08-31"),
          status: "BESTAETIGT",
        },
      });

      await expect(
        kundenrechnungErfassen(laufzeit.id, { erstellt: true, bezahlt: false, nettoBetrag: 10 }),
      ).rejects.toThrow(RechnungsFehler);
    });
  });

  describe("Häkchen in der Tabelle", () => {
    it("setzt „Proxmox bezahlt“ samt Bezahldatum und nimmt es zurück", async () => {
      const { laufzeitA } = await aufbau();
      await proxmoxRechnungErfassen(laufzeitA.id, EINKAUF);

      await einkaufBezahltSetzen(laufzeitA.id, true);
      let rechnung = await testPrisma.proxmoxRechnung.findUniqueOrThrow({
        where: { nummer: EINKAUF.nummer },
      });
      expect(rechnung.bezahlt).toBe(true);
      expect(rechnung.bezahltAm).not.toBeNull();

      await einkaufBezahltSetzen(laufzeitA.id, false);
      rechnung = await testPrisma.proxmoxRechnung.findUniqueOrThrow({ where: { nummer: EINKAUF.nummer } });
      expect(rechnung.bezahlt).toBe(false);
      expect(rechnung.bezahltAm).toBeNull();
    });

    it("meldet sich, wenn noch keine Proxmox-Rechnung erfasst ist", async () => {
      const { laufzeitA } = await aufbau();
      await expect(einkaufBezahltSetzen(laufzeitA.id, true)).rejects.toThrow(RechnungsFehler);
    });

    it("legt beim Häkchen „Kundenrechnung erstellt“ eine Rechnung ohne Nummer an", async () => {
      const { laufzeitA } = await aufbau();
      await verkaufErstelltSetzen(laufzeitA.id, true);

      const laufzeit = await testPrisma.laufzeit.findUniqueOrThrow({
        where: { id: laufzeitA.id },
        include: { kundenPosition: { include: { rechnung: true } } },
      });
      expect(laufzeit.kundenPosition?.rechnung.erstellt).toBe(true);
      expect(laufzeit.kundenPosition?.rechnung.nummer).toBeNull();

      // Die Nummer lässt sich später nachtragen, ohne dass eine zweite Rechnung entsteht.
      await kundenrechnungErfassen(laufzeitA.id, {
        erstellt: true,
        nummer: "RE-2026-0009",
        nettoBetrag: 165,
        bezahlt: false,
      });
      expect(await testPrisma.kundenrechnung.count()).toBe(1);
      const nachgetragen = await testPrisma.kundenrechnung.findFirstOrThrow();
      expect(nachgetragen.nummer).toBe("RE-2026-0009");
      expect(Number(nachgetragen.nettoBetrag)).toBe(165);
    });

    it("setzt „Kundenrechnung bezahlt“", async () => {
      const { laufzeitA } = await aufbau();
      await verkaufErstelltSetzen(laufzeitA.id, true);
      await verkaufBezahltSetzen(laufzeitA.id, true);

      const rechnung = await testPrisma.kundenrechnung.findFirstOrThrow();
      expect(rechnung.bezahlt).toBe(true);
      expect(rechnung.bezahltAm).not.toBeNull();
    });
  });
});
