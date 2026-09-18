import { z } from "zod";
import { prisma } from "@/lib/db";

/**
 * Betriebseinstellungen, die sich im Dashboard ändern lassen (#025).
 *
 * Alles liegt in **einer** Zeile der Tabelle `Einstellung` als JSON – so ist ein Speichern
 * ein einziger Schreibvorgang, und fehlende Felder bekommen ihren Vorgabewert.
 *
 * Bewusst **nicht** hier: `APP_SECRET` und `DATABASE_URL`. Die braucht die Anwendung, bevor sie
 * die Datenbank überhaupt lesen kann; sie bleiben in der Umgebung.
 */

const SCHLUESSEL = "system";

export const einstellungenSchema = z.object({
  // --- Adresse und Agent ---
  /** Adresse, die im Installations-Einzeiler und in Benachrichtigungen steht. Leer = aus `APP_URL`. */
  dashboardUrl: z.union([z.string().url("Bitte eine vollständige Adresse angeben."), z.literal("")]).default(""),
  agentRhythmus: z.enum(["taeglich", "zwoelfstuendlich", "stuendlich"]).default("taeglich"),
  /** Zufällige Verzögerung, damit nicht alle Hosts gleichzeitig melden. */
  agentStreuungStunden: z.number().int().min(0).max(12).default(4),
  agentAutoUpdate: z.boolean().default(false),

  // --- Kaufmännisches ---
  waehrung: z.enum(["EUR", "CHF"]).default("EUR"),
  steuersatz: z.number().min(0).max(100).default(19),
  zahlungszielTage: z.number().int().min(0).max(120).default(14),
  /** Vorschlag für den Aufschlag auf den Einkaufspreis beim Anlegen einer Kundenrechnung. */
  margeProzent: z.number().min(0).max(500).default(20),

  // --- Sicherheit ---
  sitzungsdauerStunden: z.number().int().min(1).max(168).default(12),
  anmeldeversuche: z.number().int().min(3).max(50).default(5),
  /** Komma-getrennte Liste erlaubter E-Mail-Domänen für OIDC. Leer = alle. */
  oidcDomaenen: z.string().default(""),
  /** Darf sich jemand ohne vorhandenes Konto über OIDC anmelden? */
  oidcKontenAnlegen: z.boolean().default(true),
  /**
   * Rolle für automatisch angelegte OIDC-Konten. Vorgabe ist bewusst TECHNIKER und nicht ADMIN:
   * Wer sich beim Identitätsanbieter anmelden kann, soll nicht nebenbei Administrator werden (#027).
   */
  oidcStandardRolle: z.enum(["ADMIN", "TECHNIKER", "KUNDE"]).default("TECHNIKER"),
  /** 0 = unbegrenzt aufbewahren. */
  aufbewahrungReportsTage: z.number().int().min(0).max(3650).default(365),
  aufbewahrungAuditTage: z.number().int().min(0).max(3650).default(730),

  // --- Firma und Darstellung ---
  firmaName: z.string().max(120).default(""),
  firmaAnschrift: z.string().max(400).default(""),
  firmaEmail: z.union([z.string().email("Keine gültige E-Mail-Adresse."), z.literal("")]).default(""),
  zeitzone: z.string().min(1).default("Europe/Berlin"),
});

export type Einstellungen = z.infer<typeof einstellungenSchema>;

export const VORGABEN: Einstellungen = einstellungenSchema.parse({});

/**
 * Kurzer Zwischenspeicher: Die Einstellungen werden bei fast jeder Anfrage gebraucht,
 * ändern sich aber selten. Zehn Sekunden reichen, damit eine Änderung sofort spürbar ist.
 */
let zwischenspeicher: { werte: Einstellungen; bis: number } | null = null;

export async function einstellungen(): Promise<Einstellungen> {
  if (zwischenspeicher && zwischenspeicher.bis > Date.now()) return zwischenspeicher.werte;

  const eintrag = await prisma.einstellung.findUnique({ where: { schluessel: SCHLUESSEL } });
  // Unbekannte oder kaputte Werte fallen auf die Vorgabe zurück, statt den Betrieb anzuhalten.
  const ergebnis = einstellungenSchema.safeParse(eintrag?.wert ?? {});
  const werte = ergebnis.success ? ergebnis.data : VORGABEN;

  zwischenspeicher = { werte, bis: Date.now() + 10_000 };
  return werte;
}

export async function einstellungenSpeichern(werte: Einstellungen): Promise<void> {
  await prisma.einstellung.upsert({
    where: { schluessel: SCHLUESSEL },
    create: { schluessel: SCHLUESSEL, wert: werte },
    update: { wert: werte },
  });
  zwischenspeicher = null;
}

/** Nur für Tests: erzwingt das nächste Lesen aus der Datenbank. */
export function zwischenspeicherLeeren(): void {
  zwischenspeicher = null;
}

/**
 * Fälligkeitsdatum, das ein leeres Rechnungsformular vorschlägt: heute plus Zahlungsziel.
 * Bewusst hier und nicht in der Seite – eine Komponente darf beim Rendern nicht die Uhr lesen.
 */
export async function faelligkeitsVorschlag(jetzt: Date = new Date()): Promise<string> {
  const { zahlungszielTage } = await einstellungen();
  return new Date(jetzt.getTime() + zahlungszielTage * 86_400_000).toISOString();
}

/** systemd-Angabe für den Melderhythmus des Agents. */
export function onCalendar(rhythmus: Einstellungen["agentRhythmus"]): string {
  switch (rhythmus) {
    case "stuendlich":
      return "hourly";
    case "zwoelfstuendlich":
      return "0/12:00:00";
    default:
      return "daily";
  }
}

/**
 * Prüft, ob eine E-Mail-Adresse zu den erlaubten OIDC-Domänen gehört.
 * Ohne Angabe ist jede Domäne erlaubt – so verhält es sich wie bisher.
 */
export function domaeneErlaubt(email: string, domaenen: string): boolean {
  const liste = domaenen
    .split(",")
    .map((eintrag) => eintrag.trim().toLowerCase().replace(/^@/, ""))
    .filter(Boolean);
  if (liste.length === 0) return true;

  const domaene = email.toLowerCase().split("@")[1] ?? "";
  return liste.includes(domaene);
}
