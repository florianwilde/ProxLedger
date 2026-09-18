import type { Rolle } from "@/generated/prisma/enums";

/**
 * Wer darf was (#027).
 *
 * Die Rechte stehen bewusst als Liste an einer Stelle – nicht verteilt über Seiten und Aktionen.
 * Wer eine neue Aktion baut, sucht sich hier das passende Recht und prüft es, statt Rollen
 * einzeln abzufragen. Ein Recht kommt so nie versehentlich doppelt und unterschiedlich vor.
 */
export const RECHTE = {
  /** Hosts, Kunden, Laufzeiten, Rechnungen anlegen und ändern. */
  fachlichSchreiben: ["ADMIN", "TECHNIKER"],
  /** Notizen an einem Host und Quittieren einer Warnung – auch für Kunden. */
  mitarbeiten: ["ADMIN", "TECHNIKER", "KUNDE"],
  /** Agent-Tokens, Benachrichtigungen, Warnregeln. */
  betrieb: ["ADMIN", "TECHNIKER"],
  /** Systemeinstellungen, Benutzerverwaltung, Protokoll. */
  verwaltung: ["ADMIN"],
} as const satisfies Record<string, readonly Rolle[]>;

export type Recht = keyof typeof RECHTE;

export function darf(rolle: Rolle, recht: Recht): boolean {
  return (RECHTE[recht] as readonly Rolle[]).includes(rolle);
}

export const ROLLEN_TEXT: Record<Rolle, string> = {
  ADMIN: "Administrator",
  TECHNIKER: "Techniker",
  KUNDE: "Kunde",
};

export const ROLLEN_BESCHREIBUNG: Record<Rolle, string> = {
  ADMIN: "Darf alles, einschließlich Benutzerverwaltung und Systemeinstellungen.",
  TECHNIKER: "Darf alles Fachliche: Hosts, Kunden, Rechnungen, Tokens, Warnregeln – aber keine Benutzer anlegen.",
  KUNDE: "Sieht nur die eigenen Hosts und Rechnungen, ohne Einkaufspreise. Darf Notizen schreiben und Warnungen quittieren.",
};
