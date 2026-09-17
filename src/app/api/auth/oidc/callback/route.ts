import { cookies } from "next/headers";
import { cookieOptionen, SITZUNGS_COOKIE, sitzungErzeugen } from "@/lib/sitzung";
import { mitOidcAnmelden } from "@/server/auth/benutzer";
import { anmeldungAbschliessen, oidcEinstellungen } from "@/server/auth/oidc";

export const dynamic = "force-dynamic";

/** Nimmt die Rückkehr vom Anmeldedienst entgegen und legt die Sitzung an. */
export async function GET(request: Request) {
  const einstellungen = oidcEinstellungen();
  const speicher = await cookies();
  const pruefwert = speicher.get("pl_oidc_pruefwert")?.value;
  const zustand = speicher.get("pl_oidc_zustand")?.value;
  const ziel = speicher.get("pl_oidc_ziel")?.value ?? "/";

  for (const name of ["pl_oidc_pruefwert", "pl_oidc_zustand", "pl_oidc_ziel"]) {
    speicher.delete(name);
  }

  if (!einstellungen || !pruefwert || !zustand) {
    return Response.redirect(new URL("/login?fehler=oidc", request.url), 302);
  }

  try {
    const angaben = await anmeldungAbschliessen(einstellungen, new URL(request.url), pruefwert, zustand);
    const benutzer = await mitOidcAnmelden(angaben.subject, angaben.email, angaben.name);

    const token = await sitzungErzeugen({
      benutzerId: benutzer.id,
      email: benutzer.email,
      name: benutzer.name,
      herkunft: "oidc",
    });
    speicher.set(SITZUNGS_COOKIE, token, cookieOptionen());

    return Response.redirect(new URL(ziel.startsWith("/") ? ziel : "/", request.url), 302);
  } catch (fehler) {
    console.error("OIDC-Rückkehr fehlgeschlagen:", fehler);
    return Response.redirect(new URL("/login?fehler=oidc", request.url), 302);
  }
}
