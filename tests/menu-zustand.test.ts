import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Prüft das Öffnen und Schließen des Seitenmenüs. Statt eines echten Browsers genügen hier
 * Attrappen für `document.body` und `window` – geprüft wird, welche Klassen gesetzt werden.
 */

const klassen = new Set<string>();
let breite = 390;

function aufraeumen() {
  klassen.clear();
  breite = 390;
}

beforeEach(async () => {
  aufraeumen();
  vi.resetModules();

  const body = {
    classList: {
      toggle(name: string, an?: boolean) {
        const soll = an ?? !klassen.has(name);
        if (soll) klassen.add(name);
        else klassen.delete(name);
      },
      remove(name: string) {
        klassen.delete(name);
      },
      contains: (name: string) => klassen.has(name),
    },
    style: { overflow: "" },
  };

  vi.stubGlobal("document", { body });
  vi.stubGlobal("window", {
    get innerWidth() {
      return breite;
    },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Seitenmenü auf schmalen Bildschirmen", () => {
  it("öffnet und schließt wieder", async () => {
    const { menuUmschalten, menuSchliessen } = await import("@/components/layout/menuZustand");

    menuUmschalten();
    expect(klassen.has("sidebar-open")).toBe(true);

    menuSchliessen();
    expect(klassen.has("sidebar-open")).toBe(false);
  });

  it("sperrt den Inhalt hinter dem offenen Menü gegen Scrollen", async () => {
    const { menuUmschalten, menuSchliessen } = await import("@/components/layout/menuZustand");

    menuUmschalten();
    expect((document.body as unknown as { style: { overflow: string } }).style.overflow).toBe("hidden");

    menuSchliessen();
    expect((document.body as unknown as { style: { overflow: string } }).style.overflow).toBe("");
  });

  it("schließt auch beim zweiten Antippen des Knopfes", async () => {
    const { menuUmschalten } = await import("@/components/layout/menuZustand");

    menuUmschalten();
    menuUmschalten();
    expect(klassen.has("sidebar-open")).toBe(false);
  });

  it("macht ein zweites Schließen zum Nichts", async () => {
    const { menuSchliessen } = await import("@/components/layout/menuZustand");

    menuSchliessen();
    expect(klassen.has("sidebar-open")).toBe(false);
  });

  it("klappt auf breiten Bildschirmen nur ein, statt zu überlagern", async () => {
    breite = 1400;
    const { menuUmschalten } = await import("@/components/layout/menuZustand");

    menuUmschalten();
    expect(klassen.has("sidebar-collapse")).toBe(true);
    expect(klassen.has("sidebar-open")).toBe(false);
  });
});
