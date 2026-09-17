import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { datenbankLeeren, datenbankVerfuegbar, testPrisma } from "./helpers/db";

let verzeichnis: string;

beforeAll(() => {
  verzeichnis = mkdtempSync(path.join(tmpdir(), "proxledger-uploads-"));
  process.env.UPLOAD_DIR = verzeichnis;
});

afterAll(() => {
  rmSync(verzeichnis, { recursive: true, force: true });
});

/** Kleinstmögliche gültige PDF-Datei. */
function pdf(inhalt = "Testrechnung"): File {
  return new File([`%PDF-1.4\n${inhalt}\n%%EOF\n`], "rechnung.pdf", { type: "application/pdf" });
}

describe.runIf(datenbankVerfuegbar)("PDF-Upload", () => {
  beforeEach(async () => {
    await datenbankLeeren();
  });

  afterAll(async () => {
    await testPrisma.$disconnect();
  });

  it("nimmt ein PDF an und legt Datei samt Datensatz an", async () => {
    const { anhangSpeichern } = await import("@/lib/uploads");
    const id = await anhangSpeichern(pdf());

    const anhang = await testPrisma.anhang.findUniqueOrThrow({ where: { id } });
    expect(anhang.mimeTyp).toBe("application/pdf");
    expect(anhang.dateiname).toBe("rechnung.pdf");
    expect(anhang.sha256).toHaveLength(64);
    expect(readdirSync(verzeichnis)).toContain(`${anhang.sha256}.pdf`);
  });

  it("speichert dieselbe Datei nicht zweimal", async () => {
    const { anhangSpeichern } = await import("@/lib/uploads");
    const erste = await anhangSpeichern(pdf());
    const zweite = await anhangSpeichern(pdf());

    expect(zweite).toBe(erste);
    expect(await testPrisma.anhang.count()).toBe(1);
  });

  it("lehnt Dateien ab, die kein PDF sind – auch bei passendem Dateinamen", async () => {
    const { anhangSpeichern, UploadFehler } = await import("@/lib/uploads");
    const getarnt = new File(["<?php system($_GET[0]); ?>"], "rechnung.pdf", { type: "application/pdf" });

    await expect(anhangSpeichern(getarnt)).rejects.toThrow(UploadFehler);
    expect(await testPrisma.anhang.count()).toBe(0);
  });

  it("lehnt leere und zu große Dateien ab", async () => {
    const { anhangSpeichern, MAX_GROESSE, UploadFehler } = await import("@/lib/uploads");

    await expect(anhangSpeichern(new File([], "leer.pdf"))).rejects.toThrow(UploadFehler);
    const zuGross = new File(["%PDF-1.4\n" + "x".repeat(MAX_GROESSE)], "gross.pdf");
    await expect(anhangSpeichern(zuGross)).rejects.toThrow(UploadFehler);
  });
});
