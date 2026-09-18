import { prisma } from "@/lib/db";
import { protokolliere } from "@/server/audit";
import { einstellungen } from "@/server/einstellungen";

export class RechnungsFehler extends Error {}

export interface ProxmoxRechnungEingabe {
  nummer: string;
  datum: Date;
  faelligAm: Date | null;
  nettoBetrag: number;
  ustSatz?: number;
  rabatt?: number | null;
  zahlungsart?: string | null;
  bezahlt: boolean;
  bezahltAm?: Date | null;
  anhangId?: string | null;
  notizen?: string | null;
}

export interface KundenrechnungEingabe {
  erstellt: boolean;
  nummer?: string | null;
  datum?: Date | null;
  nettoBetrag?: number | null;
  ustSatz?: number;
  bezahlt: boolean;
  bezahltAm?: Date | null;
  anhangId?: string | null;
  notizen?: string | null;
}

/** Bestätigt einen vom Agent vorgeschlagenen Lizenzzeitraum. */
export async function laufzeitBestaetigen(id: string) {
  const laufzeit = await prisma.laufzeit.update({
    where: { id },
    data: { status: "BESTAETIGT" },
  });
  await protokolliere("laufzeit.bestaetigt", "Laufzeit", id, {
    start: laufzeit.start,
    ende: laufzeit.ende,
  });
  return laufzeit;
}

/** Verwirft einen Vorschlag; bereits bestätigte Laufzeiten bleiben unangetastet. */
export async function laufzeitVerwerfen(id: string) {
  const laufzeit = await prisma.laufzeit.findUnique({ where: { id } });
  if (!laufzeit) throw new RechnungsFehler("Laufzeit nicht gefunden.");
  if (laufzeit.status !== "VORSCHLAG") {
    throw new RechnungsFehler("Nur Vorschläge können verworfen werden.");
  }

  await prisma.laufzeit.delete({ where: { id } });
  await protokolliere("laufzeit.verworfen", "Laufzeit", id, { start: laufzeit.start });
}

/**
 * Erfasst die Proxmox-Rechnung zu einer Laufzeit.
 * Gibt es die Rechnungsnummer schon, wird eine weitere Position angehängt – so entsteht aus mehreren
 * Laufzeiten eine Sammelrechnung, ohne dass die Nummer doppelt vergeben wird.
 */
export async function proxmoxRechnungErfassen(laufzeitId: string, eingabe: ProxmoxRechnungEingabe) {
  const laufzeit = await prisma.laufzeit.findUnique({
    where: { id: laufzeitId },
    include: { proxmoxPosition: true, host: { select: { hostname: true } } },
  });
  if (!laufzeit) throw new RechnungsFehler("Laufzeit nicht gefunden.");
  if (!eingabe.nummer.trim()) throw new RechnungsFehler("Bitte eine Rechnungsnummer angeben.");

  const { steuersatz: vorgabeSteuersatz } = await einstellungen();
  const nummer = eingabe.nummer.trim();
  const bezeichnung = `${laufzeit.key} · ${laufzeit.host.hostname} · ${laufzeit.start.toISOString().slice(0, 10)} bis ${laufzeit.ende.toISOString().slice(0, 10)}`;

  return prisma.$transaction(async (tx) => {
    const vorhanden = await tx.proxmoxRechnung.findUnique({ where: { nummer } });

    const rechnung = vorhanden
      ? await tx.proxmoxRechnung.update({
          where: { id: vorhanden.id },
          data: {
            datum: eingabe.datum,
            faelligAm: eingabe.faelligAm,
            ustSatz: eingabe.ustSatz ?? vorgabeSteuersatz,
            rabatt: eingabe.rabatt ?? null,
            zahlungsart: eingabe.zahlungsart ?? null,
            bezahlt: eingabe.bezahlt,
            bezahltAm: eingabe.bezahlt ? (eingabe.bezahltAm ?? new Date()) : null,
            anhangId: eingabe.anhangId ?? vorhanden.anhangId,
            notizen: eingabe.notizen ?? vorhanden.notizen,
          },
        })
      : await tx.proxmoxRechnung.create({
          data: {
            nummer,
            datum: eingabe.datum,
            faelligAm: eingabe.faelligAm,
            nettoBetrag: eingabe.nettoBetrag,
            ustSatz: eingabe.ustSatz ?? vorgabeSteuersatz,
            rabatt: eingabe.rabatt ?? null,
            zahlungsart: eingabe.zahlungsart ?? null,
            bezahlt: eingabe.bezahlt,
            bezahltAm: eingabe.bezahlt ? (eingabe.bezahltAm ?? new Date()) : null,
            anhangId: eingabe.anhangId ?? null,
            notizen: eingabe.notizen ?? null,
          },
        });

    const position = laufzeit.proxmoxPosition
      ? await tx.proxmoxRechnungPosition.update({
          where: { id: laufzeit.proxmoxPosition.id },
          data: { rechnungId: rechnung.id, bezeichnung, nettoBetrag: eingabe.nettoBetrag },
        })
      : await tx.proxmoxRechnungPosition.create({
          data: { rechnungId: rechnung.id, bezeichnung, nettoBetrag: eingabe.nettoBetrag },
        });

    await tx.laufzeit.update({
      where: { id: laufzeitId },
      data: { proxmoxPositionId: position.id, status: "BESTAETIGT" },
    });

    // Der Rechnungsbetrag ist immer die Summe der Positionen.
    const positionen = await tx.proxmoxRechnungPosition.findMany({ where: { rechnungId: rechnung.id } });
    const summe = positionen.reduce((s, p) => s + Number(p.nettoBetrag), 0);
    await tx.proxmoxRechnung.update({ where: { id: rechnung.id }, data: { nettoBetrag: summe } });

    await protokolliere("proxmox_rechnung.erfasst", "ProxmoxRechnung", rechnung.id, {
      nummer,
      laufzeitId,
      nettoBetrag: eingabe.nettoBetrag,
      positionen: positionen.length,
    });

    return { rechnungId: rechnung.id, positionId: position.id, sammelrechnung: positionen.length > 1 };
  });
}

