import { hash } from "@node-rs/argon2";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import type { Prisma } from "../src/generated/prisma/client";
import type { Produkt, SubscriptionStatus } from "../src/generated/prisma/enums";
import { alerts, hosts, kunden, laufzeiten, reports } from "../src/mock/data";
import type { Laufzeit as MockLaufzeit } from "../src/mock/types";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL ist nicht gesetzt.");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

/** Standardwerte der Warnregeln; Schwellwerte sind später in der Oberfläche änderbar (#011). */
const WARNREGELN: { regel: string; schwellwerte: Prisma.InputJsonValue }[] = [
  { regel: "subscription-laeuft-ab", schwellwerte: { tage: [30, 14, 7] } },
  { regel: "status-nicht-aktiv", schwellwerte: {} },
  { regel: "sockets-abweichung", schwellwerte: {} },
  { regel: "keine-meldung", schwellwerte: { stunden: 48 } },
  { regel: "serverid-geaendert", schwellwerte: {} },
  { regel: "key-mehrfach-gemeldet", schwellwerte: {} },
  { regel: "host-ohne-kunde", schwellwerte: {} },
  { regel: "proxmox-rechnung-faellig", schwellwerte: { tage: 7 } },
  { regel: "kundenrechnung-fehlt", schwellwerte: {} },
  { regel: "kundenrechnung-unbezahlt", schwellwerte: { tage: 30 } },
];

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL ?? "admin@example.de";
  const name = process.env.ADMIN_NAME ?? "Administrator";
  const passwort = process.env.ADMIN_PASSWORD;

  if (!passwort) {
    console.warn("ADMIN_PASSWORD ist nicht gesetzt – der Administrator wird ohne Passwort angelegt.");
  }

  const passwortHash = passwort ? await hash(passwort) : null;

  await prisma.benutzer.upsert({
    where: { email },
    // Ein vorhandenes Passwort wird nicht überschrieben, damit der Seed gefahrlos wiederholbar ist.
    update: { name },
    create: { email, name, passwortHash },
  });

  console.log(`Administrator: ${email}`);
}

async function seedWarnregeln() {
  for (const regel of WARNREGELN) {
    await prisma.warnregelEinstellung.upsert({
      where: { regel: regel.regel },
      update: {},
      create: { regel: regel.regel, aktiv: true, schwellwerte: regel.schwellwerte },
    });
  }
  console.log(`${WARNREGELN.length} Warnregeln vorbereitet`);
}

const PRODUKT: Record<string, Produkt> = { pve: "PVE", pbs: "PBS", pmg: "PMG" };
const STATUS: Record<string, SubscriptionStatus> = {
  active: "ACTIVE",
  notfound: "NOTFOUND",
  invalid: "INVALID",
  expired: "EXPIRED",
  suspended: "SUSPENDED",
};

function datum(wert: string | null | undefined): Date | null {
  return wert ? new Date(wert) : null;
}

