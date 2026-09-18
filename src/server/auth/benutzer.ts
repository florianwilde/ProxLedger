import { verify } from "@node-rs/argon2";
import type { BenutzerModel } from "@/generated/prisma/models";
import { prisma } from "@/lib/db";
import { RateLimit } from "@/lib/ratelimit";
import { protokolliere } from "@/server/audit";
import { domaeneErlaubt, einstellungen } from "@/server/einstellungen";

/**
 * Anmeldeversuche je Kennung und Viertelstunde. Die Zahl steht in den Einstellungen;
 * für jede Einstellung wird eine eigene Bremse gehalten, damit der Zustand beim Ändern
 * nicht verlorengeht.
 */
const bremsen = new Map<number, RateLimit>();

export function anmeldeBremse(versuche: number): RateLimit {
  const vorhanden = bremsen.get(versuche);
  if (vorhanden) return vorhanden;

  const neu = new RateLimit(versuche, versuche / 900);
  bremsen.set(versuche, neu);
  return neu;
}

/** Vorgabe für Aufrufer ohne Einstellungen (Tests). */
export const anmeldeRateLimit = anmeldeBremse(5);

export class AnmeldeFehler extends Error {}

/** Prüft E-Mail und Passwort. Fehlermeldungen verraten bewusst nicht, welcher Teil falsch war. */
export async function mitPasswortAnmelden(
  email: string,
  passwort: string,
  quelle: string,
): Promise<BenutzerModel> {
  const { anmeldeversuche } = await einstellungen();
  const kennung = `${quelle}:${email.toLowerCase()}`;
  if (!anmeldeBremse(anmeldeversuche).pruefe(kennung).erlaubt) {
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
 * Ob ein unbekanntes Konto angelegt werden darf und welche E-Mail-Domänen zugelassen sind,
 * steht in den Einstellungen (#025). Vorgabe bleibt: anlegen, alle Domänen.
 */
export async function mitOidcAnmelden(subject: string, email: string, name: string): Promise<BenutzerModel> {
  const normalisiert = email.toLowerCase().trim();
  const { oidcDomaenen, oidcKontenAnlegen, oidcStandardRolle } = await einstellungen();

  if (!domaeneErlaubt(normalisiert, oidcDomaenen)) {
    await protokolliere("anmeldung.abgelehnt", "Benutzer", null, { email: normalisiert, grund: "domaene" });
    throw new AnmeldeFehler("Diese E-Mail-Domäne ist für die Anmeldung nicht zugelassen.");
  }

  const vorhanden =
    (await prisma.benutzer.findUnique({ where: { oidcSubject: subject } })) ??
    (await prisma.benutzer.findUnique({ where: { email: normalisiert } }));

  if (vorhanden && !vorhanden.aktiv) {
    throw new AnmeldeFehler("Dieses Konto ist deaktiviert.");
  }

  if (!vorhanden && !oidcKontenAnlegen) {
    await protokolliere("anmeldung.abgelehnt", "Benutzer", null, { email: normalisiert, grund: "kein-konto" });
    throw new AnmeldeFehler("Für diese Adresse gibt es hier kein Konto.");
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
          rolle: oidcStandardRolle,
          letzterLoginAm: new Date(),
        },
      });

  await protokolliere("anmeldung.erfolgreich", "Benutzer", benutzer.id, {
    weg: "oidc",
    neuAngelegt: vorhanden === null,
    ...(vorhanden === null ? { rolle: oidcStandardRolle } : {}),
  });

  return benutzer;
}
