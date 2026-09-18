"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { protokolliere } from "@/server/audit";
import { sichtbarerKunde, sitzungErforderlich } from "@/server/auth/sitzungspflicht";
import type { AktionsErgebnis } from "./kunden";

/** Speichert Notizen und Tags eines Hosts. */
export async function hostNotizenSpeichern(
  _vorher: AktionsErgebnis,
  formular: FormData,
): Promise<AktionsErgebnis> {
  await sitzungErforderlich("mitarbeiten");
  const hostId = formular.get("hostId")?.toString();
  if (!hostId) return { fehler: "Host nicht gefunden." };

  // Kundenkonten dürfen Notizen pflegen – aber nur an den eigenen Hosts.
  const nurKunde = await sichtbarerKunde();
  if (nurKunde) {
    const eigener = await prisma.host.findFirst({
      where: { id: hostId, kundeId: nurKunde },
      select: { id: true },
    });
    if (!eigener) return { fehler: "Dieser Host gehört nicht zu Ihrem Zugang." };
  }

  const notizen = formular.get("notizen")?.toString().trim() || null;
  const tags = (formular.get("tags")?.toString() ?? "")
    .split(",")
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 12);

  await prisma.host.update({
    where: { id: hostId },
    data: {
      notizen,
      tags: {
        set: [],
        connectOrCreate: tags.map((name) => ({ where: { name }, create: { name } })),
      },
    },
  });

  await protokolliere("host.notizen_geaendert", "Host", hostId, { notizen, tags });
  revalidatePath(`/hosts/${hostId}`);

  return { erfolg: "Gespeichert." };
}

/** Ordnet einen einzelnen Host einem Kunden zu (aus der Detailansicht heraus). */
export async function hostKundeSetzen(formular: FormData) {
  await sitzungErforderlich("fachlichSchreiben");
  const hostId = formular.get("hostId")?.toString();
  const kundeId = formular.get("kundeId")?.toString() || null;
  const standortId = formular.get("standortId")?.toString() || null;
  if (!hostId) return;

  await prisma.host.update({ where: { id: hostId }, data: { kundeId, standortId } });
  await protokolliere("host.zugewiesen", "Host", hostId, { kundeId, standortId });

  if (kundeId) {
    await prisma.alert.updateMany({
      where: { regel: "host-ohne-kunde", hostId, erledigtAm: null },
      data: { erledigtAm: new Date() },
    });
  }

  revalidatePath(`/hosts/${hostId}`);
  revalidatePath("/hosts");
  revalidatePath("/hosts/nicht-zugeordnet");
  revalidatePath("/");
}
