import { describe, expect, it } from "vitest";
import {
  alleRegelnPruefen,
  REGELN,
  type HostDaten,
  type LaufzeitDaten,
  type RegelKontext,
} from "@/server/alerts/regeln";

const JETZT = new Date("2026-09-17T12:00:00Z");
const TAG = 86_400_000;

function inTagen(tage: number): Date {
  return new Date(JETZT.getTime() + tage * TAG);
}

function host(überschreibungen: Partial<HostDaten> = {}): HostDaten {
  return {
    id: "h1",
    hostname: "pve-01",
    kundeId: "k1",
    kundeName: "Brandl Elektrotechnik GmbH",
    subKey: "pve1c-aaaa",
    subStatus: "ACTIVE",
    subNextduedate: inTagen(200),
    subLizenzierteSockets: 1,
    sockets: 1,
    letzterReportAm: new Date(JETZT.getTime() - 3_600_000),
    serverIds: [{ serverId: "AAAA", ersteMeldung: inTagen(-300), letzteMeldung: JETZT }],
    ...überschreibungen,
  };
}

function laufzeit(überschreibungen: Partial<LaufzeitDaten> = {}): LaufzeitDaten {
  return {
    id: "l1",
    hostId: "h1",
    hostname: "pve-01",
    kundeId: "k1",
    kundeName: "Brandl Elektrotechnik GmbH",
    key: "pve1c-aaaa",
    start: inTagen(-100),
    ende: inTagen(265),
    einkaufNummer: "PX-2026-1",
    einkaufBetrag: 115,
    einkaufBezahlt: true,
    einkaufFaelligAm: inTagen(-80),
    verkaufNummer: "RE-2026-1",
    verkaufBetrag: 165,
    verkaufErstellt: true,
    verkaufBezahlt: true,
    verkaufDatum: inTagen(-90),
    ...überschreibungen,
  };
}

function kontext(teil: Partial<RegelKontext> = {}): RegelKontext {
  return {
    jetzt: JETZT,
    hosts: [],
    laufzeiten: [],
    einstellungen: new Map(),
    ...teil,
  };
}

/** Hilfsfunktion: Kandidaten einer bestimmten Regel. */
function ausRegel(k: RegelKontext, name: string) {
  return alleRegelnPruefen(k).filter((kandidat) => kandidat.regel === name);
}

