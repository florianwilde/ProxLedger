import { cookies } from "next/headers";
import { ueberHttps } from "@/lib/sitzung";
import { protokolliere } from "@/server/audit";
import { angemeldet } from "@/server/auth/sitzungspflicht";
import { herkunft, registrierungAbschliessen, registrierungVorbereiten } from "@/server/auth/passkeys";

export const dynamic = "force-dynamic";

/** Die Aufgabe („challenge“) darf nur für diesen Browser und nur kurz gelten. */
const CHALLENGE_COOKIE = "pl_passkey_registrierung";

function challengeOptionen() {
  return {
    httpOnly: true,
    sameSite: "strict" as const,
    secure: ueberHttps(),
    path: "/",
    maxAge: 300,
  };
}

/** Schritt 1: Aufgabe erzeugen. */
export async function GET(request: Request) {
  const benutzer = await angemeldet();
  if (!benutzer) return new Response("Nicht angemeldet", { status: 401 });

  const optionen = await registrierungVorbereiten(benutzer.benutzerId, await herkunft(request));
  (await cookies()).set(CHALLENGE_COOKIE, optionen.challenge, challengeOptionen());

  return Response.json(optionen);
}

/** Schritt 2: Antwort des Browsers prüfen und den Passkey hinterlegen. */
export async function POST(request: Request) {
  const benutzer = await angemeldet();
  if (!benutzer) return new Response("Nicht angemeldet", { status: 401 });

  const speicher = await cookies();
  const challenge = speicher.get(CHALLENGE_COOKIE)?.value;
  if (!challenge) return Response.json({ fehler: "Die Aufgabe ist abgelaufen. Bitte erneut versuchen." }, { status: 400 });

  try {
    const { antwort, bezeichnung } = await request.json();
    const passkey = await registrierungAbschliessen(
      benutzer.benutzerId,
      antwort,
      challenge,
      await herkunft(request),
      typeof bezeichnung === "string" ? bezeichnung : "Passkey",
    );

    await protokolliere("passkey.angelegt", "Passkey", passkey.id, { bezeichnung: passkey.bezeichnung });
    return Response.json({ erfolg: true, bezeichnung: passkey.bezeichnung });
  } catch (fehler) {
    console.error("Passkey-Registrierung fehlgeschlagen:", fehler);
    return Response.json(
      { fehler: fehler instanceof Error ? fehler.message : "Der Passkey ließ sich nicht hinterlegen." },
      { status: 400 },
    );
  } finally {
    speicher.delete(CHALLENGE_COOKIE);
  }
}
