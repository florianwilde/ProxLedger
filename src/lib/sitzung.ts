import { SignJWT, jwtVerify } from "jose";

/**
 * Sitzungen als signiertes Token im Cookie – kein Serverzustand nötig.
 * Der Schlüssel kommt aus `APP_SECRET`; ohne ihn startet die Anmeldung nicht.
 */

export const SITZUNGS_COOKIE = "pl_sitzung";
/** Rückfall, solange nichts in den Einstellungen steht (#025). */
export const SITZUNGSDAUER_STUNDEN = 12;

/** Eine gelesene Sitzung weiß zusätzlich, wann sie ausgestellt wurde – nötig für den Widerruf. */
export interface GeleseneSitzung extends Sitzung {
  ausgestelltAm: Date;
}

export interface Sitzung {
  benutzerId: string;
  email: string;
  name: string;
  /** Woher die Anmeldung stammt – für das Audit-Log und die Anzeige. */
  herkunft: "passwort" | "oidc" | "passkey";
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

export async function sitzungErzeugen(
  sitzung: Sitzung,
  dauerStunden: number = SITZUNGSDAUER_STUNDEN,
): Promise<string> {
  return new SignJWT({ ...sitzung })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(sitzung.benutzerId)
    .setIssuedAt()
    .setIssuer("proxledger")
    .setExpirationTime(`${dauerStunden}h`)
    .sign(schluessel());
}

/** Prüft das Token; bei ungültiger Signatur oder Ablauf kommt null zurück. */
export async function sitzungLesen(token: string | undefined): Promise<GeleseneSitzung | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, schluessel(), { issuer: "proxledger" });
    if (typeof payload.benutzerId !== "string" || typeof payload.email !== "string") return null;
    return {
      benutzerId: payload.benutzerId,
      email: payload.email,
      name: typeof payload.name === "string" ? payload.name : payload.email,
      herkunft:
        payload.herkunft === "oidc" || payload.herkunft === "passkey" ? payload.herkunft : "passwort",
      ausgestelltAm: new Date((payload.iat ?? 0) * 1000),
    };
  } catch {
    return null;
  }
}

/**
 * `Secure` richtet sich nach der tatsächlichen Adresse, nicht nach NODE_ENV:
 * Ein produktiv gebautes Dashboard, das über http:// läuft (etwa im LAN oder beim lokalen Prüfen),
 * würde sonst ein Cookie setzen, das der Browser verwirft – die Anmeldung liefe dann ins Leere.
 */
export function ueberHttps(): boolean {
  const adresse = process.env.APP_URL;
  if (adresse) return adresse.startsWith("https://");
  return process.env.NODE_ENV === "production";
}

export function cookieOptionen(dauerStunden: number = SITZUNGSDAUER_STUNDEN) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: ueberHttps(),
    path: "/",
    maxAge: dauerStunden * 3600,
  };
}
