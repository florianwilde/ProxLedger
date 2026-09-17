import { NextResponse, type NextRequest } from "next/server";
import { SITZUNGS_COOKIE, sitzungLesen } from "@/lib/sitzung";

/**
 * Schützt die Oberfläche: Ohne gültige Sitzung führt jeder Weg zur Anmeldung.
 * Die Agent-API bleibt bewusst außen vor – sie authentifiziert sich mit eigenen Tokens.
 * (In Next 16 heißt diese Datei `proxy.ts`, früher `middleware.ts`.)
 */

const OEFFENTLICH = [
  "/login",
  "/api/auth",
  "/api/agent",
  "/api/gesundheit",
  "/install.sh",
  "/agent.sh",
  "/favicon.ico",
  "/icon.svg",
];

export async function proxy(request: NextRequest) {
  const pfad = request.nextUrl.pathname;

  if (OEFFENTLICH.some((eintrag) => pfad === eintrag || pfad.startsWith(`${eintrag}/`))) {
    return NextResponse.next();
  }

  const sitzung = await sitzungLesen(request.cookies.get(SITZUNGS_COOKIE)?.value);
  if (sitzung) return NextResponse.next();

  const ziel = new URL("/login", request.url);
  if (pfad !== "/") ziel.searchParams.set("ziel", `${pfad}${request.nextUrl.search}`);
  return NextResponse.redirect(ziel);
}

export const config = {
  // Statische Dateien und Bilder brauchen keine Prüfung.
  matcher: ["/((?!_next/static|_next/image|.*\\.(?:png|jpg|svg|ico|woff2)$).*)"],
};
