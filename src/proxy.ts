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
  // Symbole und Manifest: Der Browser holt sie auch vor der Anmeldung.
  "/favicon.ico",
  "/icon.svg",
  "/apple-icon.png",
  "/icon-192.png",
  "/icon-512.png",
  "/manifest.webmanifest",
];

/**
 * Content-Security-Policy je Anfrage, mit frischem Nonce.
 *
 * `strict-dynamic` heißt: Nur Skripte mit diesem Nonce dürfen laufen (und was sie selbst nachladen).
 * Damit läuft eingeschleustes `<script>` aus der Datenbank oder einer Proxmox-Ausgabe nicht mehr –
 * die zweite Verteidigungslinie hinter der Maskierung durch React (OWASP A03).
 *
 * `style-src` erlaubt bewusst `unsafe-inline`: Bootstrap und AdminLTE setzen Stile direkt am Element,
 * und ein Stil kann keinen Code ausführen.
 */
function richtlinie(nonce: string): string {
  const entwicklung = process.env.NODE_ENV !== "production";
  return [
    "default-src 'self'",
    // In der Entwicklung braucht der Hot-Reload eval; im Betrieb nicht.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${entwicklung ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    // Verbindungen nur zur eigenen Herkunft; in der Entwicklung zusätzlich der Hot-Reload.
    `connect-src 'self'${entwicklung ? " ws: wss:" : ""}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(entwicklung ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

function mitRichtlinie(request: NextRequest, antwort?: NextResponse): NextResponse {
  const nonce = crypto.randomUUID().replaceAll("-", "");
  const csp = richtlinie(nonce);

  // Next.js versieht seine eigenen Skripte mit diesem Nonce, sobald es ihn in der Anfrage findet.
  const kopfzeilen = new Headers(request.headers);
  kopfzeilen.set("x-nonce", nonce);
  kopfzeilen.set("Content-Security-Policy", csp);

  const ergebnis = antwort ?? NextResponse.next({ request: { headers: kopfzeilen } });
  ergebnis.headers.set("Content-Security-Policy", csp);
  return ergebnis;
}

export async function proxy(request: NextRequest) {
  const pfad = request.nextUrl.pathname;

  if (OEFFENTLICH.some((eintrag) => pfad === eintrag || pfad.startsWith(`${eintrag}/`))) {
    return mitRichtlinie(request);
  }

  const sitzung = await sitzungLesen(request.cookies.get(SITZUNGS_COOKIE)?.value);
  if (sitzung) return mitRichtlinie(request);

  const ziel = new URL("/login", request.url);
  if (pfad !== "/") ziel.searchParams.set("ziel", `${pfad}${request.nextUrl.search}`);
  return mitRichtlinie(request, NextResponse.redirect(ziel));
}

export const config = {
  // Statische Dateien und Bilder brauchen keine Prüfung.
  matcher: ["/((?!_next/static|_next/image|.*\\.(?:png|jpg|svg|ico|woff2)$).*)"],
};
