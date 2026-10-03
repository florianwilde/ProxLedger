import type { AlertSchwere, SubscriptionStatus } from "@/generated/prisma/enums";
import { formatDatum, formatEuro } from "@/lib/format";

/**
 * Warnregeln als reine Funktionen: Sie bekommen einen Ausschnitt der Daten und geben
 * Kandidaten zurück. Kein Datenbankzugriff, keine Nebenwirkungen – dadurch sind sie einzeln testbar.
 * Das Öffnen und Schließen der Alerts übernimmt der Abgleich (`abgleich.ts`).
 */

export interface AlertKandidat {
  /** Regel + betroffenes Objekt (+ Stufe). Zwei Kandidaten mit gleichem Fingerabdruck sind derselbe Fall. */
  fingerprint: string;
  regel: string;
  schwere: AlertSchwere;
  titel: string;
  beschreibung: string;
  hostId: string | null;
  kundeId: string | null;
  laufzeitId: string | null;
}

export interface HostDaten {
  id: string;
  hostname: string;
  clusterName: string | null;
  clusterMitglieder: string[];
  kundeId: string | null;
  kundeName: string | null;
  subKey: string | null;
  subStatus: SubscriptionStatus;
  subNextduedate: Date | null;
  subLizenzierteSockets: number | null;
  sockets: number | null;
  letzterReportAm: Date | null;
  serverIds: { serverId: string; ersteMeldung: Date; letzteMeldung: Date }[];
}

export interface LaufzeitDaten {
  id: string;
  hostId: string;
  hostname: string;
  kundeId: string | null;
  kundeName: string | null;
  key: string;
  start: Date;
  ende: Date;
  einkaufNummer: string | null;
  einkaufBetrag: number | null;
  einkaufBezahlt: boolean | null;
  einkaufFaelligAm: Date | null;
  verkaufNummer: string | null;
  verkaufBetrag: number | null;
  verkaufErstellt: boolean;
  verkaufBezahlt: boolean;
  verkaufDatum: Date | null;
}

export interface RegelKontext {
  jetzt: Date;
  hosts: HostDaten[];
  laufzeiten: LaufzeitDaten[];
  einstellungen: Map<string, { aktiv: boolean; schwellwerte: Record<string, unknown> }>;
}

export interface Regel {
  name: string;
  beschreibung: string;
  /** Wird beim Anlegen der Einstellung als Vorgabe gespeichert (JSON-taugliche Werte). */
  standardSchwellwerte: Record<string, number | number[] | string | boolean>;
  pruefe: (kontext: RegelKontext) => AlertKandidat[];
}

const TAG = 86_400_000;

function tageBis(datum: Date, jetzt: Date): number {
  const ziel = Date.UTC(datum.getUTCFullYear(), datum.getUTCMonth(), datum.getUTCDate());
  const start = Date.UTC(jetzt.getUTCFullYear(), jetzt.getUTCMonth(), jetzt.getUTCDate());
  return Math.round((ziel - start) / TAG);
}

function schwellwert<T>(kontext: RegelKontext, regel: string, name: string, standard: T): T {
  const wert = kontext.einstellungen.get(regel)?.schwellwerte?.[name];
  return (wert as T) ?? standard;
}

function kundenHinweis(kundeName: string | null): string {
  return kundeName ?? "Nicht zugeordnet";
}

// ---------------------------------------------------------------- Regeln

