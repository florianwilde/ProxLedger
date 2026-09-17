import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { hostListe } from "@/server/queries/hostliste";
import { datenbankLeeren, datenbankVerfuegbar, testPrisma } from "./helpers/db";

const JETZT = new Date("2026-09-17T12:00:00Z");

async function beispielDaten() {
  const kunde = await testPrisma.kunde.create({
    data: { name: "Brandl Elektrotechnik GmbH", kundennummer: "K-1001" },
  });
  const anderer = await testPrisma.kunde.create({
    data: { name: "Huber Logistik AG", kundennummer: "K-1002" },
  });

  const brandl = await testPrisma.host.create({
    data: {
      agentId: "agent-brandl",
      hostname: "pve-brandl-01",
      fqdn: "pve-brandl-01.brandl.local",
      produkt: "PVE",
      kundeId: kunde.id,
      serverId: "A1B2C3D4E5F60718",
      subKey: "pve1c-a6bd21fcb6",
      subStatus: "ACTIVE",
      subNextduedate: new Date("2026-09-24"),
      subLizenzierteSockets: 1,
      sockets: 1,
      ips: ["192.168.10.11"],
      letzterReportAm: new Date("2026-09-17T03:00:00Z"),
    },
  });

  await testPrisma.host.create({
    data: {
      agentId: "agent-huber",
      hostname: "pve-huber-01",
      produkt: "PVE",
      kundeId: anderer.id,
      subKey: "pve1c-77c0ea1b93",
      subStatus: "ACTIVE",
      subNextduedate: new Date("2026-12-01"),
      subLizenzierteSockets: 1,
      sockets: 2,
      ips: ["10.8.0.5"],
      letzterReportAm: new Date("2026-09-17T02:00:00Z"),
    },
  });

  await testPrisma.host.create({
    data: {
      agentId: "agent-pbs",
      hostname: "pbs-backup",
      produkt: "PBS",
      subStatus: "NOTFOUND",
      letzterReportAm: new Date("2026-09-10T02:00:00Z"),
    },
  });

  const rechnung = await testPrisma.proxmoxRechnung.create({
    data: {
      nummer: "PX-2026-14790",
      datum: new Date("2026-09-10"),
      nettoBetrag: 115,
      bezahlt: false,
      positionen: { create: [{ bezeichnung: "pve1c-a6bd21fcb6", nettoBetrag: 115 }] },
    },
    include: { positionen: true },
  });

  await testPrisma.laufzeit.create({
    data: {
      hostId: brandl.id,
      key: "pve1c-a6bd21fcb6",
      start: new Date("2026-09-24"),
      ende: new Date("2027-09-23"),
      status: "BESTAETIGT",
      proxmoxPositionId: rechnung.positionen[0].id,
    },
  });

  return { kunde, anderer, brandl };
}

describe.runIf(datenbankVerfuegbar)("Host-Tabelle", () => {
  beforeEach(async () => {
    await datenbankLeeren();
    await beispielDaten();
  });

  afterAll(async () => {
    await testPrisma.$disconnect();
  });

  it("findet einen Host über seinen Subscription-Key", async () => {
    const { hosts, gesamt } = await hostListe({ q: "pve1c-a6bd21fcb6" }, JETZT);
    expect(gesamt).toBe(1);
    expect(hosts[0].hostname).toBe("pve-brandl-01");
    expect(hosts[0].kunde?.name).toBe("Brandl Elektrotechnik GmbH");
  });

  it("findet Hosts über Server-ID, IP, FQDN und Kundenname", async () => {
    for (const suche of ["A1B2C3D4E5F60718", "192.168.10.11", "brandl.local", "Brandl Elektro"]) {
      const { hosts } = await hostListe({ q: suche }, JETZT);
      expect(
        hosts.map((h) => h.hostname),
        `Suche nach ${suche}`,
      ).toContain("pve-brandl-01");
    }
  });

  it("findet den Host über die Proxmox-Rechnungsnummer", async () => {
    const { hosts, gesamt } = await hostListe({ q: "PX-2026-14790" }, JETZT);
    expect(gesamt).toBe(1);
    expect(hosts[0].hostname).toBe("pve-brandl-01");
  });

  it("ignoriert Groß- und Kleinschreibung", async () => {
    const { gesamt } = await hostListe({ q: "PVE-BRANDL-01" }, JETZT);
    expect(gesamt).toBe(1);
  });

  it("filtert nach Kunde, Status und Produkt", async () => {
    const { kunde } = {
      kunde: await testPrisma.kunde.findFirstOrThrow({ where: { kundennummer: "K-1001" } }),
    };

    expect((await hostListe({ kunde: kunde.id }, JETZT)).gesamt).toBe(1);
    expect((await hostListe({ kunde: "ohne" }, JETZT)).gesamt).toBe(1);
    expect((await hostListe({ status: "ACTIVE" }, JETZT)).gesamt).toBe(2);
    expect((await hostListe({ status: "NOTFOUND" }, JETZT)).gesamt).toBe(1);
    expect((await hostListe({ produkt: "PBS" }, JETZT)).gesamt).toBe(1);
  });

  it("filtert nach Hosts, die sich länger als 48 Stunden nicht gemeldet haben", async () => {
    const { hosts } = await hostListe({ status: "keine-meldung" }, JETZT);
    expect(hosts.map((h) => h.hostname)).toEqual(["pbs-backup"]);
    expect(hosts[0].meldetNicht).toBe(true);
  });

  it("filtert nach baldigem Ablauf", async () => {
    expect((await hostListe({ ablauf: "14" }, JETZT)).gesamt).toBe(1);
    expect((await hostListe({ ablauf: "30" }, JETZT)).gesamt).toBe(1);
    expect((await hostListe({ ablauf: "abgelaufen" }, JETZT)).gesamt).toBe(0);
  });

  it("filtert nach offenen Rechnungspunkten", async () => {
    const { hosts } = await hostListe({ rechnung: "offen" }, JETZT);
    expect(hosts.map((h) => h.hostname)).toEqual(["pve-brandl-01"]);
  });

  it("erkennt abweichende Sockets", async () => {
    const { hosts } = await hostListe({ q: "pve-huber-01" }, JETZT);
    expect(hosts[0].socketAbweichung).toBe(true);
  });

  it("sortiert nach Ablaufdatum in beide Richtungen", async () => {
    const aufsteigend = await hostListe({ sortierung: "ablauf" }, JETZT);
    expect(aufsteigend.hosts[0].hostname).toBe("pve-brandl-01");

    const absteigend = await hostListe({ sortierung: "ablauf-ab" }, JETZT);
    expect(absteigend.hosts[0].subNextduedate).not.toBeNull();
    expect(absteigend.hosts[0].hostname).toBe("pve-huber-01");
  });

  it("kombiniert mehrere Filter", async () => {
    const { gesamt } = await hostListe({ status: "ACTIVE", produkt: "PVE", ablauf: "30" }, JETZT);
    expect(gesamt).toBe(1);
  });
});
