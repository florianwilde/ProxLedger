import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { type GeleseneSitzung, SITZUNGS_COOKIE, sitzungLesen } from "@/lib/sitzung";

/**
 * Verlangt eine gültige Sitzung und prüft sie gegen die Datenbank.
 *
 * `proxy.ts` hält Unangemeldete von den Seiten fern, aber Server Actions sind eigene
 * Endpunkte: Jede Aktion prüft deshalb selbst, statt sich auf eine einzige Schicht zu
 * verlassen (OWASP A01 – Broken Access Control).
 *
 * Zusätzlich wirkt hier der Widerruf: Ein gesperrtes Konto oder ein zurückgesetztes
 * Passwort beendet laufende Sitzungen sofort, statt bis zum Ablauf des Tokens zu warten.
 */
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

export async function sitzungErforderlich(): Promise<GeleseneSitzung> {
  const sitzung = await sitzungLesen((await cookies()).get(SITZUNGS_COOKIE)?.value);

  const benutzer = sitzung
    ? await prisma.benutzer.findUnique({
        where: { id: sitzung.benutzerId },
        select: { aktiv: true, sitzungenUngueltigAb: true },
      })
    : null;

  const urteil = sitzungBewerten(sitzung, benutzer);
  if (!urteil.gueltig) redirect(`/login?fehler=${encodeURIComponent(urteil.grund)}`);

  return sitzung as GeleseneSitzung;
}