async function seedDemo() {
  for (const kunde of kunden) {
    await prisma.kunde.upsert({
      where: { id: kunde.id },
      update: {},
      create: {
        id: kunde.id,
        name: kunde.name,
        kundennummer: kunde.kundennummer,
        ansprechpartner: kunde.ansprechpartner,
        email: kunde.email,
        telefon: kunde.telefon,
        notizen: kunde.notizen,
        standorte: {
          create: kunde.standorte.map((standort) => ({
            id: standort.id,
            name: standort.name,
            ort: standort.ort,
          })),
        },
      },
    });
  }

  for (const host of hosts) {
    await prisma.host.upsert({
      where: { id: host.id },
      update: {},
      create: {
        id: host.id,
        agentId: `demo-${host.id}`,
        hostname: host.hostname,
        fqdn: host.fqdn,
        kundeId: host.kundeId,
        standortId: host.standortId,
        produkt: PRODUKT[host.produkt],
        produktVersion: host.produktVersion,
        kernel: host.kernel,
        serverId: host.serverId,
        clusterName: host.clusterName,
        nodeName: host.nodeName,
        ips: host.ips,
        sockets: host.sockets,
        cpuModell: host.cpuModell,
        uptimeSekunden: host.uptimeSekunden === null ? null : BigInt(host.uptimeSekunden),
        paketUpdates: host.paketUpdates,
        agentVersion: host.agentVersion,
        notizen: host.notizen,
        subKey: host.subscription.key,
        subStatus: STATUS[host.subscription.status],
        subLevel: host.subscription.level,
        subProduktname: host.subscription.produktname,
        subLizenzierteSockets: host.subscription.lizenzierteSockets,
        subRegdate: datum(host.subscription.regdate),
        subNextduedate: datum(host.subscription.nextduedate),
        subChecktime: datum(host.subscription.checktime),
        letzterReportAm: datum(host.letzterReport),
        tags: {
          connectOrCreate: host.tags.map((tag) => ({ where: { name: tag }, create: { name: tag } })),
        },
        keyHistorie: host.subscription.key
          ? { create: [{ key: host.subscription.key }] }
          : undefined,
        serverIdHistorie: { create: [{ serverId: host.serverId }] },
      },
    });
  }

  // Rechnungen entstehen aus den Laufzeiten: gleiche Rechnungsnummer = eine Rechnung mit mehreren Positionen.
  const proxmoxRechnungen = new Map<string, MockLaufzeit[]>();
  const kundenrechnungen = new Map<string, MockLaufzeit[]>();

  for (const laufzeit of laufzeiten) {
    if (laufzeit.einkauf?.nummer) {
      const bisher = proxmoxRechnungen.get(laufzeit.einkauf.nummer) ?? [];
      proxmoxRechnungen.set(laufzeit.einkauf.nummer, [...bisher, laufzeit]);
    }
    if (laufzeit.verkauf) {
      const schluessel = laufzeit.verkauf.nummer ?? `ohne-nummer-${laufzeit.id}`;
      const bisher = kundenrechnungen.get(schluessel) ?? [];
      kundenrechnungen.set(schluessel, [...bisher, laufzeit]);
    }
  }

  const proxmoxPositionen = new Map<string, string>();
  for (const [nummer, zugehoerig] of proxmoxRechnungen) {
    const vorlage = zugehoerig[0].einkauf!;
    const rechnung = await prisma.proxmoxRechnung.upsert({
      where: { nummer },
      update: {},
      create: {
        nummer,
        datum: new Date(vorlage.datum!),
        faelligAm: datum(vorlage.faelligAm),
        nettoBetrag: zugehoerig.reduce((summe, l) => summe + (l.einkauf?.nettoBetrag ?? 0), 0),
        ustSatz: vorlage.ustSatz,
        rabatt: vorlage.rabatt ?? null,
        zahlungsart: vorlage.zahlungsart ?? null,
        bezahlt: vorlage.bezahlt,
        bezahltAm: datum(vorlage.bezahltAm),
        positionen: {
          create: zugehoerig.map((l) => ({
            id: `prp-${l.id}`,
            bezeichnung: `${l.key} · ${l.start} bis ${l.ende}`,
            nettoBetrag: l.einkauf?.nettoBetrag ?? 0,
          })),
        },
      },
    });
    for (const l of zugehoerig) proxmoxPositionen.set(l.id, `prp-${l.id}`);
    console.log(`Proxmox-Rechnung ${rechnung.nummer} mit ${zugehoerig.length} Position(en)`);
  }

  const kundenPositionen = new Map<string, string>();
  for (const [schluessel, zugehoerig] of kundenrechnungen) {
    const vorlage = zugehoerig[0].verkauf!;
    const host = hosts.find((h) => h.id === zugehoerig[0].hostId);
    if (!host?.kundeId) continue;

    const id = `kr-${schluessel}`;
    await prisma.kundenrechnung.upsert({
      where: { id },
      update: {},
      create: {
        id,
        kundeId: host.kundeId,
        erstellt: vorlage.erstellt,
        nummer: vorlage.nummer,
        datum: datum(vorlage.datum),
        nettoBetrag: vorlage.erstellt
          ? zugehoerig.reduce((summe, l) => summe + (l.verkauf?.nettoBetrag ?? 0), 0)
          : null,
        ustSatz: vorlage.ustSatz,
        bezahlt: vorlage.bezahlt,
        bezahltAm: datum(vorlage.bezahltAm),
        positionen: {
          create: zugehoerig.map((l) => ({
            id: `krp-${l.id}`,
            bezeichnung: `${l.key} · ${l.start} bis ${l.ende}`,
            nettoBetrag: l.verkauf?.nettoBetrag ?? 0,
          })),
        },
      },
    });
    for (const l of zugehoerig) kundenPositionen.set(l.id, `krp-${l.id}`);
  }

  for (const laufzeit of laufzeiten) {
    await prisma.laufzeit.upsert({
      where: { id: laufzeit.id },
      update: {},
      create: {
        id: laufzeit.id,
        hostId: laufzeit.hostId,
        key: laufzeit.key,
        start: new Date(laufzeit.start),
        ende: new Date(laufzeit.ende),
        status: laufzeit.vorschlag ? "VORSCHLAG" : "BESTAETIGT",
        proxmoxPositionId: proxmoxPositionen.get(laufzeit.id) ?? null,
        kundenPositionId: kundenPositionen.get(laufzeit.id) ?? null,
      },
    });
  }

  for (const report of reports) {
    await prisma.report.upsert({
      where: { reportId: report.id },
      update: {},
      create: {
        reportId: report.id,
        hostId: report.hostId,
        erhobenAm: new Date(report.zeitpunkt),
        subStatus: STATUS[report.status],
        subKey: report.key,
        subNextduedate: datum(report.nextduedate),
        agentVersion: report.agentVersion,
        paketUpdates: report.paketUpdates,
        rohdaten: { hinweis: "Demo-Report ohne Rohdaten" },
      },
    });
  }

  for (const alert of alerts) {
    await prisma.alert.upsert({
      where: { fingerprint: `${alert.typ}:${alert.hostId ?? alert.kundeId ?? alert.id}` },
      update: {},
      create: {
        id: alert.id,
        fingerprint: `${alert.typ}:${alert.hostId ?? alert.kundeId ?? alert.id}`,
        regel: alert.typ,
        schwere: alert.schwere === "gefahr" ? "GEFAHR" : alert.schwere === "warnung" ? "WARNUNG" : "INFO",
        titel: alert.titel,
        beschreibung: alert.beschreibung,
        hostId: alert.hostId,
        kundeId: alert.kundeId,
        laufzeitId: alert.laufzeitId,
        geoeffnetAm: new Date(alert.seit),
      },
    });
  }

  console.log(
    `Demo-Daten: ${kunden.length} Kunden, ${hosts.length} Hosts, ${laufzeiten.length} Laufzeiten, ${alerts.length} Warnungen`,
  );
}

async function main() {
  await seedAdmin();
  await seedWarnregeln();

  if (process.env.SEED_DEMO === "1") {
    await seedDemo();
  } else {
    console.log("Demo-Daten übersprungen (SEED_DEMO=1 setzen, um sie anzulegen).");
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (fehler) => {
    console.error(fehler);
    await prisma.$disconnect();
    process.exit(1);
  });
