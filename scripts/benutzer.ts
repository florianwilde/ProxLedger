import "dotenv/config";
import { createInterface } from "node:readline/promises";
import { hash } from "@node-rs/argon2";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * Benutzerverwaltung von der Kommandozeile – solange es dafür keine Oberfläche gibt.
 *
 *   npm run benutzer -- liste
 *   npm run benutzer -- sperren <email>      Konto sperren und alle Sitzungen sofort beenden
 *   npm run benutzer -- entsperren <email>
 *   npm run benutzer -- passwort <email>     neues Passwort setzen, beendet alle Sitzungen
 */

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function passwortAbfragen(): Promise<string> {
  const eingabe = createInterface({ input: process.stdin, output: process.stdout });
  const passwort = await eingabe.question("Neues Passwort (mindestens 12 Zeichen): ");
  eingabe.close();
  if (passwort.length < 12) throw new Error("Zu kurz – mindestens 12 Zeichen.");
  return passwort;
}

async function main() {
  const [befehl, email] = process.argv.slice(2);

  if (befehl === "liste") {
    const alle = await prisma.benutzer.findMany({ orderBy: { email: "asc" } });
    for (const b of alle) {
      console.log(`${b.aktiv ? "aktiv  " : "gesperrt"}  ${b.email.padEnd(32)} ${b.name}`);
    }
    return;
  }

  if (!email) throw new Error("Bitte eine E-Mail-Adresse angeben.");
  const benutzer = await prisma.benutzer.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!benutzer) throw new Error(`Kein Benutzer mit der Adresse ${email}.`);

  switch (befehl) {
    case "sperren":
      // Sperren allein genügt nicht: Das Sitzungs-Token gilt sonst bis zum Ablauf weiter.
      await prisma.benutzer.update({
        where: { id: benutzer.id },
        data: { aktiv: false, sitzungenUngueltigAb: new Date() },
      });
      console.log(`${benutzer.email} ist gesperrt, alle Sitzungen sind beendet.`);
      break;

    case "entsperren":
      await prisma.benutzer.update({ where: { id: benutzer.id }, data: { aktiv: true } });
      console.log(`${benutzer.email} ist wieder freigegeben.`);
      break;

    case "passwort": {
      const passwort = await passwortAbfragen();
      await prisma.benutzer.update({
        where: { id: benutzer.id },
        data: {
          passwortHash: await hash(passwort),
          sitzungenUngueltigAb: new Date(),
        },
      });
      console.log(`Passwort gesetzt; bestehende Sitzungen von ${benutzer.email} sind beendet.`);
      break;
    }

    default:
      throw new Error("Bekannte Befehle: liste, sperren, entsperren, passwort");
  }
}

main()
  .catch((fehler: unknown) => {
    console.error(fehler instanceof Error ? fehler.message : fehler);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
