"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { erzeugeToken } from "@/lib/tokens";
import { protokolliere } from "@/server/audit";
import type { AktionsErgebnis } from "./kunden";

export interface TokenErgebnis extends AktionsErgebnis {
  /** Nur direkt nach dem Erzeugen gesetzt – danach ist der Token nicht mehr lesbar. */
  klartext?: string;
}

/** Erzeugt einen Enrollment-Token; der Klartext wird genau einmal zurückgegeben. */
export async function enrollmentTokenErzeugen(
  _vorher: TokenErgebnis,
  formular: FormData,
): Promise<TokenErgebnis> {
  const bezeichnung = formular.get("bezeichnung")?.toString().trim() || null;
  const kundeId = formular.get("kundeId")?.toString() || null;
  const standortId = formular.get("standortId")?.toString() || null;
  const gueltigTage = Number(formular.get("gueltigTage") ?? 30);
  const maxNutzungenRoh = formular.get("maxNutzungen")?.toString().trim();
  const maxNutzungen = maxNutzungenRoh ? Number(maxNutzungenRoh) : null;

  if (!Number.isFinite(gueltigTage) || gueltigTage < 1 || gueltigTage > 365) {
    return { fehler: "Gültigkeit muss zwischen 1 und 365 Tagen liegen." };
  }
  if (maxNutzungen !== null && (!Number.isInteger(maxNutzungen) || maxNutzungen < 1)) {
    return { fehler: "Die Anzahl der Nutzungen muss mindestens 1 sein." };
  }

  const token = erzeugeToken("enrollment");
  const eintrag = await prisma.enrollmentToken.create({
    data: {
      tokenHash: token.hash,
      praefix: token.praefix,
      bezeichnung,
      kundeId,
      standortId,
      maxNutzungen,
      gueltigBis: new Date(Date.now() + gueltigTage * 86_400_000),
    },
  });

  await protokolliere("enrollment_token.angelegt", "EnrollmentToken", eintrag.id, {
    bezeichnung,
    kundeId,
    gueltigTage,
    maxNutzungen,
  });

  revalidatePath("/einstellungen/tokens");
  return {
    klartext: token.klartext,
    erfolg: "Token erzeugt. Er wird nur dieses eine Mal angezeigt.",
  };
}

export async function enrollmentTokenWiderrufen(formular: FormData) {
  const id = formular.get("id")?.toString();
  if (!id) return;

  await prisma.enrollmentToken.update({ where: { id }, data: { widerrufenAm: new Date() } });
  await protokolliere("enrollment_token.widerrufen", "EnrollmentToken", id, {});
  revalidatePath("/einstellungen/tokens");
}

export async function hostTokenWiderrufen(formular: FormData) {
  const id = formular.get("id")?.toString();
  const hostId = formular.get("hostId")?.toString();
  if (!id) return;

  await prisma.agentToken.update({ where: { id }, data: { widerrufenAm: new Date() } });
  await protokolliere("agent_token.widerrufen", "AgentToken", id, { hostId });

  revalidatePath("/einstellungen/tokens");
  if (hostId) revalidatePath(`/hosts/${hostId}`);
}
