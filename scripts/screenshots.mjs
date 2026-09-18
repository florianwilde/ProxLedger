#!/usr/bin/env node
/**
 * Erzeugt die Bilder für das Handbuch (docs/anleitung/bilder/).
 *
 *   npm run screenshots                       # heller Modus, Desktop
 *   npm run screenshots -- --alle             # zusätzlich dunkler Modus und Mobilansicht
 *   npm run screenshots -- --seite name=/pfad # zusätzlich eine bestimmte Seite
 *
 * Voraussetzung: Das Dashboard läuft (npm start) und die Datenbank enthält Daten.
 * Die Anmeldung erledigt das Skript selbst, indem es ein Sitzungs-Cookie erzeugt
 * und in ein eigenes Firefox-Profil schreibt – so bleibt der Schutz der Anwendung unangetastet.
 */

import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { existsSync, mkdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { request as httpAnfrage } from "node:http";
import { SignJWT } from "jose";
import "dotenv/config";

const BASIS = process.env.SCREENSHOT_URL ?? "http://localhost:3000";
const ZIEL = path.join(process.cwd(), "docs", "anleitung", "bilder");
const ALLE = process.argv.includes("--alle");

/** Zusätzliche Seiten von der Befehlszeile: --seite name=/pfad */
const ZUSATZ = process.argv
  .filter((wert, i) => process.argv[i - 1] === "--seite")
  .map((eintrag) => {
    const [name, ...rest] = eintrag.split("=");
    return { name, pfad: rest.join("="), titel: "zusätzlich" };
  });

// Firefox aus dem Snap-Paket kommt nicht an versteckte Verzeichnisse – daher im Home sichtbar ablegen.
const PROFIL_BASIS = path.join(homedir(), "proxledger-screenshots");

const SEITEN = [
  { name: "dashboard", pfad: "/", titel: "Dashboard" },
  { name: "hosts", pfad: "/hosts", titel: "Host-Tabelle" },
  { name: "host-detail", pfad: "/hosts?q=pve-brandl-01", titel: "Host-Suche" },
  { name: "kunden", pfad: "/kunden", titel: "Kundenübersicht" },
  { name: "nicht-zugeordnet", pfad: "/hosts/nicht-zugeordnet", titel: "Nicht zugeordnete Hosts" },
  { name: "rechnungen", pfad: "/rechnungen", titel: "Rechnungen" },
  { name: "jahresbahn", pfad: "/jahresbahn", titel: "Jahresbahn" },
  { name: "warnungen", pfad: "/warnungen", titel: "Warnungen" },
  { name: "warnregeln", pfad: "/einstellungen/warnregeln", titel: "Warnregeln" },
  { name: "tokens", pfad: "/einstellungen/tokens", titel: "Agent-Tokens" },
  { name: "benachrichtigungen", pfad: "/einstellungen/benachrichtigungen", titel: "Benachrichtigungen" },
  { name: "audit", pfad: "/einstellungen/audit", titel: "Protokoll" },
];

async function sitzungsToken() {
  const geheimnis = process.env.APP_SECRET;
  if (!geheimnis || geheimnis.length < 32) {
    throw new Error("APP_SECRET fehlt oder ist zu kurz – ohne Sitzung keine Bilder.");
  }

  return new SignJWT({
    benutzerId: "screenshots",
    email: process.env.ADMIN_EMAIL ?? "admin@example.de",
    name: process.env.ADMIN_NAME ?? "Florian",
    herkunft: "passwort",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject("screenshots")
    .setIssuedAt()
    .setIssuer("proxledger")
    .setExpirationTime("1h")
    .sign(new TextEncoder().encode(geheimnis));
}

/**
 * Kleiner Vermittler vor dem Dashboard: Er reicht jede Anfrage weiter und hängt die Sitzung
 * als Kopfzeile an. Damit braucht der Browser kein Cookie – das Einschleusen in das Firefox-Profil
 * erwies sich als unzuverlässig (Firefox verwirft fremd erzeugte Cookie-Dateien stillschweigend,
 * die Aufnahmen zeigten dann kommentarlos die Anmeldeseite).
 */
function vermittlerStarten(token) {
  const ziel = new URL(BASIS);

  const server = createServer((anfrage, antwort) => {
    const weiterleitung = {
      hostname: ziel.hostname,
      port: ziel.port || 80,
      path: anfrage.url,
      method: anfrage.method,
      headers: { ...anfrage.headers, host: ziel.host, cookie: `pl_sitzung=${token}` },
    };

    const verbindung = httpAnfrage(weiterleitung, (antwortVomServer) => {
      antwort.writeHead(antwortVomServer.statusCode ?? 502, antwortVomServer.headers);
      antwortVomServer.pipe(antwort);
    });

    verbindung.on("error", () => antwort.writeHead(502).end("Dashboard nicht erreichbar"));
    anfrage.pipe(verbindung);
  });

  return new Promise((fertig) => {
    server.listen(0, "127.0.0.1", () => fertig({ server, port: server.address().port }));
  });
}

/** Legt ein Profil mit dem gewünschten Farbschema an. */
function profilVorbereiten(name, dunkel) {
  const verzeichnis = path.join(PROFIL_BASIS, name);
  rmSync(verzeichnis, { recursive: true, force: true });
  mkdirSync(verzeichnis, { recursive: true });

  writeFileSync(
    path.join(verzeichnis, "user.js"),
    [
      `user_pref("ui.systemUsesDarkTheme", ${dunkel ? 1 : 0});`,
      `user_pref("layout.css.prefers-color-scheme.content-override", ${dunkel ? 0 : 1});`,
      'user_pref("browser.shell.checkDefaultBrowser", false);',
      "",
    ].join("\n"),
  );

  return verzeichnis;
}

/**
 * Nimmt eine Seite auf. Bewusst asynchron: Der Vermittler läuft im selben Prozess, und ein
 * blockierender Aufruf würde ihn währenddessen stumm schalten – Firefox liefe in die Zeitüberschreitung.
 */
function aufnehmen(profil, pfad, datei, breite, hoehe, adresse) {
  return new Promise((fertig, fehlgeschlagen) => {
    const vorgang = spawn(
      "firefox",
      [
        "--profile",
        profil,
        "--headless",
        "--window-size",
        `${breite},${hoehe}`,
        "--screenshot",
        datei,
        `${adresse}${pfad}`,
      ],
      { stdio: "ignore", timeout: 120_000 },
    );

    vorgang.on("error", fehlgeschlagen);
    vorgang.on("close", () => fertig());
  });
}

async function main() {
  const antwort = await fetch(`${BASIS}/login`).catch(() => null);
  if (!antwort?.ok) throw new Error(`${BASIS} ist nicht erreichbar – läuft das Dashboard?`);

  mkdirSync(ZIEL, { recursive: true });
  const token = await sitzungsToken();
  const { server, port } = await vermittlerStarten(token);
  const adresse = `http://127.0.0.1:${port}`;

  const hell = profilVorbereiten("hell", false);
  console.log(`Bilder nach ${ZIEL}`);

  // Die Anmeldeseite zeigt sich auch mit gültiger Sitzung, sie ist öffentlich.
  await aufnehmen(hell, "/login", path.join(ZIEL, "login.png"), 1280, 900, BASIS);
  console.log("  login.png");

  for (const seite of [...SEITEN, ...ZUSATZ]) {
    await aufnehmen(hell, seite.pfad, path.join(ZIEL, `${seite.name}.png`), 1680, 1150, adresse);
    console.log(`  ${seite.name}.png – ${seite.titel}`);
  }

  if (ALLE) {
    const dunkel = profilVorbereiten("dunkel", true);
    for (const seite of ["dashboard", "hosts", "rechnungen", "warnungen"]) {
      const eintrag = SEITEN.find((s) => s.name === seite);
      await aufnehmen(dunkel, eintrag.pfad, path.join(ZIEL, `${seite}-dunkel.png`), 1680, 1150, adresse);
      console.log(`  ${seite}-dunkel.png`);
    }

    for (const seite of ["dashboard", "hosts"]) {
      const eintrag = SEITEN.find((s) => s.name === seite);
      await aufnehmen(hell, eintrag.pfad, path.join(ZIEL, `mobil-${seite}.png`), 390, 1500, adresse);
      console.log(`  mobil-${seite}.png`);
    }
  }

  server.close();
  if (existsSync(PROFIL_BASIS)) rmSync(PROFIL_BASIS, { recursive: true, force: true });

  // Sicherung gegen stillen Fehlschlag: Alle Aufnahmen gleich groß heißt, jede zeigt die Anmeldeseite.
  const groessen = SEITEN.map((seite) => statSync(path.join(ZIEL, `${seite.name}.png`)).size);
  if (new Set(groessen).size === 1) {
    throw new Error(
      "Alle Aufnahmen sind gleich groß – vermutlich zeigt jede die Anmeldeseite. Sitzung prüfen.",
    );
  }

  console.log("Fertig.");
}

main().catch((fehler) => {
  console.error(fehler.message ?? fehler);
  process.exit(1);
});
