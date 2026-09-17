/** Einheitliche Beschriftungen für Produkt und Subscription-Status (Datenbank und Prototyp-Daten). */

export type AnzeigeStatus = "active" | "notfound" | "invalid" | "expired" | "suspended" | "unknown";

export const PRODUKT_TEXT: Record<string, string> = {
  PVE: "Proxmox VE",
  PBS: "Proxmox Backup Server",
  PMG: "Proxmox Mail Gateway",
  pve: "Proxmox VE",
  pbs: "Proxmox Backup Server",
  pmg: "Proxmox Mail Gateway",
};

export const STATUS_TEXT: Record<AnzeigeStatus, string> = {
  active: "Aktiv",
  notfound: "Keine Subscription",
  invalid: "Ungültig",
  expired: "Abgelaufen",
  suspended: "Ausgesetzt",
  unknown: "Unbekannt",
};

/** Nimmt sowohl die Datenbank-Schreibweise (ACTIVE) als auch die von Proxmox (active) entgegen. */
export function statusAusDatenbank(wert: string): AnzeigeStatus {
  const klein = wert.toLowerCase();
  return (["active", "notfound", "invalid", "expired", "suspended"] as const).includes(
    klein as AnzeigeStatus & ("active" | "notfound" | "invalid" | "expired" | "suspended"),
  )
    ? (klein as AnzeigeStatus)
    : "unknown";
}
