import { cookies } from "next/headers";
import { anmeldungStarten, oidcEinstellungen } from "@/server/auth/oidc";

export const dynamic = "force-dynamic";

/** Schickt den Browser zum Anmeldedienst und merkt sich PKCE-Prüfwert und Zustand im Cookie. */
export async function GET(request: Request) {
  const einstellungen = oidcEinstellungen();
  if (!einstellungen) {
    return Response.redirect(new URL("/login?fehler=oidc", request.url), 302);
  }

  const ziel = new URL(request.url).searchParams.get("ziel") ?? "/";

  try {
    const start = await anmeldungStarten(einstellungen);
    const speicher = await cookies();
    const optionen = {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 600,
    };

    speicher.set("pl_oidc_pruefwert", start.pruefwert, optionen);
    speicher.set("pl_oidc_zustand", start.zustand, optionen);
    speicher.set("pl_oidc_ziel", ziel.startsWith("/") ? ziel : "/", optionen);

    return Response.redirect(start.url, 302);
  } catch (fehler) {
    console.error("OIDC-Start fehlgeschlagen:", fehler);
    return Response.redirect(new URL("/login?fehler=oidc", request.url), 302);
  }
}
