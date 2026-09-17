#!/usr/bin/env node
/**
 * Erzeugt alle Symboldateien aus den SVG-Vorlagen in `assets/`.
 *
 *   npm run icons
 *
 * Ergebnis:
 *   src/app/icon.svg        – Symbol im Browser-Tab (moderne Browser)
 *   src/app/favicon.ico     – Rückfall für ältere Browser (16, 32, 48 px)
 *   public/icon-192.png     – Startbildschirm und Fortschrittsanzeigen
 *   public/icon-512.png
 *   src/app/apple-icon.png  – iOS-Startbildschirm (180 px, mit Hintergrund)
 *
 * Die Größen 16 und 32 nutzen vereinfachte Vorlagen, weil die feinen Linien sonst verschwimmen.
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const WURZEL = process.cwd();
const ASSETS = path.join(WURZEL, "assets");

async function png(vorlage, groesse) {
  const svg = await readFile(path.join(ASSETS, vorlage));
  return sharp(svg, { density: 384 }).resize(groesse, groesse).png({ compressionLevel: 9 }).toBuffer();
}

/**
 * Baut eine ICO-Datei aus PNG-Bildern. Das Format ist schlicht: ein Kopf, je Bild ein
 * Verzeichniseintrag, danach die Bilddaten – PNG als Inhalt ist seit Vista erlaubt.
 */
function icoBauen(bilder) {
  const kopf = Buffer.alloc(6);
  kopf.writeUInt16LE(0, 0); // reserviert
  kopf.writeUInt16LE(1, 2); // Typ 1 = Symbol
  kopf.writeUInt16LE(bilder.length, 4);

  let versatz = 6 + bilder.length * 16;
  const eintraege = [];
  for (const bild of bilder) {
    const eintrag = Buffer.alloc(16);
    eintrag.writeUInt8(bild.groesse >= 256 ? 0 : bild.groesse, 0); // Breite (0 = 256)
    eintrag.writeUInt8(bild.groesse >= 256 ? 0 : bild.groesse, 1); // Höhe
    eintrag.writeUInt8(0, 2); // Farben in der Palette
    eintrag.writeUInt8(0, 3); // reserviert
    eintrag.writeUInt16LE(1, 4); // Farbebenen
    eintrag.writeUInt16LE(32, 6); // Bits je Bildpunkt
    eintrag.writeUInt32LE(bild.daten.length, 8);
    eintrag.writeUInt32LE(versatz, 12);
    eintraege.push(eintrag);
    versatz += bild.daten.length;
  }

  return Buffer.concat([kopf, ...eintraege, ...bilder.map((b) => b.daten)]);
}

async function main() {
  await mkdir(path.join(WURZEL, "public"), { recursive: true });

  // Tab-Symbol: das SVG selbst, damit es in jeder Größe scharf bleibt.
  const svg = await readFile(path.join(ASSETS, "logo-32.svg"));
  await writeFile(path.join(WURZEL, "src", "app", "icon.svg"), svg);
  console.log("  src/app/icon.svg");

  const ico = icoBauen([
    { groesse: 16, daten: await png("logo-16.svg", 16) },
    { groesse: 32, daten: await png("logo-32.svg", 32) },
    { groesse: 48, daten: await png("logo-32.svg", 48) },
  ]);
  await writeFile(path.join(WURZEL, "src", "app", "favicon.ico"), ico);
  console.log(`  src/app/favicon.ico (${(ico.length / 1024).toFixed(1)} KB)`);

  for (const groesse of [192, 512]) {
    const daten = await png("logo-kachel.svg", groesse);
    await writeFile(path.join(WURZEL, "public", `icon-${groesse}.png`), daten);
    console.log(`  public/icon-${groesse}.png`);
  }

  const apple = await png("logo-kachel.svg", 180);
  await writeFile(path.join(WURZEL, "src", "app", "apple-icon.png"), apple);
  console.log("  src/app/apple-icon.png");
}

console.log("Erzeuge Symbole aus assets/:");
main()
  .then(() => console.log("Fertig."))
  .catch((fehler) => {
    console.error(fehler.message ?? fehler);
    process.exit(1);
  });
