import { cookies } from "next/headers";
import { cookieOptionen, SITZUNGS_COOKIE, sitzungErzeugen, ueberHttps } from "@/lib/sitzung";
import { prisma } from "@/lib/db";
import { protokolliere } from "@/server/audit";
import { anmeldungPruefen, anmeldungVorbereiten, herkunft } from "@/server/auth/passkeys";
import { einstellungen } from "@/server/einstellungen";

export const dynamic = "force-dynamic";

const CHALLENGE_COOKIE = "pl_passkey_anmeldung";

function challengeOptionen() {
  return {
    httpOnly: true,
    sameSite: "strict" as const,
    secure: ueberHttps(),
    path: "/",
    maxAge: 300,
  };
}

/** Schritt 1: Aufgabe für die Anmeldung erzeugen – ohne Benutzernamen, der Browser wählt den Schlüssel. */
export async function GET(request: Request) {
  const optionen = await anmeldungVorbereiten(await herkunft(request));
  (await cookies()).set(CHALLENGE_COOKIE, optionen.challenge, challengeOptionen());
  return Response.json(optionen);
}

/** Schritt 2: Antwort prüfen und die Sitzung anlegen. */
export async function POST(request: Request) {
  const speicher = await cookies();
  const challenge = speicher.get(CHALLENGE_COOKIE)?.value;
  if (!challenge) {
    return Response.json({ fehler: "Die Aufgabe ist abgelaufen. Bitte erneut versuchen." }, { status: 400 });
  }

  try {
    const antwort = await request.json();
    const benutzer = await anmeldungPruefen(antwort, challenge, await herkunft(request));

    const { sitzungsdauerStunden } = await einstellungen();
    const token = await sitzungErzeugen(
      {
        benutzerId: benutzer.id,
        email: benutzer.email,
        name: benutzer.name,
        herkunft: "passkey",
      },
      sitzungsdauerStunden,
    );
    speicher.set(SITZUNGS_COOKIE, token, cookieOptionen(sitzungsdauerStunden));

    await prisma.benutzer.update({ where: { id: benutzer.id }, data: { letzterLoginAm: new Date() } });
    await protokolliere("anmeldung.erfolgreich", "Benutzer", benutzer.id, { weg: "passkey" });

    return Response.json({ erfolg: true });
  } catch (fehler) {
    console.error("Passkey-Anmeldung fehlgeschlagen:", fehler);
    // Bewusst unscharf: Ob es den Passkey gibt, geht einen Unbekannten nichts an.
    return Response.json({ fehler: "Anmeldung mit diesem Passkey nicht möglich." }, { status: 400 });
  } finally {
    speicher.delete(CHALLENGE_COOKIE);
  }
}