/** Erfasst die Kundenrechnung zu einer Laufzeit; gleiche Nummer bedeutet auch hier Sammelrechnung. */
export async function kundenrechnungErfassen(laufzeitId: string, eingabe: KundenrechnungEingabe) {
  const laufzeit = await prisma.laufzeit.findUnique({
    where: { id: laufzeitId },
    include: { kundenPosition: true, host: { select: { hostname: true, kundeId: true } } },
  });
  if (!laufzeit) throw new RechnungsFehler("Laufzeit nicht gefunden.");
  const kundeId = laufzeit.host.kundeId;
  if (!kundeId) {
    throw new RechnungsFehler("Der Host ist keinem Kunden zugewiesen – ohne Kunde keine Kundenrechnung.");
  }

  const { steuersatz: vorgabeSteuersatz } = await einstellungen();
  const nummer = eingabe.nummer?.trim() || null;
  const bezeichnung = `${laufzeit.key} · ${laufzeit.host.hostname} · ${laufzeit.start.toISOString().slice(0, 10)} bis ${laufzeit.ende.toISOString().slice(0, 10)}`;
  const betrag = eingabe.nettoBetrag ?? 0;

  return prisma.$transaction(async (tx) => {
    const vorhanden = nummer ? await tx.kundenrechnung.findUnique({ where: { nummer } }) : null;
    if (vorhanden && vorhanden.kundeId !== kundeId) {
      throw new RechnungsFehler("Diese Rechnungsnummer gehört bereits zu einem anderen Kunden.");
    }

    const daten = {
      erstellt: eingabe.erstellt,
      nummer,
      datum: eingabe.datum ?? null,
      ustSatz: eingabe.ustSatz ?? vorgabeSteuersatz,
      bezahlt: eingabe.bezahlt,
      bezahltAm: eingabe.bezahlt ? (eingabe.bezahltAm ?? new Date()) : null,
      anhangId: eingabe.anhangId ?? null,
      notizen: eingabe.notizen ?? null,
    };

    // Welche Rechnung ist gemeint? Zuerst die über die Nummer gefundene, sonst die bisher verknüpfte.
    const zielRechnungId = vorhanden?.id ?? laufzeit.kundenPosition?.rechnungId ?? null;

    const rechnung = zielRechnungId
      ? await tx.kundenrechnung.update({ where: { id: zielRechnungId }, data: daten })
      : await tx.kundenrechnung.create({
          data: { ...daten, kundeId, nettoBetrag: betrag },
        });

    const position = laufzeit.kundenPosition
      ? await tx.kundenrechnungPosition.update({
          where: { id: laufzeit.kundenPosition.id },
          data: { rechnungId: rechnung.id, bezeichnung, nettoBetrag: betrag },
        })
      : await tx.kundenrechnungPosition.create({
          data: { rechnungId: rechnung.id, bezeichnung, nettoBetrag: betrag },
        });

    await tx.laufzeit.update({ where: { id: laufzeitId }, data: { kundenPositionId: position.id } });

    const positionen = await tx.kundenrechnungPosition.findMany({ where: { rechnungId: rechnung.id } });
    const summe = positionen.reduce((s, p) => s + Number(p.nettoBetrag), 0);
    await tx.kundenrechnung.update({ where: { id: rechnung.id }, data: { nettoBetrag: summe } });

    await protokolliere("kundenrechnung.erfasst", "Kundenrechnung", rechnung.id, {
      nummer,
      laufzeitId,
      nettoBetrag: betrag,
      positionen: positionen.length,
    });

    return { rechnungId: rechnung.id, positionId: position.id, sammelrechnung: positionen.length > 1 };
  });
}

