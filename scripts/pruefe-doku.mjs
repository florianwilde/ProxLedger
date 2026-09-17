#!/usr/bin/env node
/**
 * Prüft, ob Dokumentation und Version zusammenpassen.
 *
 *   npm run pruefe:doku
 *
 * Geprüft wird:
 *   1. Die Version aus package.json hat einen Abschnitt im Changelog.
 *   2. Jede Issue-Datei steht in der Übersicht – und umgekehrt.
 *   3. Status und tatsächliche Zeit stimmen zwischen Issue-Datei und Übersicht überein.
 *   4. Alle im Handbuch verlinkten Bilder sind vorhanden.
 */

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const WURZEL = process.cwd();
const fehler = [];

function pruefe(bedingung, meldung) {
  if (!bedingung) fehler.push(meldung);
}

async function versionImChangelog() {
  const { version } = JSON.parse(await readFile(path.join(WURZEL, "package.json"), "utf8"));
  const changelog = await readFile(path.join(WURZEL, "CHANGELOG.md"), "utf8");

  pruefe(
    changelog.includes(`## [${version}]`),
    `Version ${version} aus package.json fehlt im CHANGELOG.md.`,
  );
}

async function issuesUndUebersicht() {
  const verzeichnis = path.join(WURZEL, "docs", "issues");
  const dateien = (await readdir(verzeichnis)).filter((name) => /^\d{3}-.*\.md$/.test(name)).sort();
  const uebersicht = await readFile(path.join(verzeichnis, "README.md"), "utf8");

  for (const datei of dateien) {
    pruefe(uebersicht.includes(`(${datei})`), `Issue ${datei} fehlt in docs/issues/README.md.`);

    const inhalt = await readFile(path.join(verzeichnis, datei), "utf8");
    const status = /^\*\*Status:\*\*\s*(.+)$/m.exec(inhalt)?.[1]?.trim();
    const zeit = /^\*\*Geschätzt:\*\*.*\*\*Tatsächlich:\*\*\s*(.+)$/m.exec(inhalt)?.[1]?.trim();

    const zeile = uebersicht.split("\n").find((z) => z.includes(`(${datei})`));
    if (!zeile) continue;

    pruefe(
      zeile.includes(`| ${status} |`),
      `Status von ${datei} ist „${status}“, die Übersicht sagt etwas anderes: ${zeile.trim()}`,
    );
    if (zeit && zeit !== "–") {
      pruefe(
        zeile.includes(zeit),
        `Zeit von ${datei} ist „${zeit}“, steht so aber nicht in der Übersicht.`,
      );
    }
  }

  // Umgekehrt: Zeilen in der Übersicht ohne zugehörige Datei.
  for (const treffer of uebersicht.matchAll(/\((\d{3}-[^)]+\.md)\)/g)) {
    pruefe(dateien.includes(treffer[1]), `Übersicht verweist auf ${treffer[1]}, die Datei fehlt.`);
  }
}

async function bilderImHandbuch() {
  const handbuch = path.join(WURZEL, "docs", "anleitung");
  const text = await readFile(path.join(handbuch, "README.md"), "utf8");
  const bilder = [...text.matchAll(/!\[[^\]]*\]\((bilder\/[^)]+)\)/g)].map((t) => t[1]);
  const vorhanden = new Set(await readdir(path.join(handbuch, "bilder")));

  for (const bild of bilder) {
    pruefe(vorhanden.has(path.basename(bild)), `Handbuch verweist auf ${bild}, die Datei fehlt.`);
  }
}

await versionImChangelog();
await issuesUndUebersicht();
await bilderImHandbuch();

if (fehler.length > 0) {
  console.error("Die Dokumentation passt nicht zusammen:\n");
  for (const meldung of fehler) console.error(`  · ${meldung}`);
  process.exit(1);
}

console.log("Dokumentation, Versionen und Bilder passen zusammen.");
