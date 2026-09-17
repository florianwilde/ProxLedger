import { stundenSeit, tageBis } from "@/lib/format";
import { HEUTE, alerts, hosts, kunden, laufzeiten, reports } from "./data";
import type { Host, Kunde, Laufzeit } from "./types";

export const MELDUNG_FRIST_STUNDEN = 48;
export const ABLAUF_FENSTER_TAGE = 30;

export function getKunde(id: string | null): Kunde | undefined {
  if (!id) return undefined;
  return kunden.find((k) => k.id === id);
}

export function getHost(id: string): Host | undefined {
  return hosts.find((h) => h.id === id);
}

export function hostsVonKunde(kundeId: string): Host[] {
  return hosts.filter((h) => h.kundeId === kundeId);
}

export function laufzeitenVonHost(hostId: string): Laufzeit[] {
  return laufzeiten.filter((l) => l.hostId === hostId).sort((a, b) => b.start.localeCompare(a.start));
}

export function laufzeitenVonKunde(kundeId: string): Laufzeit[] {
  const hostIds = new Set(hostsVonKunde(kundeId).map((h) => h.id));
  return laufzeiten.filter((l) => hostIds.has(l.hostId)).sort((a, b) => b.start.localeCompare(a.start));
}

/**
 * Laufzeit, die zum gemeldeten Ablaufdatum gehört: bevorzugt die Verlängerung, die am
 * `nextduedate` beginnt, sonst die laufende Laufzeit. Für das Dashboard ist die Verlängerung
 * der interessante Fall, weil deren Rechnungen noch offen sind.
 */
export function laufzeitZuAblauf(host: Host, jetzt: Date = HEUTE): Laufzeit | undefined {
  const eigene = laufzeitenVonHost(host.id).filter((l) => !l.vorschlag);
  const ablauf = host.subscription.nextduedate?.slice(0, 10);
  return eigene.find((l) => l.start === ablauf) ?? aktuelleLaufzeit(host.id, jetzt);
}

/** Laufende bzw. zuletzt gekaufte Laufzeit eines Hosts. */
export function aktuelleLaufzeit(hostId: string, jetzt: Date = HEUTE): Laufzeit | undefined {
  const eigene = laufzeitenVonHost(hostId).filter((l) => !l.vorschlag);
  const heuteIso = jetzt.toISOString().slice(0, 10);
  return eigene.find((l) => l.start <= heuteIso && l.ende >= heuteIso) ?? eigene[0];
}

export function reportsVonHost(hostId: string) {
  return reports.filter((r) => r.hostId === hostId).sort((a, b) => b.zeitpunkt.localeCompare(a.zeitpunkt));
}

export function alertsVonHost(hostId: string) {
  return alerts.filter((a) => a.hostId === hostId && !a.erledigt);
}

export function alertsVonKunde(kundeId: string) {
  return alerts.filter((a) => a.kundeId === kundeId && !a.erledigt);
}

export function offeneAlerts() {
  return alerts.filter((a) => !a.erledigt);
}

export function hostMeldetNicht(host: Host, jetzt: Date = HEUTE): boolean {
  const stunden = stundenSeit(host.letzterReport, jetzt);
  return stunden === null || stunden > MELDUNG_FRIST_STUNDEN;
}

export function nichtZugeordneteHosts(): Host[] {
  return hosts.filter((h) => h.kundeId === null);
}

/** Offene Punkte einer Laufzeit: Proxmox-Rechnung unbezahlt bzw. Kundenrechnung fehlt. */
export function offenePunkte(laufzeit: Laufzeit): { einkaufOffen: boolean; verkaufOffen: boolean } {
  const einkaufOffen = laufzeit.einkauf !== null && !laufzeit.einkauf.bezahlt;
  const verkaufOffen = laufzeit.verkauf === null || !laufzeit.verkauf.erstellt;
  return { einkaufOffen, verkaufOffen };
}

export function istAbgeschlossen(laufzeit: Laufzeit): boolean {
  const { einkaufOffen, verkaufOffen } = offenePunkte(laufzeit);
  return !einkaufOffen && !verkaufOffen;
}

/** Laufzeiten, für die noch etwas zu tun ist (Vorschläge zählen ebenfalls). */
export function offeneRechnungsLaufzeiten(): Laufzeit[] {
  return laufzeiten.filter((l) => !l.vorschlag && !istAbgeschlossen(l));
}

export function dashboardKennzahlen(jetzt: Date = HEUTE) {
  const aktiv = hosts.filter((h) => h.subscription.status === "active");
  const bald = hosts.filter((h) => {
    const tage = tageBis(h.subscription.nextduedate, jetzt);
    return tage !== null && tage >= 0 && tage <= ABLAUF_FENSTER_TAGE;
  });
  const offeneEinkaufsrechnungen = laufzeiten.filter((l) => offenePunkte(l).einkaufOffen);
  const fehlendeKundenrechnungen = laufzeiten.filter(
    (l) => !l.vorschlag && l.einkauf !== null && offenePunkte(l).verkaufOffen,
  );

  return {
    hostsGesamt: hosts.length,
    aktivLizenziert: aktiv.length,
    ohneSubscription: hosts.filter((h) => h.subscription.status !== "active").length,
    baldAblaufend: bald.length,
    ohneMeldung: hosts.filter((h) => hostMeldetNicht(h, jetzt)).length,
    ohneKunde: nichtZugeordneteHosts().length,
    offeneEinkaufsrechnungen: offeneEinkaufsrechnungen.length,
    fehlendeKundenrechnungen: fehlendeKundenrechnungen.length,
    offeneRechnungspunkte: offeneEinkaufsrechnungen.length + fehlendeKundenrechnungen.length,
    offeneAlerts: offeneAlerts().length,
  };
}

