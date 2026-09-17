import { prisma } from "@/lib/db";
import { kennzahlen } from "@/server/queries/hosts";
import { aktiveKanaele, ueberKanalSenden, type Nachricht } from "./kanaele";
import { alertNachricht, zusammenfassungNachricht, type AlertNachrichtDaten } from "./nachrichten";

/**
 * Versandlogik: Wer bekommt wann was?
 * Grundregel aus dem Auftrag: keine doppelten Benachrichtigungen für denselben offenen Alert.
 * Das stellt die Prüfung gegen das Versandprotokoll sicher – auch wenn eine Auswertung mehrfach läuft.
 */

function appUrl(): string {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

/** Wurde zu diesem Alert schon erfolgreich benachrichtigt? */
async function bereitsGemeldet(alertId: string): Promise<boolean> {
  const vorhanden = await prisma.benachrichtigung.findFirst({
    where: { alertId, status: "GESENDET" },
  });
  return vorhanden !== null;
}

export interface VersandErgebnis {
  gesendet: number;
  uebersprungen: number;
  fehlgeschlagen: number;
}

/** Verschickt Benachrichtigungen für neu geöffnete Warnungen. */
export async function neueAlertsMelden(fingerprints: string[]): Promise<VersandErgebnis> {
  if (fingerprints.length === 0) return { gesendet: 0, uebersprungen: 0, fehlgeschlagen: 0 };

  const kanaele = await aktiveKanaele();
  if (kanaele.length === 0) return { gesendet: 0, uebersprungen: fingerprints.length, fehlgeschlagen: 0 };

  const alerts = await prisma.alert.findMany({
    where: { fingerprint: { in: fingerprints }, erledigtAm: null },
  });

  let gesendet = 0;
  let uebersprungen = 0;
  let fehlgeschlagen = 0;

  for (const alert of alerts) {
    if (await bereitsGemeldet(alert.id)) {
      uebersprungen += 1;
      continue;
    }

    const nachricht = alertNachricht(
      {
        id: alert.id,
        regel: alert.regel,
        schwere: alert.schwere,
        titel: alert.titel,
        beschreibung: alert.beschreibung,
        hostId: alert.hostId,
      },
      appUrl(),
    );

    for (const kanal of kanaele) {
      try {
        await ueberKanalSenden(kanal, nachricht, alert.id);
        gesendet += 1;
      } catch (fehler) {
        fehlgeschlagen += 1;
        console.error(`Versand über ${kanal.name} fehlgeschlagen:`, fehler);
      }
    }
  }

  return { gesendet, uebersprungen, fehlgeschlagen };
}

/** Stellt die Zusammenfassung zusammen und verschickt sie. */
export async function zusammenfassungSenden(
  zeitraum: "taeglich" | "woechentlich",
  jetzt: Date = new Date(),
): Promise<VersandErgebnis> {
  const kanaele = await aktiveKanaele();
  if (kanaele.length === 0) return { gesendet: 0, uebersprungen: 1, fehlgeschlagen: 0 };

  const seit = new Date(jetzt.getTime() - (zeitraum === "taeglich" ? 1 : 7) * 86_400_000);
  const in30Tagen = new Date(jetzt.getTime() + 30 * 86_400_000);

  const [offene, neue, ablaufend, zahlen] = await Promise.all([
    prisma.alert.findMany({ where: { erledigtAm: null }, orderBy: { schwere: "asc" } }),
    prisma.alert.findMany({ where: { erledigtAm: null, geoeffnetAm: { gte: seit } } }),
    prisma.host.findMany({
      where: { subNextduedate: { gte: jetzt, lte: in30Tagen } },
      orderBy: { subNextduedate: "asc" },
      select: { hostname: true, subNextduedate: true, kunde: { select: { name: true } } },
    }),
    kennzahlen(jetzt),
  ]);

  const alsDaten = (alert: (typeof offene)[number]): AlertNachrichtDaten => ({
    id: alert.id,
    regel: alert.regel,
    schwere: alert.schwere,
    titel: alert.titel,
    beschreibung: alert.beschreibung,
    hostId: alert.hostId,
  });

  const nachricht = zusammenfassungNachricht(
    {
      zeitraum,
      offeneAlerts: offene.map(alsDaten),
      neueAlerts: neue.map(alsDaten),
      baldAblaufend: ablaufend.map((host) => ({
        hostname: host.hostname,
        kunde: host.kunde?.name ?? "Nicht zugeordnet",
        datum: host.subNextduedate!,
        tage: Math.round((host.subNextduedate!.getTime() - jetzt.getTime()) / 86_400_000),
      })),
      offeneRechnungspunkte: zahlen.offeneRechnungspunkte,
      hostsOhneMeldung: zahlen.ohneMeldung,
    },
    appUrl(),
  );

  let gesendet = 0;
  let fehlgeschlagen = 0;
  for (const kanal of kanaele) {
    try {
      await ueberKanalSenden(kanal, nachricht, null);
      gesendet += 1;
    } catch {
      fehlgeschlagen += 1;
    }
  }

  return { gesendet, uebersprungen: 0, fehlgeschlagen };
}

/** Verschickt eine Nachricht über genau einen Kanal – für „Test senden“. */
export async function ueberEinenKanalSenden(kanalId: string, nachricht: Nachricht): Promise<void> {
  const kanaele = await aktiveKanaele();
  const kanal =
    kanaele.find((eintrag) => eintrag.id === kanalId) ??
    (await (async () => {
      const eintrag = await prisma.benachrichtigungskanal.findUnique({ where: { id: kanalId } });
      if (!eintrag) return undefined;
      return {
        id: eintrag.id,
        typ: eintrag.typ,
        name: eintrag.name,
        aktiv: eintrag.aktiv,
        konfiguration: eintrag.konfiguration as never,
      };
    })());

  if (!kanal) throw new Error("Kanal nicht gefunden.");
  await ueberKanalSenden(kanal, nachricht, null);
}
