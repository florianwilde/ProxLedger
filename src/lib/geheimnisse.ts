import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

/**
 * Verschlüsselt einzelne Werte (SMTP-Passwort, Webhook-Geheimnis) mit AES-256-GCM.
 * Der Schlüssel wird aus `APP_SECRET` abgeleitet – wer eine Sicherung der Datenbank liest,
 * bekommt damit noch keine Zugangsdaten.
 *
 * Format: `plx1:<nonce>:<authTag>:<chiffrat>`, alle Teile base64url.
 * Werte ohne dieses Präfix gelten als Klartext aus der Zeit vor der Verschlüsselung und
 * werden beim nächsten Speichern umgeschlüsselt.
 */

const PRAEFIX = "plx1";
const SALZ = "proxledger-geheimnisse-v1";

export class GeheimnisFehler extends Error {}

function schluessel(): Buffer {
  const geheimnis = process.env.APP_SECRET;
  if (!geheimnis || geheimnis.length < 32) {
    throw new GeheimnisFehler("APP_SECRET fehlt oder ist zu kurz (mindestens 32 Zeichen).");
  }
  return scryptSync(geheimnis, SALZ, 32);
}

export function verschluesseln(klartext: string): string {
  if (klartext === "") return "";

  const nonce = randomBytes(12);
  const chiffre = createCipheriv("aes-256-gcm", schluessel(), nonce);
  const daten = Buffer.concat([chiffre.update(klartext, "utf8"), chiffre.final()]);

  return [
    PRAEFIX,
    nonce.toString("base64url"),
    chiffre.getAuthTag().toString("base64url"),
    daten.toString("base64url"),
  ].join(":");
}

export function istVerschluesselt(wert: string): boolean {
  return wert.startsWith(`${PRAEFIX}:`);
}

/**
 * Entschlüsselt einen Wert. Unverschlüsselte Werte kommen unverändert zurück –
 * so funktionieren bestehende Installationen ohne Wartungsschritt weiter.
 */
export function entschluesseln(wert: string): string {
  if (!wert || !istVerschluesselt(wert)) return wert;

  const [, nonce, authTag, daten] = wert.split(":");
  if (!nonce || !authTag || !daten) {
    throw new GeheimnisFehler("Der gespeicherte Wert ist unvollständig.");
  }

  try {
    const chiffre = createDecipheriv("aes-256-gcm", schluessel(), Buffer.from(nonce, "base64url"));
    chiffre.setAuthTag(Buffer.from(authTag, "base64url"));
    return Buffer.concat([chiffre.update(Buffer.from(daten, "base64url")), chiffre.final()]).toString("utf8");
  } catch {
    // Häufigste Ursache: APP_SECRET wurde geändert.
    throw new GeheimnisFehler(
      "Der Wert lässt sich nicht entschlüsseln. Wurde APP_SECRET geändert? Dann die Zugangsdaten neu eintragen.",
    );
  }
}
