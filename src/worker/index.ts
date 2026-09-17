import { Cron } from "croner";
import "dotenv/config";
import { alertsAbgleichen, warnregelnSicherstellen } from "@/server/alerts/abgleich";

/**
 * Hintergrundprozess: wertet die Warnregeln regelmäßig aus, unabhängig davon, ob jemand
 * das Dashboard geöffnet hat. Läuft als eigener Dienst neben der Web-Anwendung (siehe #014).
 *
 *   npm run worker
 */

const ZEITZONE = "Europe/Berlin";
const ZEITPLAN = process.env.WORKER_CRON ?? "0 * * * *"; // stündlich zur vollen Stunde

function protokoll(nachricht: string) {
  console.log(`[${new Date().toISOString()}] ${nachricht}`);
}

async function durchlauf() {
  try {
    const ergebnis = await alertsAbgleichen();
    protokoll(
      `Warnregeln geprüft: ${ergebnis.geoeffnet.length} neu, ${ergebnis.erledigt.length} erledigt, ${ergebnis.unveraendert} unverändert.`,
    );
    for (const alert of ergebnis.geoeffnet) {
      protokoll(`  neu: ${alert.titel} – ${alert.beschreibung}`);
    }
  } catch (fehler) {
    console.error("Auswertung fehlgeschlagen:", fehler);
  }
}

async function start() {
  await warnregelnSicherstellen();
  protokoll(`Worker gestartet, Zeitplan "${ZEITPLAN}" (${ZEITZONE}).`);

  // Einmal sofort, damit nach einem Neustart nicht bis zur nächsten vollen Stunde gewartet wird.
  await durchlauf();

  const aufgabe = new Cron(ZEITPLAN, { timezone: ZEITZONE }, durchlauf);

  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, () => {
      protokoll("Worker wird beendet.");
      aufgabe.stop();
      process.exit(0);
    });
  }
}

void start();