const subscriptionLaeuftAb: Regel = {
  name: "subscription-laeuft-ab",
  beschreibung: "Subscription läuft in wenigen Tagen ab",
  standardSchwellwerte: { tage: [30, 14, 7] },
  pruefe(kontext) {
    const stufen = [...schwellwert<number[]>(kontext, "subscription-laeuft-ab", "tage", [30, 14, 7])].sort(
      (a, b) => b - a,
    );

    return kontext.hosts.flatMap((host) => {
      if (!host.subNextduedate || host.subStatus !== "ACTIVE") return [];
      const tage = tageBis(host.subNextduedate, kontext.jetzt);
      if (tage < 0) return [];

      // Immer nur die strengste erreichte Stufe melden.
      const erreicht = stufen.filter((stufe) => tage <= stufe).sort((a, b) => a - b)[0];
      if (erreicht === undefined) return [];

      return [
        {
          fingerprint: `subscription-laeuft-ab:${host.id}:${erreicht}`,
          regel: "subscription-laeuft-ab",
          schwere: (erreicht <= 7 ? "GEFAHR" : erreicht <= 14 ? "WARNUNG" : "INFO") as AlertSchwere,
          titel: `Subscription läuft in ${tage} Tag${tage === 1 ? "" : "en"} ab`,
          beschreibung: `${host.hostname} · ${kundenHinweis(host.kundeName)} · ${formatDatum(host.subNextduedate)}`,
          hostId: host.id,
          kundeId: host.kundeId,
          laufzeitId: null,
        },
      ];
    });
  },
};

/** Eigene Titel, damit die Meldung ein ganzer Satz bleibt. */
const STATUS_TITEL: Record<SubscriptionStatus, string> = {
  ACTIVE: "Subscription aktiv",
  NOTFOUND: "Keine Subscription gefunden",
  INVALID: "Subscription ungültig",
  EXPIRED: "Subscription abgelaufen",
  SUSPENDED: "Subscription ausgesetzt",
  UNKNOWN: "Subscription-Status unbekannt",
};

const statusNichtAktiv: Regel = {
  name: "status-nicht-aktiv",
  beschreibung: "Subscription ist nicht aktiv",
  standardSchwellwerte: {},
  pruefe(kontext) {
    return kontext.hosts
      .filter((host) => host.subStatus !== "ACTIVE")
      .map((host) => ({
        fingerprint: `status-nicht-aktiv:${host.id}`,
        regel: "status-nicht-aktiv",
        schwere: (host.subStatus === "NOTFOUND" || host.subStatus === "UNKNOWN"
          ? "WARNUNG"
          : "GEFAHR") as AlertSchwere,
        titel: STATUS_TITEL[host.subStatus],
        beschreibung: `${host.hostname} · ${kundenHinweis(host.kundeName)}${
          host.subKey ? ` · ${host.subKey}` : ""
        }`,
        hostId: host.id,
        kundeId: host.kundeId,
        laufzeitId: null,
      }));
  },
};

const socketsAbweichung: Regel = {
  name: "sockets-abweichung",
  beschreibung: "Lizenzierte und physische Sockets weichen ab",
  standardSchwellwerte: {},
  pruefe(kontext) {
    return kontext.hosts
      .filter(
        (host) =>
          host.subLizenzierteSockets !== null &&
          host.sockets !== null &&
          host.subLizenzierteSockets !== host.sockets,
      )
      .map((host) => ({
        fingerprint: `sockets-abweichung:${host.id}`,
        regel: "sockets-abweichung",
        schwere: "WARNUNG" as AlertSchwere,
        titel: "Lizenzierte Sockets weichen ab",
        beschreibung: `${host.hostname} · ${host.subLizenzierteSockets} lizenziert, ${host.sockets} physisch vorhanden`,
        hostId: host.id,
        kundeId: host.kundeId,
        laufzeitId: null,
      }));
  },
};

const keineMeldung: Regel = {
  name: "keine-meldung",
  beschreibung: "Host hat sich lange nicht gemeldet",
  standardSchwellwerte: { stunden: 48 },
  pruefe(kontext) {
    const stunden = schwellwert(kontext, "keine-meldung", "stunden", 48);
    const grenze = new Date(kontext.jetzt.getTime() - stunden * 3_600_000);

    return kontext.hosts
      .filter((host) => host.letzterReportAm !== null && host.letzterReportAm < grenze)
      .map((host) => ({
        fingerprint: `keine-meldung:${host.id}`,
        regel: "keine-meldung",
        schwere: "WARNUNG" as AlertSchwere,
        titel: `Host meldet sich seit über ${stunden} Stunden nicht`,
        beschreibung: `${host.hostname} · ${kundenHinweis(host.kundeName)} · letzte Meldung ${formatDatum(
          host.letzterReportAm,
        )}`,
        hostId: host.id,
        kundeId: host.kundeId,
        laufzeitId: null,
      }));
  },
};

