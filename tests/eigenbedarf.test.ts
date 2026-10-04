import { describe, expect, it } from "vitest";
import { alleRegelnPruefen, type LaufzeitDaten, type RegelKontext } from "@/server/alerts/regeln";

/** Eigenbedarf: eigene Hosts ohne Weiterberechnung (#044). */

const JETZT = new Date("2026-10-04T12:00:00Z");

function laufzeit(überschreibungen: Partial<LaufzeitDaten> = {}): LaufzeitDaten {
  return {
    id: "l1",
    hostId: "h1",
    hostname: "hv-ste-pve-01",
    kundeId: "k1",
    kundeEigenbedarf: false,
    kundeName: "Florian Wilde IT SysOp",
    key: "pve2s-aaaa",
    start: new Date("2026-06-03"),
    ende: new Date("2027-06-02"),
    einkaufNummer: "291017",
    einkaufBetrag: 990,
    einkaufBezahlt: true,
    einkaufFaelligAm: new Date("2026-10-17"),
    verkaufNummer: null,
    verkaufBetrag: null,
    verkaufErstellt: false,
    verkaufBezahlt: false,
    verkaufDatum: null,
    ...überschreibungen,
  };
}

function kontext(laufzeiten: LaufzeitDaten[]): RegelKontext {
  return { jetzt: JETZT, hosts: [], laufzeiten, einstellungen: new Map() };
}

function regeln(k: RegelKontext, name: string) {
  return alleRegelnPruefen(k).filter((kandidat) => kandidat.regel === name);
}

describe("Eigenbedarf", () => {
  it("mahnt bei einem normalen Kunden die fehlende Kundenrechnung an", () => {
    expect(regeln(kontext([laufzeit()]), "kundenrechnung-fehlt")).toHaveLength(1);
  });

  it("schweigt beim Eigenbedarf – es gibt niemanden, dem man schreibt", () => {
    expect(regeln(kontext([laufzeit({ kundeEigenbedarf: true })]), "kundenrechnung-fehlt")).toHaveLength(0);
  });

  it("mahnt beim Eigenbedarf keine unbezahlte Kundenrechnung an", () => {
    const k = kontext([
      laufzeit({
        kundeEigenbedarf: true,
        verkaufErstellt: true,
        verkaufDatum: new Date("2026-01-01"),
        verkaufBezahlt: false,
      }),
    ]);
    expect(regeln(k, "kundenrechnung-unbezahlt")).toHaveLength(0);
  });

  it("meldet beim Eigenbedarf nicht „Kunde hat bezahlt“", () => {
    const k = kontext([
      laufzeit({ kundeEigenbedarf: true, verkaufBezahlt: true, einkaufBezahlt: false }),
    ]);
    expect(regeln(k, "kunde-bezahlt-einkauf-offen")).toHaveLength(0);
  });

  it("lässt die Einkaufsseite unberührt", () => {
    // Die Proxmox-Rechnung muss auch für eigene Hosts bezahlt werden.
    const k = kontext([
      laufzeit({
        kundeEigenbedarf: true,
        einkaufBezahlt: false,
        einkaufFaelligAm: new Date("2026-10-06"),
      }),
    ]);
    expect(regeln(k, "proxmox-rechnung-faellig")).toHaveLength(1);
  });
});