/** Häkchen „Proxmox bezahlt“ direkt aus der Tabelle. */
export async function einkaufBezahltSetzen(laufzeitId: string, bezahlt: boolean) {
  const laufzeit = await prisma.laufzeit.findUnique({
    where: { id: laufzeitId },
    include: { proxmoxPosition: true },
  });
  if (!laufzeit?.proxmoxPosition) {
    throw new RechnungsFehler("Für diese Laufzeit ist noch keine Proxmox-Rechnung erfasst.");
  }

  await prisma.proxmoxRechnung.update({
    where: { id: laufzeit.proxmoxPosition.rechnungId },
    data: { bezahlt, bezahltAm: bezahlt ? new Date() : null },
  });

  await protokolliere(
    "proxmox_rechnung.bezahlt_gesetzt",
    "ProxmoxRechnung",
    laufzeit.proxmoxPosition.rechnungId,
    {
      bezahlt,
      laufzeitId,
    },
  );
}

/**
 * Häkchen „Kundenrechnung erstellt“ direkt aus der Tabelle.
 * Fehlt die Rechnung noch, entsteht eine ohne Nummer – sie lässt sich später vervollständigen.
 */
export async function verkaufErstelltSetzen(laufzeitId: string, erstellt: boolean) {
  const laufzeit = await prisma.laufzeit.findUnique({
    where: { id: laufzeitId },
    include: { kundenPosition: true, host: { select: { hostname: true, kundeId: true } } },
  });
  if (!laufzeit) throw new RechnungsFehler("Laufzeit nicht gefunden.");

  if (laufzeit.kundenPosition) {
    await prisma.kundenrechnung.update({
      where: { id: laufzeit.kundenPosition.rechnungId },
      data: { erstellt },
    });
    await protokolliere(
      "kundenrechnung.erstellt_gesetzt",
      "Kundenrechnung",
      laufzeit.kundenPosition.rechnungId,
      {
        erstellt,
        laufzeitId,
      },
    );
    return;
  }

  if (!erstellt) return;
  await kundenrechnungErfassen(laufzeitId, { erstellt: true, bezahlt: false, nettoBetrag: 0 });
}

/** Häkchen „Kundenrechnung bezahlt“. */
export async function verkaufBezahltSetzen(laufzeitId: string, bezahlt: boolean) {
  const laufzeit = await prisma.laufzeit.findUnique({
    where: { id: laufzeitId },
    include: { kundenPosition: true },
  });
  if (!laufzeit?.kundenPosition) {
    throw new RechnungsFehler("Für diese Laufzeit ist noch keine Kundenrechnung erfasst.");
  }

  await prisma.kundenrechnung.update({
    where: { id: laufzeit.kundenPosition.rechnungId },
    data: { bezahlt, bezahltAm: bezahlt ? new Date() : null },
  });

  await protokolliere(
    "kundenrechnung.bezahlt_gesetzt",
    "Kundenrechnung",
    laufzeit.kundenPosition.rechnungId,
    {
      bezahlt,
      laufzeitId,
    },
  );
}

/** Legt eine Laufzeit von Hand an – etwa für Käufe, die der Agent noch nicht gemeldet hat. */
export async function laufzeitAnlegen(daten: {
  hostId: string;
  key: string;
  start: Date;
  ende: Date;
  notizen?: string | null;
}) {
  const vorhanden = await prisma.laufzeit.findUnique({
    where: { hostId_start: { hostId: daten.hostId, start: daten.start } },
  });
  if (vorhanden) {
    throw new RechnungsFehler("Für dieses Startdatum gibt es bereits eine Laufzeit.");
  }
  if (daten.ende <= daten.start) {
    throw new RechnungsFehler("Das Ende muss nach dem Beginn liegen.");
  }

  const laufzeit = await prisma.laufzeit.create({
    data: { ...daten, status: "BESTAETIGT" },
  });
  await protokolliere("laufzeit.angelegt", "Laufzeit", laufzeit.id, daten);
  return laufzeit;
}