const serverIdGeaendert: Regel = {
  name: "serverid-geaendert",
  beschreibung: "Server-ID hat sich geändert (Hardwaretausch oder Neuinstallation)",
  standardSchwellwerte: { tage: 30 },
  pruefe(kontext) {
    const tage = schwellwert(kontext, "serverid-geaendert", "tage", 30);
    const grenze = new Date(kontext.jetzt.getTime() - tage * TAG);

    return kontext.hosts.flatMap((host) => {
      if (host.serverIds.length < 2) return [];

      const nachSortiert = [...host.serverIds].sort(
        (a, b) => b.letzteMeldung.getTime() - a.letzteMeldung.getTime(),
      );
      const aktuell = nachSortiert[0];
      const vorher = nachSortiert[1];

      // Nur melden, solange der Wechsel frisch ist – ein alter Hardwaretausch ist erledigt.
      if (aktuell.ersteMeldung < grenze) return [];

      return [
        {
          fingerprint: `serverid-geaendert:${host.id}:${aktuell.serverId}`,
          regel: "serverid-geaendert",
          schwere: "GEFAHR" as AlertSchwere,
          titel: "Server-ID hat sich geändert",
          beschreibung: `${host.hostname} · neu ${aktuell.serverId}, vorher ${vorher.serverId} – der Key muss bei Proxmox neu zugewiesen werden`,
          hostId: host.id,
          kundeId: host.kundeId,
          laufzeitId: null,
        },
      ];
    });
  },
};

const keyMehrfach: Regel = {
  name: "key-mehrfach-gemeldet",
  beschreibung: "Derselbe Subscription-Key wird von mehreren Hosts gemeldet",
  standardSchwellwerte: {},
  pruefe(kontext) {
    const proKey = new Map<string, HostDaten[]>();
    for (const host of kontext.hosts) {
      if (!host.subKey) continue;
      proKey.set(host.subKey, [...(proKey.get(host.subKey) ?? []), host]);
    }

    return [...proKey.entries()]
      .filter(([, hosts]) => hosts.length > 1)
      .map(([key, hosts]) => ({
        fingerprint: `key-mehrfach-gemeldet:${key}`,
        regel: "key-mehrfach-gemeldet",
        schwere: "GEFAHR" as AlertSchwere,
        titel: "Key wird von mehreren Hosts gemeldet",
        beschreibung: `${key} · ${hosts.map((h) => h.hostname).join(", ")}`,
        hostId: hosts[0].id,
        kundeId: hosts[0].kundeId,
        laufzeitId: null,
      }));
  },
};

const hostOhneKunde: Regel = {
  name: "host-ohne-kunde",
  beschreibung: "Host ist keinem Kunden zugewiesen",
  standardSchwellwerte: {},
  pruefe(kontext) {
    return kontext.hosts
      .filter((host) => host.kundeId === null)
      .map((host) => ({
        fingerprint: `host-ohne-kunde:${host.id}`,
        regel: "host-ohne-kunde",
        schwere: "INFO" as AlertSchwere,
        titel: "Host ist keinem Kunden zugewiesen",
        beschreibung: `${host.hostname}${host.subKey ? ` · ${host.subKey}` : ""}`,
        hostId: host.id,
        kundeId: null,
        laufzeitId: null,
      }));
  },
};

