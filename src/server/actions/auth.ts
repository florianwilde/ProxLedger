"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cookieOptionen, SITZUNGS_COOKIE, sitzungErzeugen } from "@/lib/sitzung";
import { clientIp } from "@/lib/ratelimit";
import { protokolliere } from "@/server/audit";
import { AnmeldeFehler, mitPasswortAnmelden } from "@/server/auth/benutzer";
import type { AktionsErgebnis } from "./kunden";

/** Anmeldung mit E-Mail und Passwort (Rückfallweg, wenn OIDC nicht erreichbar ist). */
export async function anmelden(_vorher: AktionsErgebnis, formular: FormData): Promise<AktionsErgebnis> {
  const email = formular.get("email")?.toString().trim() ?? "";
  const passwort = formular.get("passwort")?.toString() ?? "";
  const ziel = formular.get("ziel")?.toString() || "/";

  if (!email || !passwort) {
    return { fehler: "Bitte E-Mail-Adresse und Passwort eingeben." };
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
  } catch (fehler) {
    if (fehler instanceof AnmeldeFehler) return { fehler: fehler.message };
    throw fehler;
  }

  // Nur eigene Pfade als Ziel zulassen, damit die Anmeldung nicht auf fremde Seiten führt.
  redirect(ziel.startsWith("/") && !ziel.startsWith("//") ? ziel : "/");
}

export async function abmelden() {
  const speicher = await cookies();
  speicher.delete(SITZUNGS_COOKIE);
  await protokolliere("abmeldung", "Benutzer", null, {});
  redirect("/login");
}
