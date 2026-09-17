import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { SITZUNGS_COOKIE, sitzungLesen } from "@/lib/sitzung";

/**
 * Schreibt einen Eintrag ins Audit-Log. Läuft die Aktion in einer Anfrage, wird der angemeldete
 * Benutzer vermerkt; im Worker oder in Skripten bleibt das Feld leer („System“).
 */
async function angemeldeterBenutzer(): Promise<string | null> {
  try {
    const sitzung = await sitzungLesen((await cookies()).get(SITZUNGS_COOKIE)?.value);
    return sitzung?.benutzerId ?? null;
  } catch {
    // Außerhalb einer Anfrage gibt es keine Cookies – das ist kein Fehler.
    return null;
  }
}

export async function protokolliere(
  aktion: string,
  entitaet: string,
  entitaetId: string | null,
  aenderung?: Record<string, unknown>,
) {
  const benutzerId = await angemeldeterBenutzer();

  await prisma.auditEintrag.create({
    data: {
      benutzerId,
      aktion,
      entitaet,
      entitaetId,
      aenderung: aenderung ? JSON.parse(JSON.stringify(aenderung)) : undefined,
    },
  });
}
