import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "./db";

/** Rechnungs-PDFs liegen auf der Platte, nur die Metadaten in der Datenbank. */
export const UPLOAD_VERZEICHNIS = process.env.UPLOAD_DIR ?? path.join(process.cwd(), "data", "uploads");
export const MAX_GROESSE = 10 * 1024 * 1024;

export class UploadFehler extends Error {}

/**
 * Nimmt ein PDF entgegen und legt es unter seiner Prüfsumme ab.
 * Gleiche Datei zweimal hochgeladen heißt: derselbe Anhang, kein zweites Exemplar auf der Platte.
 */
export async function anhangSpeichern(datei: File): Promise<string> {
  if (datei.size === 0) throw new UploadFehler("Die Datei ist leer.");
  if (datei.size > MAX_GROESSE) {
    throw new UploadFehler(`Die Datei ist größer als ${MAX_GROESSE / 1024 / 1024} MB.`);
  }

  const inhalt = Buffer.from(await datei.arrayBuffer());

  // Nicht auf den gemeldeten Typ verlassen, sondern in die Datei sehen.
  if (inhalt.subarray(0, 5).toString("latin1") !== "%PDF-") {
    throw new UploadFehler("Nur PDF-Dateien sind erlaubt.");
  }

  const sha256 = createHash("sha256").update(inhalt).digest("hex");
  const vorhanden = await prisma.anhang.findFirst({ where: { sha256 } });
  if (vorhanden) return vorhanden.id;

  await mkdir(UPLOAD_VERZEICHNIS, { recursive: true });
  const dateiname = `${sha256}.pdf`;
  await writeFile(path.join(UPLOAD_VERZEICHNIS, dateiname), inhalt, { mode: 0o640 });

  const anhang = await prisma.anhang.create({
    data: {
      dateiname: datei.name || dateiname,
      pfad: dateiname,
      mimeTyp: "application/pdf",
      groesse: inhalt.length,
      sha256,
    },
  });

  return anhang.id;
}

export function anhangPfad(pfad: string): string {
  // Nur der Dateiname aus der Datenbank wird verwendet; Pfadangaben darin werden verworfen.
  return path.join(UPLOAD_VERZEICHNIS, path.basename(pfad));
}
