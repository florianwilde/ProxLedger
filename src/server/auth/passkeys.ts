import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import type { AuthenticationResponseJSON, RegistrationResponseJSON } from "@simplewebauthn/server";
import { prisma } from "@/lib/db";
import { oeffentlicheBasis } from "@/lib/adresse";
import { einstellungen } from "@/server/einstellungen";

/**
 * Passkeys (WebAuthn) als gleichwertiger Anmeldeweg neben Passwort und OIDC (#028).
 *
 * Ein Passkey ist an eine Domäne gebunden – deshalb entscheidet die **öffentliche** Adresse über
 * `rpID` und `origin`. Steht dort die falsche Adresse, lehnt der Browser die Anmeldung wortlos ab.
 *
 * Voraussetzung ist ein sicherer Kontext: HTTPS, oder `localhost` zum Ausprobieren.
 */

export interface Herkunft {
  rpID: string;
  origin: string;
}

export async function herkunft(request: Request): Promise<Herkunft> {
  const { dashboardUrl } = await einstellungen();
  const basis = oeffentlicheBasis(request, dashboardUrl);
  return { rpID: basis.hostname, origin: basis.origin };
}

/** Ist die Adresse für Passkeys geeignet? Ohne HTTPS geht es nur auf localhost. */
export function passkeysMoeglich(origin: string): boolean {
  try {
    const adresse = new URL(origin);
    return (
      adresse.protocol === "https:" || adresse.hostname === "localhost" || adresse.hostname === "127.0.0.1"
    );
  } catch {
    return false;
  }
}

export async function registrierungVorbereiten(benutzerId: string, herkunft: Herkunft) {
  const benutzer = await prisma.benutzer.findUniqueOrThrow({
    where: { id: benutzerId },
    include: { passkeys: { select: { credentialId: true, transports: true } } },
  });

  return generateRegistrationOptions({
    rpName: "ProxLedger",
    rpID: herkunft.rpID,
    userName: benutzer.email,
    userDisplayName: benutzer.name,
    // Der Schlüssel soll im Gerät bleiben und ohne Eingabe des Benutzernamens funktionieren.
    authenticatorSelection: { residentKey: "preferred", userVerification: "preferred" },
    // Bereits registrierte Schlüssel ausschließen, damit niemand denselben zweimal anlegt.
    excludeCredentials: benutzer.passkeys.map((passkey) => ({
      id: passkey.credentialId,
      transports: passkey.transports as never,
    })),
  });
}

export async function registrierungAbschliessen(
  benutzerId: string,
  antwort: RegistrationResponseJSON,
  erwarteteChallenge: string,
  herkunft: Herkunft,
  bezeichnung: string,
) {
  const ergebnis = await verifyRegistrationResponse({
    response: antwort,
    expectedChallenge: erwarteteChallenge,
    expectedOrigin: herkunft.origin,
    expectedRPID: herkunft.rpID,
  });

  if (!ergebnis.verified || !ergebnis.registrationInfo) {
    throw new Error("Der Passkey ließ sich nicht überprüfen.");
  }

  const { credential } = ergebnis.registrationInfo;

  return prisma.passkey.create({
    data: {
      benutzerId,
      credentialId: credential.id,
      publicKey: Buffer.from(credential.publicKey),
      zaehler: BigInt(credential.counter),
      transports: credential.transports ?? [],
      bezeichnung: bezeichnung.trim() || "Passkey",
    },
  });
}

export async function anmeldungVorbereiten(herkunft: Herkunft) {
  return generateAuthenticationOptions({
    rpID: herkunft.rpID,
    // Keine Liste erlaubter Schlüssel: Der Browser bietet selbst an, was zu dieser Seite passt.
    userVerification: "preferred",
  });
}

export async function anmeldungPruefen(
  antwort: AuthenticationResponseJSON,
  erwarteteChallenge: string,
  herkunft: Herkunft,
) {
  const passkey = await prisma.passkey.findUnique({
    where: { credentialId: antwort.id },
    include: { benutzer: true },
  });
  if (!passkey) throw new Error("Dieser Passkey ist hier nicht hinterlegt.");
  if (!passkey.benutzer.aktiv) throw new Error("Dieses Konto ist gesperrt.");

  const ergebnis = await verifyAuthenticationResponse({
    response: antwort,
    expectedChallenge: erwarteteChallenge,
    expectedOrigin: herkunft.origin,
    expectedRPID: herkunft.rpID,
    credential: {
      id: passkey.credentialId,
      publicKey: new Uint8Array(passkey.publicKey),
      counter: Number(passkey.zaehler),
      transports: passkey.transports as never,
    },
  });

  if (!ergebnis.verified) throw new Error("Die Anmeldung ließ sich nicht überprüfen.");

  // Der Zähler steigt bei jeder Nutzung; ein Rückschritt wäre ein Hinweis auf einen kopierten
  // Schlüssel. simplewebauthn prüft das bereits – hier wird der neue Stand nur festgehalten.
  await prisma.passkey.update({
    where: { id: passkey.id },
    data: {
      zaehler: BigInt(ergebnis.authenticationInfo.newCounter),
      zuletztAm: new Date(),
    },
  });

  return passkey.benutzer;
}
