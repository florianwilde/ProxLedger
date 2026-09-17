/**
 * Typen für die Beispieldaten des Prototyps (#002).
 * Sie bilden das geplante Datenmodell (docs/architektur.md) vereinfacht ab und werden
 * in #003 durch die von Prisma erzeugten Typen ersetzt.
 */

export type Produkt = "pve" | "pbs" | "pmg";

export type SubscriptionStatus = "active" | "notfound" | "invalid" | "expired" | "suspended";

export type AlertSchwere = "info" | "warnung" | "gefahr";

export interface Kunde {
  id: string;
  name: string;
  kundennummer: string;
  ansprechpartner: string | null;
  email: string | null;
  telefon: string | null;
  notizen: string | null;
  standorte: Standort[];
}

export interface Standort {
  id: string;
  kundeId: string;
  name: string;
  ort: string | null;
}

export interface Host {
  id: string;
  hostname: string;
  fqdn: string | null;
  kundeId: string | null;
  standortId: string | null;
  produkt: Produkt;
  produktVersion: string | null;
  kernel: string | null;
  serverId: string;
  clusterName: string | null;
  nodeName: string | null;
  ips: string[];
  sockets: number | null;
  cpuModell: string | null;
  uptimeSekunden: number | null;
  paketUpdates: number | null;
  agentVersion: string;
  letzterReport: string | null;
  subscription: {
    key: string | null;
    status: SubscriptionStatus;
    level: string | null;
    produktname: string | null;
    lizenzierteSockets: number | null;
    regdate: string | null;
    nextduedate: string | null;
    checktime: string | null;
  };
  tags: string[];
  notizen: string | null;
}

export interface Rechnung {
  nummer: string | null;
  datum: string | null;
  faelligAm?: string | null;
  nettoBetrag: number | null;
  ustSatz: number;
  rabatt?: number | null;
  zahlungsart?: string | null;
  bezahlt: boolean;
  bezahltAm: string | null;
  pdfDateiname: string | null;
}

export interface Laufzeit {
  id: string;
  hostId: string;
  key: string;
  start: string;
  ende: string;
  /** Vom Agent vorgeschlagen und noch nicht bestätigt. */
  vorschlag: boolean;
  /** Proxmox-Rechnung (Einkauf). */
  einkauf: Rechnung | null;
  /** Kundenrechnung (Verkauf); `erstellt = false`, solange sie noch fehlt. */
  verkauf: (Rechnung & { erstellt: boolean }) | null;
}

export interface Alert {
  id: string;
  typ: string;
  titel: string;
  beschreibung: string;
  schwere: AlertSchwere;
  hostId: string | null;
  kundeId: string | null;
  laufzeitId: string | null;
  seit: string;
  erledigt: boolean;
}

export interface Report {
  id: string;
  hostId: string;
  zeitpunkt: string;
  status: SubscriptionStatus;
  key: string | null;
  nextduedate: string | null;
  agentVersion: string;
  paketUpdates: number | null;
}
