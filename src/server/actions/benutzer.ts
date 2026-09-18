"use server";

import { hash } from "@node-rs/argon2";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { PASSWORT_MINDESTLAENGE } from "@/lib/passwort";
import { protokolliere } from "@/server/audit";
import { sitzungErforderlich } from "@/server/auth/sitzungspflicht";

export interface AktionsErgebnis {
  fehler?: string;
  felder?: Record<string, string>;
  erfolg?: string;
}

const benutzerSchema = z
  .object({
    email: z.string().email("Keine gültige E-Mail-Adresse."),
    name: z.string().min(2, "Bitte einen Namen angeben."),
    rolle: z.enum(["ADMIN", "TECHNIKER", "KUNDE"]),
    kundeId: z.string().nullable(),
    passwort: z
      .union([z.string().min(PASSWORT_MINDESTLAENGE, `Mindestens ${PASSWORT_MINDESTLAENGE} Zeichen.`), z.literal("")])
      .default(""),
  })
  .refine((werte) => werte.rolle !== "KUNDE" || werte.kundeId !== null, {
    message: "Ein Kundenkonto braucht einen Kunden.",
    path: ["kundeId"],
  });

function felderAus(fehler: z.ZodError): Record<string, string> {
  const felder: Record<string, string> = {};
  for (const eintrag of fehler.issues) {
    const feld = eintrag.path[0];
    if (typeof feld === "string" && !felder[feld]) felder[feld] = eintrag.message;
  }
  return felder;
}

function lesen(formular: FormData) {
  const rolle = formular.get("rolle")?.toString() ?? "TECHNIKER";
  return {
    email: formular.get("email")?.toString().trim().toLowerCase() ?? "",
    name: formular.get("name")?.toString().trim() ?? "",
    rolle,
    // Der Kunde zählt nur bei einem Kundenkonto; sonst wird er bewusst verworfen.
    kundeId: rolle === "KUNDE" ? formular.get("kundeId")?.toString() || null : null,
    passwort: formular.get("passwort")?.toString() ?? "",
  };
}

export async function benutzerAnlegen(
  _vorher: AktionsErgebnis,
  formular: FormData,
): Promise<AktionsErgebnis> {
  await sitzungErforderlich("verwaltung");

  const ergebnis = benutzerSchema.safeParse(lesen(formular));
  if (!ergebnis.success) return { fehler: "Bitte die Angaben prüfen.", felder: felderAus(ergebnis.error) };

  const { email, name, rolle, kundeId, passwort } = ergebnis.data;

  if (await prisma.benutzer.findUnique({ where: { email } })) {
    return { fehler: "Diese E-Mail-Adresse ist schon vergeben.", felder: { email: "Schon vergeben." } };
  }

  // Ohne Passwort entsteht ein Konto, das sich nur über OIDC oder einen Passkey anmelden kann.
  await prisma.benutzer.create({
    data: {
      email,
      name,
      rolle,
      kundeId,
      passwortHash: passwort ? await hash(passwort) : null,
    },
  });

  await protokolliere("benutzer.angelegt", "Benutzer", email, { rolle, kundeId, mitPasswort: Boolean(passwort) });
  revalidatePath("/einstellungen/benutzer");

  return { erfolg: `${name} wurde angelegt.` };
}

export async function benutzerSpeichern(
  _vorher: AktionsErgebnis,
  formular: FormData,
): Promise<AktionsErgebnis> {
  const ich = await sitzungErforderlich("verwaltung");

  const id = formular.get("id")?.toString();
  if (!id) return { fehler: "Benutzer nicht gefunden." };

  const ergebnis = benutzerSchema.safeParse(lesen(formular));
  if (!ergebnis.success) return { fehler: "Bitte die Angaben prüfen.", felder: felderAus(ergebnis.error) };

  const { email, name, rolle, kundeId, passwort } = ergebnis.data;

  // Wer sich selbst die Administratorrolle nimmt, sperrt sich aus der Verwaltung aus.
  if (id === ich.benutzerId && rolle !== "ADMIN") {
    return { fehler: "Die eigene Administratorrolle lässt sich nicht entziehen." };
  }

  const andere = await prisma.benutzer.findUnique({ where: { email } });
  if (andere && andere.id !== id) {
    return { fehler: "Diese E-Mail-Adresse gehört schon zu einem anderen Konto." };
  }

  await prisma.benutzer.update({
    where: { id },
    data: {
      email,
      name,
      rolle,
      kundeId,
      // Ein neues Passwort beendet bestehende Sitzungen – sonst liefe ein geklautes Token weiter.
      ...(passwort ? { passwortHash: await hash(passwort), sitzungenUngueltigAb: new Date() } : {}),
    },
  });

  await protokolliere("benutzer.geaendert", "Benutzer", id, { rolle, kundeId, passwortGesetzt: Boolean(passwort) });
  revalidatePath("/einstellungen/benutzer");

  return { erfolg: "Gespeichert." };
}

export async function benutzerSperreUmschalten(formular: FormData) {
  const ich = await sitzungErforderlich("verwaltung");

  const id = formular.get("id")?.toString();
  if (!id) return;
  if (id === ich.benutzerId) return; // sich selbst auszusperren hilft niemandem

  const benutzer = await prisma.benutzer.findUnique({ where: { id }, select: { aktiv: true } });
  if (!benutzer) return;

  await prisma.benutzer.update({
    where: { id },
    data: {
      aktiv: !benutzer.aktiv,
      // Beim Sperren laufende Sitzungen sofort beenden.
      ...(benutzer.aktiv ? { sitzungenUngueltigAb: new Date() } : {}),
    },
  });

  await protokolliere(benutzer.aktiv ? "benutzer.gesperrt" : "benutzer.freigegeben", "Benutzer", id, {});
  revalidatePath("/einstellungen/benutzer");
}

export async function benutzerLoeschen(formular: FormData) {
  const ich = await sitzungErforderlich("verwaltung");

  const id = formular.get("id")?.toString();
  if (!id || id === ich.benutzerId) return;

  // Der letzte Administrator bleibt stehen – sonst kommt niemand mehr in die Verwaltung.
  const admins = await prisma.benutzer.count({ where: { rolle: "ADMIN", aktiv: true } });
  const betroffen = await prisma.benutzer.findUnique({ where: { id }, select: { rolle: true, email: true } });
  if (!betroffen) return;
  if (betroffen.rolle === "ADMIN" && admins <= 1) return;

  await prisma.benutzer.delete({ where: { id } });
  await protokolliere("benutzer.geloescht", "Benutzer", id, { email: betroffen.email });
  revalidatePath("/einstellungen/benutzer");
}
