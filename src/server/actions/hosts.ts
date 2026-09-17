"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { protokolliere } from "@/server/audit";
import { hostsZuweisenService, ZuweisungsFehler } from "@/server/services/zuweisung";
import type { AktionsErgebnis } from "./kunden";

/** Weist mehrere Hosts in einem Schritt einem Kunden zu. */
export async function hostsZuweisen(_vorher: AktionsErgebnis, formular: FormData): Promise<AktionsErgebnis> {
  const hostIds = formular.getAll("hostId").map(String).filter(Boolean);
  const kundeId = formular.get("kundeId")?.toString() || null;
  const standortId = formular.get("standortId")?.toString() || null;

  try {
    const { anzahl, kundenName } = await hostsZuweisenService(hostIds, kundeId, standortId);

    revalidatePath("/hosts/nicht-zugeordnet");
    revalidatePath("/hosts");
    revalidatePath("/kunden");
    revalidatePath(`/kunden/${kundeId}`);
    revalidatePath("/");

    return { erfolg: `${anzahl} Host${anzahl === 1 ? "" : "s"} ${kundenName} zugewiesen.` };
  } catch (fehler) {
    if (fehler instanceof ZuweisungsFehler) return { fehler: fehler.message };
    throw fehler;
  }
}

/** Hebt die Zuordnung eines einzelnen Hosts auf. */
export async function hostZuordnungAufheben(formular: FormData) {
  const hostId = formular.get("hostId")?.toString();
  if (!hostId) return;

  await prisma.host.update({ where: { id: hostId }, data: { kundeId: null, standortId: null } });
  await protokolliere("host.zuordnung_aufgehoben", "Host", hostId, {});

  revalidatePath("/hosts");
  revalidatePath("/hosts/nicht-zugeordnet");
  revalidatePath(`/hosts/${hostId}`);
  revalidatePath("/kunden");
  revalidatePath("/");
}
