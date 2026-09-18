import { z } from "zod";
import type { Produkt, SubscriptionStatus } from "@/generated/prisma/enums";

/**
 * Schemas für die Agent-API. Grundregel aus dem Auftrag: Ein Report darf nie an fehlenden
 * Feldern scheitern – alles außer den Metadaten ist `nullable` und darf auch ganz fehlen.
 */

const produkt = z.enum(["pve", "pbs", "pmg"]);

/** Proxmox liefert Datumsangaben als `YYYY-MM-DD`, Zeitstempel teils als Unix-Sekunden. */
const datumWert = z.union([z.string(), z.number()]).nullish();

const nullbarerText = z.string().max(500).nullish();

export const enrollSchema = z.object({
  /** Stabile Kennung des Agents, abgeleitet aus /etc/machine-id. */
  agentId: z.string().min(8).max(128),
  hostname: z.string().min(1).max(255),
  fqdn: nullbarerText,
  produkt: produkt,
  serverId: nullbarerText,
  agentVersion: nullbarerText,
});

export const reportSchema = z.object({
  /** UUID des Agents; macht nachgesendete Reports idempotent. */
  reportId: z.string().min(8).max(64),
  agentVersion: nullbarerText,
  erhobenAm: z.string().datetime({ offset: true }),

  host: z
    .object({
      hostname: nullbarerText,
      fqdn: nullbarerText,
      ips: z.array(z.string().max(64)).max(32).nullish(),
      clusterName: nullbarerText,
      nodeName: nullbarerText,
      clusterMitglieder: z.array(z.string().max(255)).max(64).nullish(),
      kernel: nullbarerText,
      uptimeSekunden: z.number().int().nonnegative().nullish(),
      cpuModell: nullbarerText,
      sockets: z.number().int().positive().max(64).nullish(),
      paketUpdates: z.number().int().nonnegative().nullish(),
    })
    .partial()
    .default({}),

  produkt: z
    .object({
      typ: produkt.nullish(),
      version: nullbarerText,
    })
    .partial()
    .default({}),

  subscription: z
    .object({
      key: nullbarerText,
      status: nullbarerText,
      level: nullbarerText,
      productname: nullbarerText,
      sockets: z.number().int().nonnegative().max(64).nullish(),
      serverid: nullbarerText,
      regdate: datumWert,
      nextduedate: datumWert,
      checktime: datumWert,
    })
    .partial()
    .default({}),
});

export type EnrollEingabe = z.infer<typeof enrollSchema>;
export type ReportEingabe = z.infer<typeof reportSchema>;

const STATUS_ABBILDUNG: Record<string, SubscriptionStatus> = {
  active: "ACTIVE",
  new: "ACTIVE",
  notfound: "NOTFOUND",
  invalid: "INVALID",
  expired: "EXPIRED",
  suspended: "SUSPENDED",
};

/** Unbekannte Statuswerte werden zu UNKNOWN, damit ein Report nie abgelehnt wird. */
export function statusAusProxmox(wert: string | null | undefined): SubscriptionStatus {
  if (!wert) return "UNKNOWN";
  return STATUS_ABBILDUNG[wert.trim().toLowerCase()] ?? "UNKNOWN";
}

export function produktAusEingabe(wert: "pve" | "pbs" | "pmg" | null | undefined): Produkt | null {
  if (!wert) return null;
  return wert === "pve" ? "PVE" : wert === "pbs" ? "PBS" : "PMG";
}

/**
 * Wandelt Datumsangaben von Proxmox um: `YYYY-MM-DD`, ISO-Zeitstempel oder Unix-Sekunden.
 * Ungültige Werte ergeben `null` statt eines Fehlers.
 */
export function datumAusProxmox(wert: string | number | null | undefined): Date | null {
  if (wert === null || wert === undefined || wert === "") return null;

  if (typeof wert === "number") {
    const ausSekunden = new Date(wert * 1000);
    return Number.isNaN(ausSekunden.getTime()) ? null : ausSekunden;
  }

  const text = wert.trim();
  if (/^\d+$/.test(text)) return datumAusProxmox(Number(text));

  const datum = /^\d{4}-\d{2}-\d{2}$/.test(text) ? new Date(`${text}T00:00:00Z`) : new Date(text);
  return Number.isNaN(datum.getTime()) ? null : datum;
}
