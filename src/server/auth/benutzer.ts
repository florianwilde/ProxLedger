import { verify } from "@node-rs/argon2";
import type { BenutzerModel } from "@/generated/prisma/models";
import { prisma } from "@/lib/db";
import { RateLimit } from "@/lib/ratelimit";
import { protokolliere } from "@/server/audit";

/** Anmeldeversuche: fünf pro Viertelstunde je Kennung, damit Raten teuer wird. */
export const anmeldeRateLimit = new RateLimit(5, 5 / 900);

export class AnmeldeFehler extends Error {}

/** Prüft E-Mail und Passwort. Fehlermeldungen verraten bewusst nicht, welcher Teil falsch war. */
export async function mitPasswortAnmelden(
  email: string,
  passwort: string,
  quelle: string,
): Promise<BenutzerModel> {
  const kennung = `${quelle}:${email.toLowerCase()}`;
  if (!anmeldeRateLimit.pruefe(kennung).erlaubt) {
    throw new AnmeldeFehler("Zu viele Versuche. Bitte einige Minuten warten.");
  }

  const benutzer = await prisma.benutzer.findUnique({ where: { email: email.toLowerCase().trim() } });

  if (!benutzer?.passwortHash || !benutzer.aktiv) {
    await protokolliere("anmeldung.fehlgeschlagen", "Benutzer", benutzer?.id ?? null, { email });
    throw new AnmeldeFehler("E-Mail-Adresse oder Passwort stimmt nicht.");
  }

  const stimmt = await verify(benutzer.passwortHash, passwort).catch(() => false);
  if (!stimmt) {
    await protokolliere("anmeldung.fehlgeschlagen", "Benutzer", benutzer.id, { email });
    throw new AnmeldeFehler("E-Mail-Adresse oder Passwort stimmt nicht.");
  }

  await prisma.benutzer.update({ where: { id: benutzer.id }, data: { letzterLoginAm: new Date() } });
  await protokolliere("anmeldung.erfolgreich", "Benutzer", benutzer.id, { weg: "passwort" });

  return benutzer;
}

/**
 * Ordnet eine OIDC-Anmeldung einem Benutzer zu: erst über die Subject-ID, sonst über die E-Mail.
 * Ein unbekanntes Konto wird angelegt – wer sich bei authentik anmelden darf, darf auch hier arbeiten.
 */
export async function mitOidcAnmelden(subject: string, email: string, name: string): Promise<BenutzerModel> {
  const normalisiert = email.toLowerCase().trim();

  const vorhanden =
    (await prisma.benutzer.findUnique({ where: { oidcSubject: subject } })) ??
    (await prisma.benutzer.findUnique({ where: { email: normalisiert } }));

  if (vorhanden && !vorhanden.aktiv) {
    throw new AnmeldeFehler("Dieses Konto ist deaktiviert.");
  }

  const benutzer = vorhanden
    ? await prisma.benutzer.update({
        where: { id: vorhanden.id },
        data: { oidcSubject: subject, name: name || vorhanden.name, letzterLoginAm: new Date() },
      })
    : await prisma.benutzer.create({
        data: {
          email: normalisiert,
          name: name || normalisiert,
          oidcSubject: subject,
          letzterLoginAm: new Date(),
        },
      });

  await protokolliere("anmeldung.erfolgreich", "Benutzer", benutzer.id, {
    weg: "oidc",
    neuAngelegt: vorhanden === null,
  });

  return benutzer;
}
