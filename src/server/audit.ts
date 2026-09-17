import { prisma } from "@/lib/db";

/**
 * Schreibt einen Eintrag ins Audit-Log. Solange es keine Anmeldung gibt (#013),
 * bleibt `benutzerId` leer und die Änderung gilt als vom System ausgelöst.
 */
export async function protokolliere(
  aktion: string,
  entitaet: string,
  entitaetId: string | null,
  aenderung?: Record<string, unknown>,
) {
  await prisma.auditEintrag.create({
    data: {
      aktion,
      entitaet,
      entitaetId,
      aenderung: aenderung ? JSON.parse(JSON.stringify(aenderung)) : undefined,
    },
  });
}
