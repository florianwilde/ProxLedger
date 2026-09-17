import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { alertsAbgleichen, warnregelnSicherstellen } from "@/server/alerts/abgleich";
import { hostsNachAblauf, offeneAufgaben } from "@/server/queries/dashboard";
import { hostListe } from "@/server/queries/hostliste";
import { kennzahlen, suchIndex } from "@/server/queries/hosts";
import { kundenListe, offeneRechnungspunkteProKunde } from "@/server/queries/kunden";
import { rechnungsListe } from "@/server/queries/rechnungen";

/**
 * Lasttest: legt eine große Datenmenge an und misst die Abfragen der wichtigsten Seiten.
 * Läuft gegen die Testdatenbank (`TEST_DATABASE_URL`), damit die Entwicklungsdaten unberührt bleiben.
 *
 *   npm run lasttest
 */

const HOSTS = Number(process.env.LAST_HOSTS ?? 200);
const KUNDEN = Number(process.env.LAST_KUNDEN ?? 25);
const JAHRE = Number(process.env.LAST_JAHRE ?? 5);
const REPORTS_PRO_HOST = JAHRE * 365;

const url = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
if (!url) throw new Error("TEST_DATABASE_URL oder DATABASE_URL setzen.");
process.env.DATABASE_URL = url;

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

async function messen<T>(name: string, arbeit: () => Promise<T>): Promise<T> {
  const start = performance.now();
  const ergebnis = await arbeit();
  const dauer = performance.now() - start;
  const anzahl = Array.isArray(ergebnis) ? ` (${ergebnis.length} Einträge)` : "";
  console.log(`  ${name.padEnd(38)} ${dauer.toFixed(0).padStart(6)} ms${anzahl}`);
  return ergebnis;
}

async function datenAnlegen() {
  console.log(`Lege Testdaten an: ${KUNDEN} Kunden, ${HOSTS} Hosts, je ${REPORTS_PRO_HOST} Reports …`);
  const start = performance.now();

  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE "Alert","Benachrichtigung","Report","Laufzeit","ProxmoxRechnungPosition",
    "ProxmoxRechnung","KundenrechnungPosition","Kundenrechnung","ServerIdHistorie",
    "SubscriptionKeyHistorie","AgentToken","Host","Standort","Kunde" RESTART IDENTITY CASCADE
  `);

  for (let k = 0; k < KUNDEN; k++) {
    await prisma.kunde.create({
      data: { id: `k${k}`, name: `Kunde ${k} GmbH`, kundennummer: `K-${9000 + k}` },
    });
  }

  const heute = new Date();
  for (let h = 0; h < HOSTS; h++) {
    const ablauf = new Date(heute.getTime() + ((h % 400) - 30) * 86_400_000);
    await prisma.host.create({
      data: {
        id: `h${h}`,
        agentId: `last-${h}`,
        hostname: `pve-last-${String(h).padStart(3, "0")}`,
        produkt: h % 7 === 0 ? "PBS" : "PVE",
        kundeId: h % 20 === 0 ? null : `k${h % KUNDEN}`,
        subKey: `pve1c-${String(h).padStart(10, "0")}`,
        subStatus: h % 11 === 0 ? "EXPIRED" : "ACTIVE",
        subNextduedate: ablauf,
        subLizenzierteSockets: 1,
        sockets: h % 13 === 0 ? 2 : 1,
        ips: [`10.0.${Math.floor(h / 254)}.${h % 254}`],
        letzterReportAm: new Date(heute.getTime() - (h % 5) * 86_400_000),
      },
    });

    // Reports in Blöcken, sonst dauert es unnötig lange.
    const reports = Array.from({ length: REPORTS_PRO_HOST }, (_, i) => ({
      reportId: `last-${h}-${i}`,
      hostId: `h${h}`,
      erhobenAm: new Date(heute.getTime() - i * 86_400_000),
      subStatus: "ACTIVE" as const,
      subKey: `pve1c-${String(h).padStart(10, "0")}`,
      rohdaten: {},
    }));
    for (let i = 0; i < reports.length; i += 2000) {
      await prisma.report.createMany({ data: reports.slice(i, i + 2000) });
    }

    // Fünf Laufzeiten je Host, jede zweite mit Rechnungen.
    for (let j = 0; j < JAHRE; j++) {
      const beginn = new Date(Date.UTC(heute.getUTCFullYear() - j, h % 12, ((h + j) % 27) + 1));
      const laufzeit = await prisma.laufzeit.create({
        data: {
          hostId: `h${h}`,
          key: `pve1c-${String(h).padStart(10, "0")}`,
          start: beginn,
          ende: new Date(Date.UTC(beginn.getUTCFullYear() + 1, beginn.getUTCMonth(), beginn.getUTCDate() - 1)),
          status: "BESTAETIGT",
        },
      });

      if ((h + j) % 2 === 0) {
        const rechnung = await prisma.proxmoxRechnung.create({
          data: {
            nummer: `PX-LAST-${h}-${j}`,
            datum: beginn,
            faelligAm: new Date(beginn.getTime() + 14 * 86_400_000),
            nettoBetrag: 115,
            bezahlt: j > 0,
            positionen: { create: [{ bezeichnung: "Laufzeit", nettoBetrag: 115 }] },
          },
          include: { positionen: true },
        });
        await prisma.laufzeit.update({
          where: { id: laufzeit.id },
          data: { proxmoxPositionId: rechnung.positionen[0].id },
        });
      }
    }
  }

  console.log(`Daten angelegt in ${((performance.now() - start) / 1000).toFixed(1)} s\n`);
}

async function main() {
  await datenAnlegen();
  await warnregelnSicherstellen();

  const [hosts, reports, laufzeiten] = await Promise.all([
    prisma.host.count(),
    prisma.report.count(),
    prisma.laufzeit.count(),
  ]);
  console.log(`Bestand: ${hosts} Hosts, ${reports} Reports, ${laufzeiten} Laufzeiten\n`);

  console.log("Dashboard:");
  await messen("Kennzahlen", () => kennzahlen());
  await messen("Hosts nach Ablauf", () => hostsNachAblauf());
  await messen("Offene Aufgaben", () => offeneAufgaben());
  await messen("Kundenliste", () => kundenListe());
  await messen("Rechnungspunkte je Kunde", () => offeneRechnungspunkteProKunde());

  console.log("\nHost-Tabelle:");
  await messen("Erste Seite", () => hostListe({}));
  await messen("Suche nach Key", () => hostListe({ q: "pve1c-0000000100" }));
  await messen("Filter: bald ablaufend", () => hostListe({ ablauf: "30" }));
  await messen("Filter: offene Rechnungen", () => hostListe({ rechnung: "offen" }));
  await messen("Sortierung nach Ablauf", () => hostListe({ sortierung: "ablauf" }));

  console.log("\nWeitere Seiten:");
  await messen("Rechnungsliste (offen)", () => rechnungsListe({ status: "offen" }));
  await messen("Suchindex (Strg+K)", () => suchIndex());
  await messen("Warnregeln auswerten", () => alertsAbgleichen());

  const offeneAlerts = await prisma.alert.count({ where: { erledigtAm: null } });
  console.log(`\nOffene Warnungen nach der Auswertung: ${offeneAlerts}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (fehler) => {
    console.error(fehler);
    await prisma.$disconnect();
    process.exit(1);
  });
