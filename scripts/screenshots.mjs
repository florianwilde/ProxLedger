#!/usr/bin/env node
/**
 * Erzeugt die Bilder für das Handbuch (docs/anleitung/bilder/).
 *
 *   npm run screenshots            # heller Modus, Desktop
 *   npm run screenshots -- --alle  # zusätzlich dunkler Modus und Mobilansicht
 *
 * Voraussetzung: Das Dashboard läuft (npm start) und die Datenbank enthält Daten.
 * Die Anmeldung erledigt das Skript selbst, indem es ein Sitzungs-Cookie erzeugt
 * und in ein eigenes Firefox-Profil schreibt – so bleibt der Schutz der Anwendung unangetastet.
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { SignJWT } from "jose";
import "dotenv/config";

const BASIS = process.env.SCREENSHOT_URL ?? "http://localhost:3000";
const ZIEL = path.join(process.cwd(), "docs", "anleitung", "bilder");
const ALLE = process.argv.includes("--alle");

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

/** Legt ein frisches Profil mit Sitzungs-Cookie und gewünschtem Farbschema an. */
function profilVorbereiten(name, token, dunkel) {
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

  const { hostname, protocol } = new URL(BASIS);
  const datenbank = new DatabaseSync(path.join(verzeichnis, "cookies.sqlite"));
  datenbank.exec(`
    CREATE TABLE moz_cookies (
      id INTEGER PRIMARY KEY, originAttributes TEXT NOT NULL DEFAULT '', name TEXT, value TEXT,
      host TEXT, path TEXT, expiry INTEGER, lastAccessed INTEGER, creationTime INTEGER,
      isSecure INTEGER, isHttpOnly INTEGER, inBrowserElement INTEGER DEFAULT 0,
      sameSite INTEGER DEFAULT 0, schemeMap INTEGER DEFAULT 0,
      isPartitionedAttributeSet INTEGER DEFAULT 0, updateTime INTEGER DEFAULT 0,
      CONSTRAINT moz_uniqueid UNIQUE (name, host, path, originAttributes)
    )`);

  const jetzt = Date.now();
  datenbank
    .prepare(
      `INSERT INTO moz_cookies
       (originAttributes,name,value,host,path,expiry,lastAccessed,creationTime,isSecure,isHttpOnly,inBrowserElement,sameSite,schemeMap,isPartitionedAttributeSet,updateTime)
       VALUES ('', 'pl_sitzung', ?, ?, '/', ?, ?, ?, ?, 1, 0, 1, ?, 0, ?)`,
    )
    .run(
      token,
      hostname,
      Math.floor(jetzt / 1000) + 3600,
      jetzt * 1000,
      jetzt * 1000,
      protocol === "https:" ? 1 : 0,
      protocol === "https:" ? 2 : 1,
      jetzt * 1000,
    );
  datenbank.close();

  return verzeichnis;
}

function aufnehmen(profil, pfad, datei, breite, hoehe) {
  execFileSync(
    "firefox",
    [
      "--profile",
      profil,
      "--headless",
      "--window-size",
      `${breite},${hoehe}`,
      "--screenshot",
      datei,
      `${BASIS}${pfad}`,
    ],
    { stdio: "ignore", timeout: 120_000 },
  );
}

async function main() {
  const antwort = await fetch(`${BASIS}/login`).catch(() => null);
  if (!antwort?.ok) throw new Error(`${BASIS} ist nicht erreichbar – läuft das Dashboard?`);

  mkdirSync(ZIEL, { recursive: true });
  const token = await sitzungsToken();

  const hell = profilVorbereiten("hell", token, false);
  console.log(`Bilder nach ${ZIEL}`);

  // Die Anmeldeseite zeigt sich auch mit gültiger Sitzung, sie ist öffentlich.
  aufnehmen(hell, "/login", path.join(ZIEL, "login.png"), 1280, 900);
  console.log("  login.png");

  for (const seite of SEITEN) {
    aufnehmen(hell, seite.pfad, path.join(ZIEL, `${seite.name}.png`), 1680, 1150);
    console.log(`  ${seite.name}.png – ${seite.titel}`);
  }

  if (ALLE) {
    const dunkel = profilVorbereiten("dunkel", token, true);
    for (const seite of ["dashboard", "hosts", "rechnungen", "warnungen"]) {
      const eintrag = SEITEN.find((s) => s.name === seite);
      aufnehmen(dunkel, eintrag.pfad, path.join(ZIEL, `${seite}-dunkel.png`), 1680, 1150);
      console.log(`  ${seite}-dunkel.png`);
    }

    for (const seite of ["dashboard", "hosts"]) {
      const eintrag = SEITEN.find((s) => s.name === seite);
      aufnehmen(hell, eintrag.pfad, path.join(ZIEL, `mobil-${seite}.png`), 390, 1500);
      console.log(`  mobil-${seite}.png`);
    }
  }

  if (existsSync(PROFIL_BASIS)) rmSync(PROFIL_BASIS, { recursive: true, force: true });
  console.log("Fertig.");
}

main().catch((fehler) => {
  console.error(fehler.message ?? fehler);
  process.exit(1);
});