/** Hosts nach Ablaufdatum der Subscription, ohne Hosts ganz ohne Subscription. */
export function hostsNachAblauf(): Host[] {
  return [...hosts]
    .filter((h) => h.subscription.nextduedate !== null)
    .sort((a, b) => (a.subscription.nextduedate ?? "").localeCompare(b.subscription.nextduedate ?? ""));
}

export function summenVonKunde(kundeId: string) {
  const eigene = laufzeitenVonKunde(kundeId);
  const einkauf = eigene.reduce((s, l) => s + (l.einkauf?.nettoBetrag ?? 0), 0);
  const verkauf = eigene.reduce((s, l) => s + (l.verkauf?.nettoBetrag ?? 0), 0);
  return { einkauf, verkauf, marge: verkauf - einkauf };
}

export function summenProJahr(laufzeitenListe: Laufzeit[]) {
  const proJahr = new Map<string, { einkauf: number; verkauf: number }>();
  for (const l of laufzeitenListe) {
    const jahr = l.start.slice(0, 4);
    const eintrag = proJahr.get(jahr) ?? { einkauf: 0, verkauf: 0 };
    eintrag.einkauf += l.einkauf?.nettoBetrag ?? 0;
    eintrag.verkauf += l.verkauf?.nettoBetrag ?? 0;
    proJahr.set(jahr, eintrag);
  }
  return [...proJahr.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([jahr, werte]) => ({ jahr, ...werte, marge: werte.verkauf - werte.einkauf }));
}

/** Fortschritt „erledigte Rechnungspunkte“ je Kunde für die Dashboard-Card. */
export function rechnungsFortschrittProKunde() {
  return kunden.map((kunde) => {
    const eigene = laufzeitenVonKunde(kunde.id).filter((l) => !l.vorschlag);
    const gesamt = eigene.length * 2;
    const erledigt = eigene.reduce((summe, l) => {
      const { einkaufOffen, verkaufOffen } = offenePunkte(l);
      return summe + (einkaufOffen ? 0 : 1) + (verkaufOffen ? 0 : 1);
    }, 0);
    return {
      kunde,
      gesamt,
      erledigt,
      prozent: gesamt === 0 ? 100 : Math.round((erledigt / gesamt) * 100),
    };
  });
}

export function kundenUebersicht(jetzt: Date = HEUTE) {
  return kunden.map((kunde) => {
    const eigeneHosts = hostsVonKunde(kunde.id);
    const naechsterAblauf = eigeneHosts
      .map((h) => h.subscription.nextduedate)
      .filter((d): d is string => d !== null)
      .sort()[0];
    const eigeneLaufzeiten = laufzeitenVonKunde(kunde.id).filter((l) => !l.vorschlag);
    const offen = eigeneLaufzeiten.filter((l) => !istAbgeschlossen(l)).length;
    return {
      kunde,
      hosts: eigeneHosts.length,
      aktiv: eigeneHosts.filter((h) => h.subscription.status === "active").length,
      naechsterAblauf: naechsterAblauf ?? null,
      tageBisAblauf: tageBis(naechsterAblauf ?? null, jetzt),
      offeneAlerts: alertsVonKunde(kunde.id).length,
      offeneRechnungspunkte: offen,
    };
  });
}

/** Einfache Volltextsuche über Hosts, Kunden und Rechnungsnummern (Strg+K). */
export function suche(begriff: string) {
  const q = begriff.trim().toLowerCase();
  if (q.length < 2) return { hosts: [], kunden: [], rechnungen: [] };

  const trefferHosts = hosts.filter((h) =>
    [h.hostname, h.fqdn, h.serverId, h.subscription.key, ...h.ips]
      .filter(Boolean)
      .some((wert) => String(wert).toLowerCase().includes(q)),
  );
  const trefferKunden = kunden.filter((k) =>
    [k.name, k.kundennummer, k.ansprechpartner, k.email]
      .filter(Boolean)
      .some((wert) => String(wert).toLowerCase().includes(q)),
  );
  const trefferRechnungen = laufzeiten.filter((l) =>
    [l.einkauf?.nummer, l.verkauf?.nummer]
      .filter(Boolean)
      .some((wert) => String(wert).toLowerCase().includes(q)),
  );

  return { hosts: trefferHosts, kunden: trefferKunden, rechnungen: trefferRechnungen };
}

export const PRODUKT_NAME: Record<Host["produkt"], string> = {
  pve: "Proxmox VE",
  pbs: "Proxmox Backup Server",
  pmg: "Proxmox Mail Gateway",
};

export const STATUS_TEXT: Record<Host["subscription"]["status"], string> = {
  active: "Aktiv",
  notfound: "Keine Subscription",
  invalid: "Ungültig",
  expired: "Abgelaufen",
  suspended: "Ausgesetzt",
};
