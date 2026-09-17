import { prisma } from "@/lib/db";
import { alleRegelnPruefen, REGELN, type AlertKandidat, type RegelKontext } from "./regeln";

/**
 * Lädt den Zustand, wendet die Regeln an und gleicht das Ergebnis mit den offenen Warnungen ab:
 * neue öffnen, verschwundene schließen, bestehende unverändert lassen.
 */

export async function kontextLaden(jetzt: Date = new Date()): Promise<RegelKontext> {
  const [hosts, laufzeiten, einstellungen] = await Promise.all([
    prisma.host.findMany({
      include: {
        kunde: { select: { name: true } },
        serverIdHistorie: { select: { serverId: true, ersteMeldung: true, letzteMeldung: true } },
      },
    }),
    prisma.laufzeit.findMany({
      where: { status: "BESTAETIGT" },
      include: {
        host: { select: { hostname: true, kundeId: true, kunde: { select: { name: true } } } },
        proxmoxPosition: { include: { rechnung: true } },
        kundenPosition: { include: { rechnung: true } },
      },
    }),
    prisma.warnregelEinstellung.findMany(),
  ]);

  return {
    jetzt,
    hosts: hosts.map((host) => ({
      id: host.id,
      hostname: host.hostname,
      kundeId: host.kundeId,
      kundeName: host.kunde?.name ?? null,
      subKey: host.subKey,
      subStatus: host.subStatus,
      subNextduedate: host.subNextduedate,
      subLizenzierteSockets: host.subLizenzierteSockets,
      sockets: host.sockets,
      letzterReportAm: host.letzterReportAm,
      serverIds: host.serverIdHistorie,
    })),
    laufzeiten: laufzeiten.map((laufzeit) => ({
      id: laufzeit.id,
      hostId: laufzeit.hostId,
      hostname: laufzeit.host.hostname,
      kundeId: laufzeit.host.kundeId,
      kundeName: laufzeit.host.kunde?.name ?? null,
      key: laufzeit.key,
      start: laufzeit.start,
      ende: laufzeit.ende,
      einkaufNummer: laufzeit.proxmoxPosition?.rechnung.nummer ?? null,
      einkaufBetrag: laufzeit.proxmoxPosition ? Number(laufzeit.proxmoxPosition.nettoBetrag) : null,
      einkaufBezahlt: laufzeit.proxmoxPosition ? laufzeit.proxmoxPosition.rechnung.bezahlt : null,
      einkaufFaelligAm: laufzeit.proxmoxPosition?.rechnung.faelligAm ?? null,
      verkaufNummer: laufzeit.kundenPosition?.rechnung.nummer ?? null,
      verkaufBetrag: laufzeit.kundenPosition ? Number(laufzeit.kundenPosition.nettoBetrag) : null,
      verkaufErstellt: laufzeit.kundenPosition?.rechnung.erstellt ?? false,
      verkaufBezahlt: laufzeit.kundenPosition?.rechnung.bezahlt ?? false,
      verkaufDatum: laufzeit.kundenPosition?.rechnung.datum ?? null,
    })),
    einstellungen: new Map(
      einstellungen.map((eintrag) => [
        eintrag.regel,
        {
          aktiv: eintrag.aktiv,
          schwellwerte: (eintrag.schwellwerte ?? {}) as Record<string, unknown>,
        },
      ]),
    ),
  };
}

export interface AbgleichErgebnis {
  geoeffnet: AlertKandidat[];
  erledigt: string[];
  unveraendert: number;
}

/** Vergleicht die Kandidaten mit den offenen Warnungen und schreibt die Unterschiede fort. */
export async function alertsAbgleichen(jetzt: Date = new Date()): Promise<AbgleichErgebnis> {
  const kontext = await kontextLaden(jetzt);
  const kandidaten = alleRegelnPruefen(kontext);

  const offene = await prisma.alert.findMany({ where: { erledigtAm: null } });
  const offeneNachFingerprint = new Map(offene.map((alert) => [alert.fingerprint, alert]));
  const kandidatenNachFingerprint = new Map(kandidaten.map((k) => [k.fingerprint, k]));

  const neu = kandidaten.filter((k) => !offeneNachFingerprint.has(k.fingerprint));
  const verschwunden = offene.filter((alert) => !kandidatenNachFingerprint.has(alert.fingerprint));

  for (const kandidat of neu) {
    // Ein früher erledigter Fall taucht wieder auf: denselben Eintrag erneut öffnen.
    await prisma.alert.upsert({
      where: { fingerprint: kandidat.fingerprint },
      update: {
        titel: kandidat.titel,
        beschreibung: kandidat.beschreibung,
        schwere: kandidat.schwere,
        erledigtAm: null,
        quittiertAm: null,
        geoeffnetAm: jetzt,
      },
      create: {
        fingerprint: kandidat.fingerprint,
        regel: kandidat.regel,
        schwere: kandidat.schwere,
        titel: kandidat.titel,
        beschreibung: kandidat.beschreibung,
        hostId: kandidat.hostId,
        kundeId: kandidat.kundeId,
        laufzeitId: kandidat.laufzeitId,
        geoeffnetAm: jetzt,
      },
    });
  }

  // Beschreibungen bestehender Warnungen nachführen (z. B. „läuft in 9 Tagen ab“).
  for (const alert of offene) {
    const kandidat = kandidatenNachFingerprint.get(alert.fingerprint);
    if (!kandidat) continue;
    if (kandidat.titel !== alert.titel || kandidat.beschreibung !== alert.beschreibung) {
      await prisma.alert.update({
        where: { id: alert.id },
        data: { titel: kandidat.titel, beschreibung: kandidat.beschreibung, schwere: kandidat.schwere },
      });
    }
  }

  if (verschwunden.length > 0) {
    await prisma.alert.updateMany({
      where: { id: { in: verschwunden.map((alert) => alert.id) } },
      data: { erledigtAm: jetzt },
    });
  }

  return {
    geoeffnet: neu,
    erledigt: verschwunden.map((alert) => alert.fingerprint),
    unveraendert: kandidaten.length - neu.length,
  };
}

/** Legt fehlende Regel-Einstellungen mit ihren Standardwerten an (Seed und Aktualisierungen). */
export async function warnregelnSicherstellen() {
  for (const regel of REGELN) {
    await prisma.warnregelEinstellung.upsert({
      where: { regel: regel.name },
      update: {},
      create: { regel: regel.name, aktiv: true, schwellwerte: regel.standardSchwellwerte },
    });
  }
}