describe("Warnregeln", () => {
  it("prüft alle zehn Regeln, wenn nichts abgeschaltet ist", () => {
    expect(REGELN).toHaveLength(10);
    expect(new Set(REGELN.map((r) => r.name)).size).toBe(10);
  });

  describe("Subscription läuft ab", () => {
    it.each([
      [31, 0, null],
      [30, 1, "INFO"],
      [20, 1, "INFO"],
      [14, 1, "WARNUNG"],
      [8, 1, "WARNUNG"],
      [7, 1, "GEFAHR"],
      [1, 1, "GEFAHR"],
      [0, 1, "GEFAHR"],
      [-1, 0, null],
    ])("bei %i Tagen Restlaufzeit: %i Warnung(en)", (tage, anzahl, schwere) => {
      const kandidaten = ausRegel(
        kontext({ hosts: [host({ subNextduedate: inTagen(tage) })] }),
        "subscription-laeuft-ab",
      );

      expect(kandidaten).toHaveLength(anzahl);
      if (schwere) expect(kandidaten[0].schwere).toBe(schwere);
    });

    it("meldet nur die strengste erreichte Stufe", () => {
      const kandidaten = ausRegel(
        kontext({ hosts: [host({ subNextduedate: inTagen(5) })] }),
        "subscription-laeuft-ab",
      );
      expect(kandidaten).toHaveLength(1);
      expect(kandidaten[0].fingerprint).toBe("subscription-laeuft-ab:h1:7");
    });

    it("beachtet eigene Schwellwerte", () => {
      const k = kontext({
        hosts: [host({ subNextduedate: inTagen(50) })],
        einstellungen: new Map([
          ["subscription-laeuft-ab", { aktiv: true, schwellwerte: { tage: [60, 30] } }],
        ]),
      });
      expect(ausRegel(k, "subscription-laeuft-ab")).toHaveLength(1);
    });

    it("meldet nichts für Hosts ohne aktive Subscription", () => {
      const k = kontext({ hosts: [host({ subStatus: "EXPIRED", subNextduedate: inTagen(3) })] });
      expect(ausRegel(k, "subscription-laeuft-ab")).toHaveLength(0);
    });
  });

  describe("Status nicht aktiv", () => {
    it.each([
      ["EXPIRED", "GEFAHR"],
      ["INVALID", "GEFAHR"],
      ["SUSPENDED", "GEFAHR"],
      ["NOTFOUND", "WARNUNG"],
      ["UNKNOWN", "WARNUNG"],
    ] as const)("meldet %s als %s", (status, schwere) => {
      const kandidaten = ausRegel(kontext({ hosts: [host({ subStatus: status })] }), "status-nicht-aktiv");
      expect(kandidaten).toHaveLength(1);
      expect(kandidaten[0].schwere).toBe(schwere);
    });

    it("meldet aktive Subscriptions nicht", () => {
      expect(ausRegel(kontext({ hosts: [host()] }), "status-nicht-aktiv")).toHaveLength(0);
    });
  });

  describe("Sockets", () => {
    it("meldet eine Abweichung", () => {
      const k = kontext({ hosts: [host({ subLizenzierteSockets: 1, sockets: 2 })] });
      const kandidaten = ausRegel(k, "sockets-abweichung");
      expect(kandidaten).toHaveLength(1);
      expect(kandidaten[0].beschreibung).toContain("1 lizenziert, 2 physisch");
    });

    it("meldet nichts, wenn ein Wert fehlt", () => {
      expect(ausRegel(kontext({ hosts: [host({ sockets: null })] }), "sockets-abweichung")).toHaveLength(0);
      expect(
        ausRegel(kontext({ hosts: [host({ subLizenzierteSockets: null })] }), "sockets-abweichung"),
      ).toHaveLength(0);
    });
  });

  describe("Keine Meldung", () => {
    it("meldet nach Ablauf der Frist", () => {
      const k = kontext({ hosts: [host({ letzterReportAm: new Date(JETZT.getTime() - 49 * 3_600_000) })] });
      expect(ausRegel(k, "keine-meldung")).toHaveLength(1);
    });

    it("meldet innerhalb der Frist nicht", () => {
      const k = kontext({ hosts: [host({ letzterReportAm: new Date(JETZT.getTime() - 47 * 3_600_000) })] });
      expect(ausRegel(k, "keine-meldung")).toHaveLength(0);
    });

    it("beachtet einen eigenen Schwellwert", () => {
      const k = kontext({
        hosts: [host({ letzterReportAm: new Date(JETZT.getTime() - 13 * 3_600_000) })],
        einstellungen: new Map([["keine-meldung", { aktiv: true, schwellwerte: { stunden: 12 } }]]),
      });
      expect(ausRegel(k, "keine-meldung")).toHaveLength(1);
    });
  });

  describe("Server-ID", () => {
    it("meldet einen frischen Wechsel", () => {
      const k = kontext({
        hosts: [
          host({
            serverIds: [
              { serverId: "ALT", ersteMeldung: inTagen(-400), letzteMeldung: inTagen(-10) },
              { serverId: "NEU", ersteMeldung: inTagen(-5), letzteMeldung: JETZT },
            ],
          }),
        ],
      });
      const kandidaten = ausRegel(k, "serverid-geaendert");
      expect(kandidaten).toHaveLength(1);
      expect(kandidaten[0].beschreibung).toContain("neu NEU, vorher ALT");
    });

    it("meldet einen alten Wechsel nicht mehr", () => {
      const k = kontext({
        hosts: [
          host({
            serverIds: [
              { serverId: "ALT", ersteMeldung: inTagen(-400), letzteMeldung: inTagen(-200) },
              { serverId: "NEU", ersteMeldung: inTagen(-190), letzteMeldung: JETZT },
            ],
          }),
        ],
      });
      expect(ausRegel(k, "serverid-geaendert")).toHaveLength(0);
    });
  });

  describe("Key mehrfach gemeldet", () => {
    it("meldet denselben Key auf zwei Hosts", () => {
      const k = kontext({
        hosts: [host(), host({ id: "h2", hostname: "pve-02" })],
      });
      const kandidaten = ausRegel(k, "key-mehrfach-gemeldet");
      expect(kandidaten).toHaveLength(1);
      expect(kandidaten[0].beschreibung).toContain("pve-01, pve-02");
    });

    it("meldet unterschiedliche Keys nicht", () => {
      const k = kontext({ hosts: [host(), host({ id: "h2", subKey: "pve1c-bbbb" })] });
      expect(ausRegel(k, "key-mehrfach-gemeldet")).toHaveLength(0);
    });
  });

  describe("Host ohne Kunde", () => {
    it("meldet nicht zugeordnete Hosts", () => {
      const k = kontext({ hosts: [host({ kundeId: null, kundeName: null })] });
      const kandidaten = ausRegel(k, "host-ohne-kunde");
      expect(kandidaten).toHaveLength(1);
      expect(kandidaten[0].schwere).toBe("INFO");
    });
  });

  describe("Proxmox-Rechnung fällig", () => {
    it("meldet eine bald fällige unbezahlte Rechnung als Warnung", () => {
      const k = kontext({
        laufzeiten: [laufzeit({ einkaufBezahlt: false, einkaufFaelligAm: inTagen(5) })],
      });
      const kandidaten = ausRegel(k, "proxmox-rechnung-faellig");
      expect(kandidaten).toHaveLength(1);
      expect(kandidaten[0].schwere).toBe("WARNUNG");
    });

    it("meldet eine überfällige Rechnung als Gefahr", () => {
      const k = kontext({
        laufzeiten: [laufzeit({ einkaufBezahlt: false, einkaufFaelligAm: inTagen(-2) })],
      });
      const kandidaten = ausRegel(k, "proxmox-rechnung-faellig");
      expect(kandidaten[0].schwere).toBe("GEFAHR");
      expect(kandidaten[0].titel).toBe("Proxmox-Rechnung überfällig");
    });

    it("meldet bezahlte oder noch nicht fällige Rechnungen nicht", () => {
      expect(
        ausRegel(
          kontext({ laufzeiten: [laufzeit({ einkaufFaelligAm: inTagen(3) })] }),
          "proxmox-rechnung-faellig",
        ),
      ).toHaveLength(0);
      expect(
        ausRegel(
          kontext({ laufzeiten: [laufzeit({ einkaufBezahlt: false, einkaufFaelligAm: inTagen(20) })] }),
          "proxmox-rechnung-faellig",
        ),
      ).toHaveLength(0);
    });
  });

  describe("Kundenrechnung", () => {
    it("meldet eine fehlende Kundenrechnung, wenn der Einkauf erfasst ist", () => {
      const k = kontext({ laufzeiten: [laufzeit({ verkaufErstellt: false, verkaufNummer: null })] });
      expect(ausRegel(k, "kundenrechnung-fehlt")).toHaveLength(1);
    });

    it("meldet nichts für Hosts ohne Kunde", () => {
      const k = kontext({
        laufzeiten: [laufzeit({ verkaufErstellt: false, kundeId: null, kundeName: null })],
      });
      expect(ausRegel(k, "kundenrechnung-fehlt")).toHaveLength(0);
    });

    it("meldet eine seit über 30 Tagen unbezahlte Kundenrechnung", () => {
      const k = kontext({
        laufzeiten: [laufzeit({ verkaufBezahlt: false, verkaufDatum: inTagen(-31) })],
      });
      const kandidaten = ausRegel(k, "kundenrechnung-unbezahlt");
      expect(kandidaten).toHaveLength(1);
      expect(kandidaten[0].titel).toContain("31 Tagen");
    });

    it("meldet innerhalb der Frist nicht", () => {
      const k = kontext({
        laufzeiten: [laufzeit({ verkaufBezahlt: false, verkaufDatum: inTagen(-29) })],
      });
      expect(ausRegel(k, "kundenrechnung-unbezahlt")).toHaveLength(0);
    });
  });

  it("überspringt abgeschaltete Regeln", () => {
    const k = kontext({
      hosts: [host({ kundeId: null, kundeName: null })],
      einstellungen: new Map([["host-ohne-kunde", { aktiv: false, schwellwerte: {} }]]),
    });
    expect(ausRegel(k, "host-ohne-kunde")).toHaveLength(0);
  });

  it("erzeugt für jeden Fall einen eindeutigen Fingerabdruck", () => {
    const k = kontext({
      hosts: [
        host({ subStatus: "EXPIRED", sockets: 2, kundeId: null, kundeName: null }),
        host({ id: "h2", hostname: "pve-02", subStatus: "NOTFOUND" }),
      ],
      laufzeiten: [laufzeit({ einkaufBezahlt: false, einkaufFaelligAm: inTagen(1), verkaufErstellt: false })],
    });

    const fingerprints = alleRegelnPruefen(k).map((kandidat) => kandidat.fingerprint);
    expect(new Set(fingerprints).size).toBe(fingerprints.length);
  });
});
