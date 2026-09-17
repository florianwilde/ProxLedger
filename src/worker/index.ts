import { Cron } from "croner";
import "dotenv/config";
import { prisma } from "@/lib/db";
import { alertsAbgleichen, warnregelnSicherstellen } from "@/server/alerts/abgleich";
import { neueAlertsMelden, zusammenfassungSenden } from "@/server/notifications/versand";

/**
 * Hintergrundprozess: wertet die Warnregeln regelmäßig aus, verschickt Benachrichtigungen für
 * neue Warnungen und schickt die Zusammenfassung. Läuft als eigener Dienst neben der Web-Anwendung (#014).
 *
 *   npm run worker
 */

const ZEITZONE = "Europe/Berlin";
const ZEITPLAN = process.env.WORKER_CRON ?? "0 * * * *"; // stündlich zur vollen Stunde
const ZUSAMMENFASSUNG_ZEITPLAN = process.env.ZUSAMMENFASSUNG_CRON ?? "0 7 * * *"; // täglich 07:00 Uhr

function protokoll(nachricht: string) {
  console.log(`[${new Date().toISOString()}] ${nachricht}`);
}

async function durchlauf() {
  try {
    const ergebnis = await alertsAbgleichen();
    protokoll(
      `Warnregeln geprüft: ${ergebnis.geoeffnet.length} neu, ${ergebnis.erledigt.length} erledigt, ${ergebnis.unveraendert} unverändert.`,
    );

    if (ergebnis.geoeffnet.length > 0) {
      const versand = await neueAlertsMelden(ergebnis.geoeffnet.map((alert) => alert.fingerprint));
      protokoll(
        `Benachrichtigungen: ${versand.gesendet} gesendet, ${versand.uebersprungen} übersprungen, ${versand.fehlgeschlagen} fehlgeschlagen.`,
      );
    }
  } catch (fehler) {
    console.error("Auswertung fehlgeschlagen:", fehler);
  }
}

/** Zeitraum der Zusammenfassung aus den Einstellungen (täglich, wöchentlich oder aus). */
async function zusammenfassungEinstellung(): Promise<"taeglich" | "woechentlich" | "aus"> {
  const eintrag = await prisma.einstellung.findUnique({ where: { schluessel: "zusammenfassung" } });
  const wert = (eintrag?.wert as { zeitraum?: string } | null)?.zeitraum;
  return wert === "taeglich" || wert === "woechentlich" ? wert : "aus";
}

async function zusammenfassung() {
  try {
    const zeitraum = await zusammenfassungEinstellung();
    if (zeitraum === "aus") return;
    // Wöchentlich nur montags verschicken.
    if (zeitraum === "woechentlich" && new Date().getDay() !== 1) return;

    const ergebnis = await zusammenfassungSenden(zeitraum);
    protokoll(
      `Zusammenfassung (${zeitraum}): ${ergebnis.gesendet} gesendet, ${ergebnis.fehlgeschlagen} fehlgeschlagen.`,
    );
  } catch (fehler) {
    console.error("Zusammenfassung fehlgeschlagen:", fehler);
  }
}

async function start() {
  await warnregelnSicherstellen();
  protokoll(
    `Worker gestartet. Auswertung "${ZEITPLAN}", Zusammenfassung "${ZUSAMMENFASSUNG_ZEITPLAN}" (${ZEITZONE}).`,
  );

  // Einmal sofort, damit nach einem Neustart nicht bis zur nächsten vollen Stunde gewartet wird.
  await durchlauf();

  const aufgaben = [
    new Cron(ZEITPLAN, { timezone: ZEITZONE }, durchlauf),
    new Cron(ZUSAMMENFASSUNG_ZEITPLAN, { timezone: ZEITZONE }, zusammenfassung),
  ];

  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, () => {
      protokoll("Worker wird beendet.");
      for (const aufgabe of aufgaben) aufgabe.stop();
      process.exit(0);
    });
  }
}

void start();
