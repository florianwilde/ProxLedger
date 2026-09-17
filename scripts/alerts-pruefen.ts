import "dotenv/config";
import { alertsAbgleichen, warnregelnSicherstellen } from "@/server/alerts/abgleich";

/** Einmalige Auswertung der Warnregeln – praktisch zum Prüfen ohne laufenden Worker. */
async function main() {
  await warnregelnSicherstellen();
  const ergebnis = await alertsAbgleichen();

  console.log(
    `${ergebnis.geoeffnet.length} neu, ${ergebnis.erledigt.length} erledigt, ${ergebnis.unveraendert} unverändert`,
  );
  for (const alert of ergebnis.geoeffnet) {
    console.log(`  + ${alert.schwere.padEnd(8)} ${alert.titel} – ${alert.beschreibung}`);
  }
  for (const fingerprint of ergebnis.erledigt) {
    console.log(`  - erledigt: ${fingerprint}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((fehler) => {
    console.error(fehler);
    process.exit(1);
  });
