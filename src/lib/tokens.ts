import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * API-Tokens für Agents. In der Datenbank liegt ausschließlich der SHA-256-Hash:
 * Die Tokens haben volle Entropie (32 Byte Zufall), deshalb ist kein langsames
 * Passwort-Hashing nötig – SHA-256 erlaubt zudem das direkte Nachschlagen per Index.
 */

export const PRAEFIX_ENROLLMENT = "plx_e_";
export const PRAEFIX_HOST = "plx_h_";

export interface ErzeugterToken {
  /** Vollständiger Token im Klartext – wird nur einmal ausgegeben. */
  klartext: string;
  hash: string;
  /** Erkennbarer Anfang für Anzeige und Protokoll, z. B. `plx_h_9f3a2b`. */
  praefix: string;
}

export function erzeugeToken(typ: "enrollment" | "host"): ErzeugterToken {
  const kennung = typ === "enrollment" ? PRAEFIX_ENROLLMENT : PRAEFIX_HOST;
  const zufall = randomBytes(32).toString("base64url");
  const klartext = `${kennung}${zufall}`;
  return {
    klartext,
    hash: hashToken(klartext),
    praefix: klartext.slice(0, kennung.length + 6),
  };
}

export function hashToken(klartext: string): string {
  return createHash("sha256").update(klartext.trim()).digest("hex");
}

/** Vergleicht zwei Hashes ohne zeitliche Seitenkanäle. */
export function hashGleich(a: string, b: string): boolean {
  const links = Buffer.from(a, "hex");
  const rechts = Buffer.from(b, "hex");
  if (links.length !== rechts.length || links.length === 0) return false;
  return timingSafeEqual(links, rechts);
}

/** Liest den Bearer-Token aus dem Authorization-Header. */
export function tokenAusHeader(header: string | null): string | null {
  if (!header) return null;
  const treffer = /^Bearer\s+(.+)$/i.exec(header.trim());
  return treffer ? treffer[1].trim() : null;
}
