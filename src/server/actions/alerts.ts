"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { protokolliere } from "@/server/audit";
import { alertsAbgleichen } from "@/server/alerts/abgleich";
import { REGELN } from "@/server/alerts/regeln";
import type { AktionsErgebnis } from "./kunden";

function neuLaden() {
  revalidatePath("/warnungen");
  revalidatePath("/einstellungen/warnregeln");
  revalidatePath("/");
}

/** Warnung quittieren: sie bleibt offen, ist aber als gesehen markiert. */
export async function alertQuittieren(formular: FormData) {
  const id = formular.get("id")?.toString();
  if (!id) return;

  await prisma.alert.update({ where: { id }, data: { quittiertAm: new Date() } });
  await protokolliere("alert.quittiert", "Alert", id, {});
  neuLaden();
}

/** Warnung von Hand schließen; taucht der Fall weiter auf, öffnet der nächste Abgleich sie erneut. */
export async function alertSchliessen(formular: FormData) {
  const id = formular.get("id")?.toString();
  if (!id) return;

  await prisma.alert.update({ where: { id }, data: { erledigtAm: new Date() } });
  await protokolliere("alert.geschlossen", "Alert", id, {});
  neuLaden();
}

/** Auswertung sofort anstoßen, ohne auf den Worker zu warten. */
export async function alertsJetztPruefen(): Promise<AktionsErgebnis> {
  const ergebnis = await alertsAbgleichen();
  neuLaden();
  return {
    erfolg: `${ergebnis.geoeffnet.length} neu, ${ergebnis.erledigt.length} erledigt, ${ergebnis.unveraendert} unverändert.`,
  };
}

/** Schwellwerte und Ein-/Ausschalter der Regeln speichern. */
export async function warnregelnSpeichern(
  _vorher: AktionsErgebnis,
  formular: FormData,
): Promise<AktionsErgebnis> {
  for (const regel of REGELN) {
    const aktiv = formular.get(`aktiv:${regel.name}`) === "on";
    const schwellwerte: Record<string, number | number[]> = {};

    for (const [name, standard] of Object.entries(regel.standardSchwellwerte)) {
      const eingabe = formular.get(`schwelle:${regel.name}:${name}`)?.toString().trim();
      if (!eingabe) continue;

      if (Array.isArray(standard)) {
        const zahlen = eingabe
          .split(",")
          .map((teil) => Number(teil.trim()))
          .filter((zahl) => Number.isFinite(zahl) && zahl > 0)
          .sort((a, b) => b - a);
        if (zahlen.length === 0) {
          return { fehler: `Bei „${regel.beschreibung}“ bitte mindestens einen Wert angeben.` };
        }
        schwellwerte[name] = zahlen;
      } else {
        const zahl = Number(eingabe);
        if (!Number.isFinite(zahl) || zahl <= 0) {
          return { fehler: `Bei „${regel.beschreibung}“ bitte eine Zahl größer null angeben.` };
        }
        schwellwerte[name] = zahl;
      }
    }

    await prisma.warnregelEinstellung.upsert({
      where: { regel: regel.name },
      update: { aktiv, schwellwerte },
      create: { regel: regel.name, aktiv, schwellwerte },
    });
  }

  await protokolliere("warnregeln.geaendert", "WarnregelEinstellung", null, {});

  // Änderungen sollen sofort sichtbar sein.
  const ergebnis = await alertsAbgleichen();
  neuLaden();

  return {
    erfolg: `Gespeichert. Auswertung: ${ergebnis.geoeffnet.length} neu, ${ergebnis.erledigt.length} erledigt.`,
  };
}
