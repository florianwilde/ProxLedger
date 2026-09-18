import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { Rolle } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { type GeleseneSitzung, SITZUNGS_COOKIE, sitzungLesen } from "@/lib/sitzung";
import { darf, type Recht } from "./rollen";

/**
 * Verlangt eine gültige Sitzung und prüft sie gegen die Datenbank.
 *
 * `proxy.ts` hält Unangemeldete von den Seiten fern, aber Server Actions sind eigene
 * Endpunkte: Jede Aktion prüft deshalb selbst, statt sich auf eine einzige Schicht zu
 * verlassen (OWASP A01 – Broken Access Control).
 *
 * Rolle und Kundenbindung kommen **aus der Datenbank**, nicht aus dem Token: Eine geänderte
 * Rolle wirkt damit sofort und nicht erst nach Ablauf der Sitzung.
 */

export interface AngemeldeterBenutzer extends GeleseneSitzung {
  rolle: Rolle;
  /** Nur bei der Rolle KUNDE gesetzt: der Kunde, dessen Daten sichtbar sind. */
  kundeId: string | null;
}

/** Reines Urteil über eine gelesene Sitzung – ohne Next.js, damit es sich prüfen lässt. */
export function sitzungBewerten(
  sitzung: GeleseneSitzung | null,
  benutzer: { aktiv: boolean; sitzungenUngueltigAb: Date | null } | null,
): { gueltig: true } | { gueltig: false; grund: string } {
  if (!sitzung) return { gueltig: false, grund: "Bitte anmelden." };
  if (!benutzer) return { gueltig: false, grund: "Dieses Konto gibt es nicht mehr." };
  if (!benutzer.aktiv) return { gueltig: false, grund: "Dieses Konto ist gesperrt." };
  if (benutzer.sitzungenUngueltigAb && sitzung.ausgestelltAm <= benutzer.sitzungenUngueltigAb) {
    return { gueltig: false, grund: "Die Sitzung wurde beendet. Bitte neu anmelden." };
  }
  return { gueltig: true };
}

/**
 * Liest die aktuelle Anmeldung, ohne weiterzuleiten – für Stellen, die auch ohne Sitzung
 * funktionieren müssen (Worker, Skripte, Audit-Log). `cache` sorgt dafür, dass eine Anfrage
 * die Datenbank nur einmal dafür befragt.
 */
export const angemeldet = cache(async (): Promise<AngemeldeterBenutzer | null> => {
  let sitzung: GeleseneSitzung | null = null;
  try {
    sitzung = await sitzungLesen((await cookies()).get(SITZUNGS_COOKIE)?.value);
  } catch {
    // Außerhalb einer Anfrage gibt es keine Cookies – das ist kein Fehler.
    return null;
  }
  if (!sitzung) return null;

  const benutzer = await prisma.benutzer.findUnique({
    where: { id: sitzung.benutzerId },
    select: { aktiv: true, sitzungenUngueltigAb: true, rolle: true, kundeId: true },
  });

  if (!sitzungBewerten(sitzung, benutzer).gueltig || !benutzer) return null;

  return { ...sitzung, rolle: benutzer.rolle, kundeId: benutzer.kundeId };
});

/**
 * Verlangt eine Anmeldung und – falls angegeben – ein bestimmtes Recht.
 * Ohne Anmeldung geht es zur Anmeldeseite, bei fehlendem Recht auf die Startseite.
 */
export async function sitzungErforderlich(recht?: Recht): Promise<AngemeldeterBenutzer> {
  const benutzer = await angemeldet();
  if (!benutzer) redirect("/login?fehler=Bitte+anmelden.");

  if (recht && !darf(benutzer.rolle, recht)) {
    redirect("/?fehler=Für+diesen+Bereich+fehlt+die+Berechtigung.");
  }

  return benutzer;
}

/**
 * Auf welchen Kunden die Sicht eingeschränkt ist – `null` heißt: alles sichtbar.
 *
 * Die Abfragen rufen das selbst auf, statt sich eine Einschränkung von der Seite reichen zu lassen.
 * So kann keine Seite vergessen, sie weiterzugeben – der häufigste Weg, wie solche Sichten lecken.
 */
export async function sichtbarerKunde(): Promise<string | null> {
  const benutzer = await angemeldet();
  if (!benutzer || benutzer.rolle !== "KUNDE") return null;

  // Ein Kundenkonto ohne Kundenbindung darf nichts sehen – nicht alles.
  return benutzer.kundeId ?? "kein-kunde-zugeordnet";
}

/** Dürfen Einkaufspreise und Marge angezeigt werden? */
export async function darfEinkaufSehen(): Promise<boolean> {
  const benutzer = await angemeldet();
  return benutzer?.rolle !== "KUNDE";
}
