"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eigenerPfad } from "@/lib/adresse";
import { SITZUNGS_COOKIE } from "@/lib/sitzung";
import { protokolliere } from "@/server/audit";
import { einstellungen } from "@/server/einstellungen";

/** Abmelden aus dem Benutzermenü. Die Anmeldung selbst läuft über /api/auth/anmelden. */
export async function abmelden() {
  (await cookies()).delete(SITZUNGS_COOKIE);
  await protokolliere("abmeldung", "Benutzer", null, {});

  const { dashboardUrl } = await einstellungen();
  redirect(await eigenerPfad("/login", dashboardUrl));
}
