import { prisma } from "@/lib/db";
import { darfEinkaufSehen, sichtbarerKunde } from "@/server/auth/sitzungspflicht";
import { meldungsGrenze } from "./hosts";

/**
 * Hosts nach Ablaufdatum mit der Laufzeit, die zu diesem Ablauf gehört.
 * Gezeigt wird bewusst die Verlängerung (die Laufzeit, die am `nextduedate` beginnt),
 * denn deren Rechnungen sind offen – nicht die der laufenden Periode.
 */
export async function hostsNachAblauf(jetzt: Date = new Date()) {
  const nurKunde = await sichtbarerKunde();
  const einkaufSichtbar = await darfEinkaufSehen();

  const hosts = await prisma.host.findMany({
    where: { subNextduedate: { not: null }, archiviertAm: null, ...(nurKunde ? { kundeId: nurKunde } : {}) },
    orderBy: { subNextduedate: "asc" },
    include: {
      kunde: { select: { id: true, name: true } },
      laufzeiten: {
        where: { status: "BESTAETIGT" },
        orderBy: { start: "desc" },
        include: {
          proxmoxPosition: { include: { rechnung: { select: { nummer: true, bezahlt: true } } } },
          kundenPosition: { include: { rechnung: { select: { erstellt: true, bezahlt: true } } } },
        },
      },
    },
  });

  const grenze = meldungsGrenze(jetzt);

  return hosts.map((host) => {
    const ablauf = host.subNextduedate;
    const verlaengerung = host.laufzeiten.find(
      (laufzeit) => ablauf && laufzeit.start.getTime() === ablauf.getTime(),
    );
    const laufend = host.laufzeiten[0];
    const laufzeit = verlaengerung ?? laufend;

    return {
      id: host.id,
      hostname: host.hostname,
      kunde: host.kunde,
      subKey: host.subKey,
      nextduedate: ablauf,
      meldetNicht: !host.letzterReportAm || host.letzterReportAm < grenze,
      einkaufBezahlt:
        einkaufSichtbar && laufzeit?.proxmoxPosition ? laufzeit.proxmoxPosition.rechnung.bezahlt : null,
      verkaufErstellt: laufzeit?.kundenPosition?.rechnung.erstellt ?? false,
      verkaufBezahlt: laufzeit?.kundenPosition?.rechnung.bezahlt ?? false,
    };
  });
}

/**
 * Offene Rechnungspunkte als Aufgabenliste fürs Dashboard.
 * Begrenzt, weil die Karte sonst bei vielen Hosts endlos lang wird – die vollständige
 * Liste steht unter „Rechnungen“.
 */
export async function offeneAufgaben(grenze = 12) {
  // Die Aufgabenliste ist der Arbeitsvorrat des Systemhauses – für Kundenkonten bleibt sie leer.
  if (await sichtbarerKunde()) return { aufgaben: [], gesamt: 0 };

  const laufzeiten = await prisma.laufzeit.findMany({
    where: {
      status: "BESTAETIGT",
      OR: [
        { proxmoxPosition: { rechnung: { bezahlt: false } } },
        { kundenPosition: null },
        { kundenPosition: { rechnung: { erstellt: false } } },
      ],
    },
    orderBy: { start: "asc" },
    include: {
      host: { select: { id: true, hostname: true, kunde: { select: { name: true, eigenbedarf: true } } } },
      proxmoxPosition: { include: { rechnung: true } },
      kundenPosition: { include: { rechnung: true } },
    },
  });

  const aufgaben: {
    id: string;
    titel: string;
    detail: string;
    betrag: number | null;
    faelligAm: Date | null;
    dringlichkeit: "gefahr" | "warnung";
    badgeText: string;
    href: string;
    start: Date;
    ende: Date;
    aktion: { laufzeitId: string; hostId: string; feld: "einkaufBezahlt" | "verkaufErstellt" };
  }[] = [];
  for (const laufzeit of laufzeiten) {
    const basis = `${laufzeit.host.hostname} · ${laufzeit.host.kunde?.name ?? "Nicht zugeordnet"}`;
    const einkauf = laufzeit.proxmoxPosition?.rechnung;

    if (einkauf && !einkauf.bezahlt) {
      aufgaben.push({
        id: `${laufzeit.id}-einkauf`,
        titel: `Proxmox-Rechnung ${einkauf.nummer} bezahlen`,
        detail: basis,
        betrag: Number(laufzeit.proxmoxPosition?.nettoBetrag ?? 0),
        faelligAm: einkauf.faelligAm,
        dringlichkeit: "gefahr" as const,
        badgeText: "Einkauf",
        href: `/rechnungen/${laufzeit.id}`,
        start: laufzeit.start,
        ende: laufzeit.ende,
        aktion: { laufzeitId: laufzeit.id, hostId: laufzeit.hostId, feld: "einkaufBezahlt" as const },
      });
    }

    // Für Eigenbedarf gibt es keine Kundenrechnung zu schreiben (#044).
    if (einkauf && !laufzeit.host.kunde?.eigenbedarf && !laufzeit.kundenPosition?.rechnung.erstellt) {
      aufgaben.push({
        id: `${laufzeit.id}-verkauf`,
        titel: "Kundenrechnung erstellen",
        detail: basis,
        betrag: null,
        faelligAm: null,
        dringlichkeit: "warnung" as const,
        badgeText: "Verkauf",
        href: `/rechnungen/${laufzeit.id}`,
        start: laufzeit.start,
        ende: laufzeit.ende,
        aktion: { laufzeitId: laufzeit.id, hostId: laufzeit.hostId, feld: "verkaufErstellt" as const },
      });
    }
  }

  return { aufgaben: aufgaben.slice(0, grenze), gesamt: aufgaben.length };
}
