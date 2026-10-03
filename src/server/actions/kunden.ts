"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { protokolliere } from "@/server/audit";
import { sitzungErforderlich } from "@/server/auth/sitzungspflicht";
import { eigenerPfad } from "@/lib/adresse";

export interface AktionsErgebnis {
  fehler?: string;
  felder?: Record<string, string>;
  erfolg?: string;
}

const leerZuNull = (wert: FormDataEntryValue | null) => {
  const text = typeof wert === "string" ? wert.trim() : "";
  return text.length > 0 ? text : null;
};

const kundeSchema = z.object({
  name: z.string().min(2, "Bitte einen Namen angeben."),
  kundennummer: z.string().min(1, "Bitte eine Kundennummer angeben."),
  ansprechpartner: z.string().nullable(),
  email: z.union([z.string().email("Keine gültige E-Mail-Adresse."), z.null()]),
  telefon: z.string().nullable(),
  notizen: z.string().nullable(),
});

/** Legt einen Kunden an oder ändert ihn; `id` im Formular entscheidet darüber. */
export async function kundeSpeichern(_vorher: AktionsErgebnis, formular: FormData): Promise<AktionsErgebnis> {
  await sitzungErforderlich("fachlichSchreiben");
  const id = leerZuNull(formular.get("id"));
  const eingabe = kundeSchema.safeParse({
    name: formular.get("name")?.toString().trim() ?? "",
    kundennummer: formular.get("kundennummer")?.toString().trim() ?? "",
    ansprechpartner: leerZuNull(formular.get("ansprechpartner")),
    email: leerZuNull(formular.get("email")),
    telefon: leerZuNull(formular.get("telefon")),
    notizen: leerZuNull(formular.get("notizen")),
  });

  if (!eingabe.success) {
    const felder: Record<string, string> = {};
    for (const problem of eingabe.error.issues) felder[String(problem.path[0])] = problem.message;
    return { fehler: "Bitte die markierten Felder prüfen.", felder };
  }

  const vorhandeneNummer = await prisma.kunde.findUnique({
    where: { kundennummer: eingabe.data.kundennummer },
  });
  if (vorhandeneNummer && vorhandeneNummer.id !== id) {
    return {
      fehler: "Diese Kundennummer ist bereits vergeben.",
      felder: { kundennummer: "Bereits vergeben." },
    };
  }

  const kunde = id
    ? await prisma.kunde.update({ where: { id }, data: eingabe.data })
    : await prisma.kunde.create({ data: eingabe.data });

  await protokolliere(id ? "kunde.geaendert" : "kunde.angelegt", "Kunde", kunde.id, eingabe.data);

  revalidatePath("/kunden");
  revalidatePath(`/kunden/${kunde.id}`);
  redirect(`/kunden/${kunde.id}`);
}

export async function kundeLoeschen(formular: FormData) {
  await sitzungErforderlich("fachlichSchreiben");
  const id = formular.get("id")?.toString();
  if (!id) return;

  const kunde = await prisma.kunde.findUnique({ where: { id }, select: { name: true } });
  // Hosts bleiben erhalten und gelten danach als nicht zugeordnet (onDelete: SetNull).
  await prisma.kunde.delete({ where: { id } });
  await protokolliere("kunde.geloescht", "Kunde", id, { name: kunde?.name });

  revalidatePath("/kunden");
  revalidatePath("/hosts/nicht-zugeordnet");
  redirect(await eigenerPfad("/kunden"));
}

const standortSchema = z.object({
  kundeId: z.string().min(1),
  name: z.string().min(2, "Bitte einen Namen angeben."),
  strasse: z.string().nullable(),
  plz: z.string().nullable(),
  ort: z.string().nullable(),
});

export async function standortSpeichern(
  _vorher: AktionsErgebnis,
  formular: FormData,
): Promise<AktionsErgebnis> {
  await sitzungErforderlich("fachlichSchreiben");
  const id = leerZuNull(formular.get("id"));
  const eingabe = standortSchema.safeParse({
    kundeId: formular.get("kundeId")?.toString() ?? "",
    name: formular.get("name")?.toString().trim() ?? "",
    strasse: leerZuNull(formular.get("strasse")),
    plz: leerZuNull(formular.get("plz")),
    ort: leerZuNull(formular.get("ort")),
  });

  if (!eingabe.success) {
    const felder: Record<string, string> = {};
    for (const problem of eingabe.error.issues) felder[String(problem.path[0])] = problem.message;
    return { fehler: "Bitte die markierten Felder prüfen.", felder };
  }

  const standort = id
    ? await prisma.standort.update({ where: { id }, data: eingabe.data })
    : await prisma.standort.create({ data: eingabe.data });

  await protokolliere(id ? "standort.geaendert" : "standort.angelegt", "Standort", standort.id, eingabe.data);
  revalidatePath(`/kunden/${eingabe.data.kundeId}`);
  return { erfolg: "Standort gespeichert." };
}

export async function standortLoeschen(formular: FormData) {
  await sitzungErforderlich("fachlichSchreiben");
  const id = formular.get("id")?.toString();
  const kundeId = formular.get("kundeId")?.toString();
  if (!id) return;

  await prisma.standort.delete({ where: { id } });
  await protokolliere("standort.geloescht", "Standort", id, {});
  if (kundeId) revalidatePath(`/kunden/${kundeId}`);
}
