import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { hostsZuweisenService, ZuweisungsFehler } from "@/server/services/zuweisung";
import { kennzahlen, hostsOhneKunde } from "@/server/queries/hosts";
import { kundenListe, offeneRechnungspunkteProKunde } from "@/server/queries/kunden";
import { datenbankLeeren, datenbankVerfuegbar, testPrisma } from "./helpers/db";

async function kundeMitStandort(name = "Testkunde GmbH", nummer = "K-7001") {
  return testPrisma.kunde.create({
    data: {
      name,
      kundennummer: nummer,
      standorte: { create: [{ name: "Zentrale" }] },
    },
    include: { standorte: true },
  });
}

async function host(agentId: string, hostname: string, daten: Record<string, unknown> = {}) {
  return testPrisma.host.create({
    data: { agentId, hostname, produkt: "PVE", ...daten },
  });
}

describe.runIf(datenbankVerfuegbar)("Hostzuweisung", () => {
  beforeEach(async () => {
    await datenbankLeeren();
  });

  afterAll(async () => {
    await testPrisma.$disconnect();
  });

  it("weist mehrere Hosts gleichzeitig einem Kunden und Standort zu", async () => {
    const kunde = await kundeMitStandort();
    const eins = await host("agent-1", "pve-01");
    const zwei = await host("agent-2", "pve-02");
    await host("agent-3", "pve-03");

    const ergebnis = await hostsZuweisenService([eins.id, zwei.id], kunde.id, kunde.standorte[0].id);

    expect(ergebnis.anzahl).toBe(2);
    expect(ergebnis.kundenName).toBe("Testkunde GmbH");

    const zugewiesen = await testPrisma.host.findMany({ where: { kundeId: kunde.id } });
    expect(zugewiesen.map((h) => h.hostname).sort()).toEqual(["pve-01", "pve-02"]);
    expect(zugewiesen.every((h) => h.standortId === kunde.standorte[0].id)).toBe(true);

    const offen = await hostsOhneKunde();
    expect(offen.map((h) => h.hostname)).toEqual(["pve-03"]);
  });

  it("schreibt einen Audit-Eintrag", async () => {
    const kunde = await kundeMitStandort();
    const eins = await host("agent-1", "pve-01");

    await hostsZuweisenService([eins.id], kunde.id, null);

    const eintrag = await testPrisma.auditEintrag.findFirst({ where: { aktion: "host.zugewiesen" } });
    expect(eintrag).not.toBeNull();
    expect(eintrag?.aenderung).toMatchObject({ anzahl: 1, kundeId: kunde.id });
  });

  it("schließt die Warnung „Host ohne Kunde“ mit der Zuweisung", async () => {
    const kunde = await kundeMitStandort();
    const eins = await host("agent-1", "pve-01");
    await testPrisma.alert.create({
      data: {
        regel: "host-ohne-kunde",
        fingerprint: `host-ohne-kunde:${eins.id}`,
        schwere: "INFO",
        titel: "Host ist keinem Kunden zugewiesen",
        beschreibung: "pve-01",
        hostId: eins.id,
      },
    });

    await hostsZuweisenService([eins.id], kunde.id, null);

    const alert = await testPrisma.alert.findFirstOrThrow({ where: { hostId: eins.id } });
    expect(alert.erledigtAm).not.toBeNull();
  });

  it("lehnt einen Standort ab, der zu einem anderen Kunden gehört", async () => {
    const kundeA = await kundeMitStandort("Kunde A", "K-7001");
    const kundeB = await kundeMitStandort("Kunde B", "K-7002");
    const eins = await host("agent-1", "pve-01");

    await expect(hostsZuweisenService([eins.id], kundeA.id, kundeB.standorte[0].id)).rejects.toThrow(
      ZuweisungsFehler,
    );

    const unveraendert = await testPrisma.host.findUniqueOrThrow({ where: { id: eins.id } });
    expect(unveraendert.kundeId).toBeNull();
  });

  it("lehnt eine Zuweisung ohne Auswahl oder ohne Kunde ab", async () => {
    const kunde = await kundeMitStandort();
    await expect(hostsZuweisenService([], kunde.id, null)).rejects.toThrow(ZuweisungsFehler);
    await expect(hostsZuweisenService(["irgendwas"], null, null)).rejects.toThrow(ZuweisungsFehler);
  });

  it("zählt Kennzahlen für Dashboard und Sidebar korrekt", async () => {
    const jetzt = new Date("2026-09-17T12:00:00Z");
    const kunde = await kundeMitStandort();

    await host("agent-1", "pve-aktiv", {
      kundeId: kunde.id,
      subStatus: "ACTIVE",
      subNextduedate: new Date("2026-10-01"),
      letzterReportAm: new Date("2026-09-17T03:00:00Z"),
    });
    await host("agent-2", "pve-abgelaufen", {
      kundeId: kunde.id,
      subStatus: "EXPIRED",
      letzterReportAm: new Date("2026-09-17T03:00:00Z"),
    });
    await host("agent-3", "pve-stumm", {
      subStatus: "ACTIVE",
      letzterReportAm: new Date("2026-09-10T03:00:00Z"),
    });

    const zahlen = await kennzahlen(jetzt);

    expect(zahlen.hostsGesamt).toBe(3);
    expect(zahlen.aktivLizenziert).toBe(2);
    expect(zahlen.ohneSubscription).toBe(1);
    expect(zahlen.baldAblaufend).toBe(1);
    expect(zahlen.ohneKunde).toBe(1);
    expect(zahlen.ohneMeldung).toBe(1);
  });

  it("zählt offene Rechnungspunkte je Kunde", async () => {
    const kunde = await kundeMitStandort();
    const eins = await host("agent-1", "pve-01", { kundeId: kunde.id });

    const rechnung = await testPrisma.proxmoxRechnung.create({
      data: {
        nummer: "PX-TEST-9",
        datum: new Date("2026-09-01"),
        nettoBetrag: 115,
        bezahlt: false,
        positionen: { create: [{ bezeichnung: "Key", nettoBetrag: 115 }] },
      },
      include: { positionen: true },
    });

    await testPrisma.laufzeit.create({
      data: {
        hostId: eins.id,
        key: "pve1c-test",
        start: new Date("2026-09-24"),
        ende: new Date("2027-09-23"),
        status: "BESTAETIGT",
        proxmoxPositionId: rechnung.positionen[0].id,
      },
    });

    const punkte = await offeneRechnungspunkteProKunde();
    // Einkauf unbezahlt und Kundenrechnung fehlt = zwei offene Punkte von zwei möglichen.
    expect(punkte.get(kunde.id)).toEqual({ offen: 2, gesamt: 2 });

    const liste = await kundenListe();
    expect(liste[0].hosts).toBe(1);
  });
});
