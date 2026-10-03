"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eigenerPfad } from "@/lib/adresse";
import { prisma } from "@/lib/db";
import { protokolliere } from "@/server/audit";
import { sitzungErforderlich } from "@/server/auth/sitzungspflicht";
import { hostsZuweisenService, ZuweisungsFehler } from "@/server/services/zuweisung";
import type { AktionsErgebnis } from "./kunden";

/** Weist mehrere Hosts in einem Schritt einem Kunden zu. */
export async function hostsZuweisen(_vorher: AktionsErgebnis, formular: FormData): Promise<AktionsErgebnis> {
  await sitzungErforderlich("fachlichSchreiben");
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
  await sitzungErforderlich("fachlichSchreiben");
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

/**
 * Legt einen Host still: Er verschwindet aus Listen, Zahlen und Warnungen, bleibt aber mit seiner
 * Geschichte erhalten (#041). Gedacht für Maschinen, die es nicht mehr gibt – oder für einen
 * doppelten Eintrag, der entstanden ist, weil sich die Maschinenkennung geändert hat.
 */
export async function hostArchivieren(formular: FormData) {
  await sitzungErforderlich("fachlichSchreiben");

  const hostId = formular.get("hostId")?.toString();
  if (!hostId) return;

  const host = await prisma.host.findUnique({ where: { id: hostId }, select: { archiviertAm: true } });
  if (!host) return;

  const stilllegen = host.archiviertAm === null;
  await prisma.host.update({
    where: { id: hostId },
    data: { archiviertAm: stilllegen ? new Date() : null },
  });

  // Offene Warnungen eines stillgelegten Hosts schließen – sonst bleiben sie für immer stehen.
  if (stilllegen) {
    await prisma.alert.updateMany({
      where: { hostId, erledigtAm: null },
      data: { erledigtAm: new Date() },
    });
  }

  await protokolliere(stilllegen ? "host.stillgelegt" : "host.reaktiviert", "Host", hostId, {});
  revalidatePath(`/hosts/${hostId}`);
  revalidatePath("/hosts");
  revalidatePath("/");
}

/**
 * Löscht einen Host endgültig – nur, solange keine Laufzeit daran hängt. Sobald Rechnungen im
 * Spiel sind, bleibt nur das Stilllegen: Buchhaltung wirft man nicht weg.
 */
export async function hostLoeschen(formular: FormData): Promise<void> {
  await sitzungErforderlich("fachlichSchreiben");

  const hostId = formular.get("hostId")?.toString();
  if (!hostId) return;

  const laufzeiten = await prisma.laufzeit.count({ where: { hostId } });
  if (laufzeiten > 0) return;

  const host = await prisma.host.findUnique({ where: { id: hostId }, select: { hostname: true } });
  if (!host) return;

  await prisma.host.delete({ where: { id: hostId } });
  await protokolliere("host.geloescht", "Host", hostId, { hostname: host.hostname });

  revalidatePath("/hosts");
  revalidatePath("/");
  redirect(await eigenerPfad("/hosts"));
}
