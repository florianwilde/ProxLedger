import { cookies, headers } from "next/headers";
import { eigeneAdresse } from "@/lib/adresse";
import { clientIp } from "@/lib/ratelimit";
import { cookieOptionen, SITZUNGS_COOKIE, sitzungErzeugen } from "@/lib/sitzung";
import { AnmeldeFehler, mitPasswortAnmelden } from "@/server/auth/benutzer";
import { einstellungen } from "@/server/einstellungen";

export const dynamic = "force-dynamic";

/**
 * Anmeldung als gewöhnliches Formular. Bewusst kein Server-Action-Weg: So funktioniert die
 * Anmeldung auch ohne JavaScript, und das Sitzungs-Cookie hängt an einer normalen Antwort.
 */
/**
 * Prüft, ob das Formular von der eigenen Oberfläche kam.
 *
 * Ohne diese Prüfung könnte eine fremde Seite ein Anmeldeformular auf dieses Dashboard abschicken
 * und das Opfer unbemerkt in ein untergeschobenes Konto anmelden (Login-CSRF, OWASP A01).
 * Server Actions in Next.js prüfen das selbst; dieser Endpunkt ist ein gewöhnliches Formular
 * und muss es daher selbst tun.
 */
export function herkunftStimmt(request: Request): boolean {
  const herkunft = request.headers.get("origin");
  // Formulare ohne Origin (etwa curl oder alte Browser) werden nicht ausgeschlossen –
  // der Schutz richtet sich gegen fremde Seiten, die immer einen Origin senden.
  if (!herkunft) return true;

  const erlaubt = new Set<string>();
  if (process.env.APP_URL) erlaubt.add(new URL(process.env.APP_URL).host);
  const gastgeber = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (gastgeber) erlaubt.add(gastgeber);

  try {
    return erlaubt.has(new URL(herkunft).host);
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const formular = await request.formData();
  const { dashboardUrl } = await einstellungen();
  const email = formular.get("email")?.toString().trim() ?? "";
  const passwort = formular.get("passwort")?.toString() ?? "";
  const zielEingabe = formular.get("ziel")?.toString() || "/";
  // Nur eigene Pfade zulassen, damit die Anmeldung nicht auf fremde Seiten führt.
  const ziel = zielEingabe.startsWith("/") && !zielEingabe.startsWith("//") ? zielEingabe : "/";

  function zurueckZurAnmeldung(meldung: string) {
    const adresse = eigeneAdresse(request, "/login", dashboardUrl);
    adresse.searchParams.set("fehler", meldung);
    if (ziel !== "/") adresse.searchParams.set("ziel", ziel);
    return Response.redirect(adresse, 303);
  }

  if (!herkunftStimmt(request)) {
    return zurueckZurAnmeldung("Die Anmeldung kam nicht von dieser Adresse.");
  }

  if (!email || !passwort) {
    return zurueckZurAnmeldung("E-Mail-Adresse und Passwort eingeben.");
  }

  try {
    const kopfzeilen = await headers();
    const benutzer = await mitPasswortAnmelden(email, passwort, clientIp(kopfzeilen));

    const { sitzungsdauerStunden } = await einstellungen();
    const token = await sitzungErzeugen(
      {
        benutzerId: benutzer.id,
        email: benutzer.email,
        name: benutzer.name,
        herkunft: "passwort",
      },
      sitzungsdauerStunden,
    );
    (await cookies()).set(SITZUNGS_COOKIE, token, cookieOptionen(sitzungsdauerStunden));

    return Response.redirect(eigeneAdresse(request, ziel, dashboardUrl), 303);
  } catch (fehler) {
    if (fehler instanceof AnmeldeFehler) return zurueckZurAnmeldung(fehler.message);
    console.error("Anmeldung fehlgeschlagen:", fehler);
    return zurueckZurAnmeldung("Anmeldung derzeit nicht möglich.");
  }
}
