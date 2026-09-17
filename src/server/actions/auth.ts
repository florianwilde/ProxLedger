"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SITZUNGS_COOKIE } from "@/lib/sitzung";
import { protokolliere } from "@/server/audit";

/** Abmelden aus dem Benutzermenü. Die Anmeldung selbst läuft über /api/auth/anmelden. */
export async function abmelden() {
  (await cookies()).delete(SITZUNGS_COOKIE);
  await protokolliere("abmeldung", "Benutzer", null, {});
  redirect("/login");
}
