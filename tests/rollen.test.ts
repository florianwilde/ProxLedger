import { describe, expect, it } from "vitest";
import { darf, RECHTE, ROLLEN_TEXT } from "@/server/auth/rollen";

describe("Rollen und Rechte", () => {
  it("lässt den Administrator alles", () => {
    for (const recht of Object.keys(RECHTE) as (keyof typeof RECHTE)[]) {
      expect(darf("ADMIN", recht)).toBe(true);
    }
  });

  it("lässt den Techniker alles Fachliche, aber keine Verwaltung", () => {
    expect(darf("TECHNIKER", "fachlichSchreiben")).toBe(true);
    expect(darf("TECHNIKER", "betrieb")).toBe(true);
    expect(darf("TECHNIKER", "mitarbeiten")).toBe(true);
    expect(darf("TECHNIKER", "verwaltung")).toBe(false);
  });

  it("lässt den Kunden nur mitarbeiten", () => {
    expect(darf("KUNDE", "mitarbeiten")).toBe(true);
    expect(darf("KUNDE", "fachlichSchreiben")).toBe(false);
    expect(darf("KUNDE", "betrieb")).toBe(false);
    expect(darf("KUNDE", "verwaltung")).toBe(false);
  });

  it("kennt für jede Rolle einen Anzeigetext", () => {
    expect(ROLLEN_TEXT.ADMIN).toBe("Administrator");
    expect(ROLLEN_TEXT.TECHNIKER).toBe("Techniker");
    expect(ROLLEN_TEXT.KUNDE).toBe("Kunde");
  });
});
