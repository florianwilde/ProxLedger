import * as client from "openid-client";
import { einstellungen as systemEinstellungen } from "@/server/einstellungen";

/**
 * Anmeldung über OIDC (getestet mit authentik). Die Einrichtung erfolgt über Umgebungsvariablen,
 * damit Zugangsdaten nicht in der Datenbank liegen.
 */

export interface OidcEinstellungen {
  ausstellerUrl: string;
  clientId: string;
  clientSecret: string;
  /** Anzeigename auf dem Anmeldeknopf. */
  bezeichnung: string;
}

export function oidcEinstellungen(): OidcEinstellungen | null {
  const ausstellerUrl = process.env.OIDC_ISSUER;
  const clientId = process.env.OIDC_CLIENT_ID;
  const clientSecret = process.env.OIDC_CLIENT_SECRET;

  if (!ausstellerUrl || !clientId || !clientSecret) return null;

  return {
    ausstellerUrl,
    clientId,
    clientSecret,
    bezeichnung: process.env.OIDC_NAME ?? "authentik",
  };
}

/**
 * Adresse, an die der Anbieter zurückschickt. Sie muss beim Anbieter **wortgleich** hinterlegt sein.
 * Vorrang hat die eingetragene Dashboard-Adresse, dann `APP_URL` (#029).
 */
export async function rueckkehrAdresse(): Promise<string> {
  const { dashboardUrl } = await systemEinstellungen();
  const basis = (dashboardUrl || process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
  return `${basis}/api/auth/oidc/callback`;
}

async function konfiguration(einstellungen: OidcEinstellungen) {
  return client.discovery(
    new URL(einstellungen.ausstellerUrl),
    einstellungen.clientId,
    einstellungen.clientSecret,
  );
}

export interface AnmeldeStart {
  url: string;
  pruefwert: string;
  zustand: string;
}

/** Baut die Adresse beim Anbieter samt PKCE-Prüfwert. */
export async function anmeldungStarten(einstellungen: OidcEinstellungen): Promise<AnmeldeStart> {
  const konfig = await konfiguration(einstellungen);
  const pruefwert = client.randomPKCECodeVerifier();
  const herausforderung = await client.calculatePKCECodeChallenge(pruefwert);
  const zustand = client.randomState();

  const url = client.buildAuthorizationUrl(konfig, {
    redirect_uri: await rueckkehrAdresse(),
    scope: "openid email profile",
    code_challenge: herausforderung,
    code_challenge_method: "S256",
    state: zustand,
  });

  return { url: url.href, pruefwert, zustand };
}

export interface OidcBenutzer {
  subject: string;
  email: string;
  name: string;
}

/** Löst den Rückkehr-Code beim Anbieter ein und liest die Benutzerangaben. */
export async function anmeldungAbschliessen(
  einstellungen: OidcEinstellungen,
  aktuelleUrl: URL,
  pruefwert: string,
  zustand: string,
): Promise<OidcBenutzer> {
  const konfig = await konfiguration(einstellungen);

  const tokens = await client.authorizationCodeGrant(konfig, aktuelleUrl, {
    pkceCodeVerifier: pruefwert,
    expectedState: zustand,
  });

  const angaben = tokens.claims();
  if (!angaben?.sub) throw new Error("Der Anbieter hat keine Benutzerkennung geliefert.");

  const email = typeof angaben.email === "string" ? angaben.email : "";
  if (!email) throw new Error("Der Anbieter hat keine E-Mail-Adresse geliefert.");

  const name =
    (typeof angaben.name === "string" && angaben.name) ||
    (typeof angaben.preferred_username === "string" && angaben.preferred_username) ||
    email;

  return { subject: angaben.sub, email, name };
}
