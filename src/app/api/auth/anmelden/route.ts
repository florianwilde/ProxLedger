import { cookies, headers } from "next/headers";
import { clientIp } from "@/lib/ratelimit";
import { cookieOptionen, SITZUNGS_COOKIE, sitzungErzeugen } from "@/lib/sitzung";
import { AnmeldeFehler, mitPasswortAnmelden } from "@/server/auth/benutzer";

export const dynamic = "force-dynamic";

/**
 * Anmeldung als gewöhnliches Formular. Bewusst kein Server-Action-Weg: So funktioniert die
 * Anmeldung auch ohne JavaScript, und das Sitzungs-Cookie hängt an einer normalen Antwort.
 */
export async function POST(request: Request) {
  const formular = await request.formData();
  const email = formular.get("email")?.toString().trim() ?? "";
  const passwort = formular.get("passwort")?.toString() ?? "";
  const zielEingabe = formular.get("ziel")?.toString() || "/";
  // Nur eigene Pfade zulassen, damit die Anmeldung nicht auf fremde Seiten führt.
  const ziel = zielEingabe.startsWith("/") && !zielEingabe.startsWith("//") ? zielEingabe : "/";

  function zurueckZurAnmeldung(meldung: string) {
    const adresse = new URL("/login", request.url);
    adresse.searchParams.set("fehler", meldung);
    if (ziel !== "/") adresse.searchParams.set("ziel", ziel);
    return Response.redirect(adresse, 303);
  }

  if (!email || !passwort) {
    return zurueckZurAnmeldung("E-Mail-Adresse und Passwort eingeben.");
  }

  try {
    const kopfzeilen = await headers();
    const benutzer = await mitPasswortAnmelden(email, passwort, clientIp(kopfzeilen));

    const token = await sitzungErzeugen({
      benutzerId: benutzer.id,
      email: benutzer.email,
      name: benutzer.name,
      herkunft: "passwort",
    });
    (await cookies()).set(SITZUNGS_COOKIE, token, cookieOptionen());

    return Response.redirect(new URL(ziel, request.url), 303);
  } catch (fehler) {
    if (fehler instanceof AnmeldeFehler) return zurueckZurAnmeldung(fehler.message);
    console.error("Anmeldung fehlgeschlagen:", fehler);
    return zurueckZurAnmeldung("Anmeldung derzeit nicht möglich.");
  }
}
