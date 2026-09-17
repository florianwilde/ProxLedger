import { execFileSync } from "node:child_process";
import { Client } from "pg";
import "dotenv/config";

/**
 * Legt die Testdatenbank an (falls nötig) und spielt alle Migrationen ein.
 * Ohne `TEST_DATABASE_URL` werden die datenbankgestützten Tests übersprungen.
 */
export default async function setup() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    console.warn("TEST_DATABASE_URL ist nicht gesetzt – Datenbanktests werden übersprungen.");
    return;
  }

  const ziel = new URL(url);
  const datenbank = ziel.pathname.replace(/^\//, "");
  const verwaltung = new URL(url);
  verwaltung.pathname = "/postgres";

  const client = new Client({ connectionString: verwaltung.toString() });
  await client.connect();
  const vorhanden = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [datenbank]);
  if (vorhanden.rowCount === 0) {
    // Datenbanknamen lassen sich nicht parametrisieren; er stammt aus der eigenen Konfiguration.
    await client.query(`CREATE DATABASE "${datenbank.replace(/"/g, "")}"`);
  }
  await client.end();

  execFileSync("npx", ["prisma", "migrate", "deploy"], {
    env: { ...process.env, DATABASE_URL: url },
    stdio: "inherit",
  });
}
