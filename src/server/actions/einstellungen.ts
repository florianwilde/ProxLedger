"use server";

import { revalidatePath } from "next/cache";
import { protokolliere } from "@/server/audit";
import { sitzungErforderlich } from "@/server/auth/sitzungspflicht";
import { einstellungen, einstellungenSchema, einstellungenSpeichern } from "@/server/einstellungen";

export interface AktionsErgebnis {
  fehler?: string;
  felder?: Record<string, string>;
  erfolg?: string;
}

const zahl = (formular: FormData, feld: string) => {
  const roh = formular.get(feld)?.toString().replace(",", ".").trim();
  return roh === undefined || roh === "" ? undefined : Number(roh);
};

const text = (formular: FormData, feld: string) => formular.get(feld)?.toString().trim() ?? "";
const schalter = (formular: FormData, feld: string) => formular.get(feld) === "an";

export async function einstellungenSpeichernAktion(
  _zustand: AktionsErgebnis,
  formular: FormData,
): Promise<AktionsErgebnis> {
  await sitzungErforderlich("verwaltung");

  const vorher = await einstellungen();

  const ergebnis = einstellungenSchema.safeParse({
    dashboardUrl: text(formular, "dashboardUrl"),
    agentRhythmus: text(formular, "agentRhythmus") || vorher.agentRhythmus,
    agentStreuungStunden: zahl(formular, "agentStreuungStunden"),
    agentAutoUpdate: schalter(formular, "agentAutoUpdate"),

    waehrung: text(formular, "waehrung") || vorher.waehrung,
    steuersatz: zahl(formular, "steuersatz"),
    zahlungszielTage: zahl(formular, "zahlungszielTage"),
    margeProzent: zahl(formular, "margeProzent"),

    sitzungsdauerStunden: zahl(formular, "sitzungsdauerStunden"),
    anmeldeversuche: zahl(formular, "anmeldeversuche"),
    oidcDomaenen: text(formular, "oidcDomaenen"),
    oidcKontenAnlegen: schalter(formular, "oidcKontenAnlegen"),
    oidcStandardRolle: text(formular, "oidcStandardRolle") || vorher.oidcStandardRolle,
    aufbewahrungReportsTage: zahl(formular, "aufbewahrungReportsTage"),
    aufbewahrungAuditTage: zahl(formular, "aufbewahrungAuditTage"),

    firmaName: text(formular, "firmaName"),
    firmaAnschrift: text(formular, "firmaAnschrift"),
    firmaEmail: text(formular, "firmaEmail"),
    zeitzone: text(formular, "zeitzone") || vorher.zeitzone,
  });

  if (!ergebnis.success) {
    const felder: Record<string, string> = {};
    for (const fehler of ergebnis.error.issues) {
      const feld = fehler.path[0];
      if (typeof feld === "string" && !felder[feld]) felder[feld] = fehler.message;
    }
    return { fehler: "Bitte die markierten Felder prüfen.", felder };
  }

  await einstellungenSpeichern(ergebnis.data);

  // Nur die geänderten Felder ins Protokoll – sonst steht bei jedem Speichern alles darin.
  const geaendert = Object.fromEntries(
    Object.entries(ergebnis.data).filter(
      ([feld, wert]) => wert !== vorher[feld as keyof typeof vorher],
    ),
  );
  await protokolliere("einstellungen.gespeichert", "Einstellung", "system", geaendert);

  revalidatePath("/einstellungen/system");
  return { erfolg: "Einstellungen gespeichert." };
}
