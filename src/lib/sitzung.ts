import { SignJWT, jwtVerify } from "jose";

/**
 * Sitzungen als signiertes Token im Cookie – kein Serverzustand nötig.
 * Der Schlüssel kommt aus `APP_SECRET`; ohne ihn startet die Anmeldung nicht.
 */

export const SITZUNGS_COOKIE = "pl_sitzung";
export const SITZUNGSDAUER_STUNDEN = 12;

export interface Sitzung {
  benutzerId: string;
  email: string;
  name: string;
  /** Woher die Anmeldung stammt – für das Audit-Log und die Anzeige. */
  herkunft: "passwort" | "oidc";
}

function schluessel(): Uint8Array {
  const geheimnis = process.env.APP_SECRET;
  if (!geheimnis || geheimnis.length < 32) {
    throw new Error(
      "APP_SECRET fehlt oder ist zu kurz (mindestens 32 Zeichen). Beispiel: openssl rand -base64 48",
    );
  }
  return new TextEncoder().encode(geheimnis);
}

export async function sitzungErzeugen(sitzung: Sitzung): Promise<string> {
  return new SignJWT({ ...sitzung })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(sitzung.benutzerId)
    .setIssuedAt()
    .setIssuer("proxledger")
    .setExpirationTime(`${SITZUNGSDAUER_STUNDEN}h`)
    .sign(schluessel());
}

/** Prüft das Token; bei ungültiger Signatur oder Ablauf kommt null zurück. */
export async function sitzungLesen(token: string | undefined): Promise<Sitzung | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, schluessel(), { issuer: "proxledger" });
    if (typeof payload.benutzerId !== "string" || typeof payload.email !== "string") return null;
    return {
      benutzerId: payload.benutzerId,
      email: payload.email,
      name: typeof payload.name === "string" ? payload.name : payload.email,
      herkunft: payload.herkunft === "oidc" ? "oidc" : "passwort",
    };
  } catch {
    return null;
  }
}

export function cookieOptionen() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SITZUNGSDAUER_STUNDEN * 3600,
  };
}