const clusterKnotenOhneAgent: Regel = {
  name: "cluster-knoten-ohne-agent",
  beschreibung: "Ein Cluster-Knoten meldet sich nicht beim Dashboard",
  standardSchwellwerte: {},
  pruefe(kontext) {
    // Alle gemeldeten Hostnamen – ein Knoten gilt als bekannt, wenn er selbst meldet.
    const meldende = new Set(kontext.hosts.map((host) => host.hostname.toLowerCase()));

    const fehlende = new Map<string, { cluster: string; melder: HostDaten }>();
    for (const host of kontext.hosts) {
      if (!host.clusterName) continue;
      for (const mitglied of host.clusterMitglieder) {
        const name = mitglied.trim();
        if (!name || meldende.has(name.toLowerCase())) continue;
        if (!fehlende.has(name.toLowerCase())) {
          fehlende.set(name.toLowerCase(), { cluster: host.clusterName, melder: host });
        }
      }
    }

    return [...fehlende.entries()].map(([name, eintrag]) => ({
      fingerprint: `cluster-knoten-ohne-agent:${eintrag.cluster}:${name}`,
      regel: "cluster-knoten-ohne-agent",
      schwere: "WARNUNG" as AlertSchwere,
      titel: "Cluster-Knoten ohne Agent",
      beschreibung: `${name} gehört zum Cluster ${eintrag.cluster} (gemeldet von ${eintrag.melder.hostname}), meldet sich aber nicht – dort fehlt der Agent`,
      hostId: eintrag.melder.id,
      kundeId: eintrag.melder.kundeId,
      laufzeitId: null,
    }));
  },
};

const proxmoxRechnungFaellig: Regel = {
  name: "proxmox-rechnung-faellig",
  beschreibung: "Proxmox-Rechnung ist unbezahlt und wird fällig",
  standardSchwellwerte: { tage: 7 },
  pruefe(kontext) {
    const tage = schwellwert(kontext, "proxmox-rechnung-faellig", "tage", 7);

    return kontext.laufzeiten.flatMap((laufzeit) => {
      if (laufzeit.einkaufBezahlt !== false || !laufzeit.einkaufFaelligAm) return [];
      const rest = tageBis(laufzeit.einkaufFaelligAm, kontext.jetzt);
      if (rest > tage) return [];

      return [
        {
          fingerprint: `proxmox-rechnung-faellig:${laufzeit.id}`,
          regel: "proxmox-rechnung-faellig",
          schwere: (rest < 0 ? "GEFAHR" : "WARNUNG") as AlertSchwere,
          titel: rest < 0 ? "Proxmox-Rechnung überfällig" : "Proxmox-Rechnung wird fällig",
          beschreibung: `${laufzeit.einkaufNummer ?? "ohne Nummer"} · ${formatEuro(
            laufzeit.einkaufBetrag,
          )} netto · fällig am ${formatDatum(laufzeit.einkaufFaelligAm)} · ${laufzeit.hostname}`,
          hostId: laufzeit.hostId,
          kundeId: laufzeit.kundeId,
          laufzeitId: laufzeit.id,
        },
      ];
    });
  },
};

const kundenrechnungFehlt: Regel = {
  name: "kundenrechnung-fehlt",
  beschreibung: "Einkauf ist erfasst, die Kundenrechnung fehlt noch",
  standardSchwellwerte: {},
  pruefe(kontext) {
    return kontext.laufzeiten
      .filter((laufzeit) => laufzeit.einkaufNummer !== null && !laufzeit.verkaufErstellt)
      .filter((laufzeit) => laufzeit.kundeId !== null)
      .map((laufzeit) => ({
        fingerprint: `kundenrechnung-fehlt:${laufzeit.id}`,
        regel: "kundenrechnung-fehlt",
        schwere: "WARNUNG" as AlertSchwere,
        titel: "Kundenrechnung noch nicht erstellt",
        beschreibung: `${laufzeit.hostname} · ${kundenHinweis(laufzeit.kundeName)} · Laufzeit ab ${formatDatum(
          laufzeit.start,
        )} · Einkauf ${laufzeit.einkaufNummer}`,
        hostId: laufzeit.hostId,
        kundeId: laufzeit.kundeId,
        laufzeitId: laufzeit.id,
      }));
  },
};

