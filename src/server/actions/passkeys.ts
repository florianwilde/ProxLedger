"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { protokolliere } from "@/server/audit";
import { sitzungErforderlich } from "@/server/auth/sitzungspflicht";

/** Entfernt einen eigenen Passkey. Fremde bleiben unberührt – auch für Administratoren. */
export async function passkeyLoeschen(formular: FormData) {
  const ich = await sitzungErforderlich();

  const id = formular.get("id")?.toString();
  if (!id) return;

  const ergebnis = await prisma.passkey.deleteMany({ where: { id, benutzerId: ich.benutzerId } });
  if (ergebnis.count === 0) return;

  await protokolliere("passkey.entfernt", "Passkey", id, {});
  revalidatePath("/einstellungen/passkeys");
}
