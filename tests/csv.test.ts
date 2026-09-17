import { describe, expect, it } from "vitest";
import { csvDatei, csvZelle } from "@/lib/csv";

describe("CSV-Export", () => {
  it("formatiert Werte deutsch", () => {
    expect(csvZelle(new Date("2027-03-02T00:00:00Z"))).toBe("02.03.2027");
    expect(csvZelle(1)).toBe("1");
    expect(csvZelle(1234.5)).toBe("1.234,50");
    expect(csvZelle(null)).toBe("");
    expect(csvZelle(undefined)).toBe("");
  });

  it("maskiert Semikolon, Anführungszeichen und Zeilenumbrüche", () => {
    expect(csvZelle("Firma; GmbH")).toBe('"Firma; GmbH"');
    expect(csvZelle('Er sagte "hallo"')).toBe('"Er sagte ""hallo"""');
    expect(csvZelle("Zeile1\nZeile2")).toBe('"Zeile1\nZeile2"');
  });

  it("schreibt BOM und Zeilenenden für Excel", () => {
    const datei = csvDatei(["A", "B"], [["x", 2]]);
    expect(datei.startsWith("﻿")).toBe(true);
    expect(datei).toContain("A;B\r\nx;2\r\n");
  });
});