const kundenrechnungUnbezahlt: Regel = {
  name: "kundenrechnung-unbezahlt",
  beschreibung: "Kundenrechnung ist erstellt, aber noch nicht bezahlt",
  standardSchwellwerte: { tage: 30 },
  pruefe(kontext) {
    const tage = schwellwert(kontext, "kundenrechnung-unbezahlt", "tage", 30);

    return kontext.laufzeiten.flatMap((laufzeit) => {
      if (!laufzeit.verkaufErstellt || laufzeit.verkaufBezahlt || !laufzeit.verkaufDatum) return [];
      const offenSeit = -tageBis(laufzeit.verkaufDatum, kontext.jetzt);
      if (offenSeit < tage) return [];

      return [
        {
          fingerprint: `kundenrechnung-unbezahlt:${laufzeit.id}`,
          regel: "kundenrechnung-unbezahlt",
          schwere: "WARNUNG" as AlertSchwere,
          titel: `Kundenrechnung seit ${offenSeit} Tagen offen`,
          beschreibung: `${laufzeit.verkaufNummer ?? "ohne Nummer"} · ${kundenHinweis(
            laufzeit.kundeName,
          )} · ${formatEuro(laufzeit.verkaufBetrag)} netto`,
          hostId: laufzeit.hostId,
          kundeId: laufzeit.kundeId,
          laufzeitId: laufzeit.id,
        },
      ];
    });
  },
};

/**
 * Der übliche Ablauf: Erst kommt die unbezahlte Rechnung von Proxmox, dann stellt man dem Kunden
 * seine Rechnung, und **nachdem der Kunde gezahlt hat**, zahlt man selbst bei Proxmox. Hat der Kunde
 * bezahlt und die Einkaufsrechnung ist noch offen, liegt das Geld da und die Rechnung auch – das ist
 * der Moment zum Zahlen, unabhängig vom Fälligkeitsdatum (#037).
 */
const kundeBezahltEinkaufOffen: Regel = {
  name: "kunde-bezahlt-einkauf-offen",
  beschreibung: "Der Kunde hat bezahlt, die Proxmox-Rechnung ist noch offen",
  standardSchwellwerte: {},
  pruefe(kontext) {
    return kontext.laufzeiten.flatMap((laufzeit) => {
      if (!laufzeit.verkaufBezahlt || laufzeit.einkaufBezahlt !== false) return [];

      return [
        {
          fingerprint: `kunde-bezahlt-einkauf-offen:${laufzeit.id}`,
          regel: "kunde-bezahlt-einkauf-offen",
          schwere: "INFO" as AlertSchwere,
          titel: "Kunde hat bezahlt – Proxmox-Rechnung noch offen",
          beschreibung: `${laufzeit.hostname} · ${kundenHinweis(laufzeit.kundeName)} · Einkauf ${
            laufzeit.einkaufNummer ?? "ohne Nummer"
          } über ${formatEuro(laufzeit.einkaufBetrag)} netto ist noch nicht bezahlt`,
          hostId: laufzeit.hostId,
          kundeId: laufzeit.kundeId,
          laufzeitId: laufzeit.id,
        },
      ];
    });
  },
};

export const REGELN: Regel[] = [
  subscriptionLaeuftAb,
  statusNichtAktiv,
  socketsAbweichung,
  keineMeldung,
  serverIdGeaendert,
  keyMehrfach,
  hostOhneKunde,
  clusterKnotenOhneAgent,
  proxmoxRechnungFaellig,
  kundenrechnungFehlt,
  kundenrechnungUnbezahlt,
  kundeBezahltEinkaufOffen,
];

/** Wendet alle aktiven Regeln an. */
export function alleRegelnPruefen(kontext: RegelKontext): AlertKandidat[] {
  return REGELN.filter((regel) => kontext.einstellungen.get(regel.name)?.aktiv !== false).flatMap((regel) =>
    regel.pruefe(kontext),
  );
}
