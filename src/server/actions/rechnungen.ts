"use server";

import { revalidatePath } from "next/cache";
import { anhangSpeichern, UploadFehler } from "@/lib/uploads";
import { sitzungErforderlich } from "@/server/auth/sitzungspflicht";
import {
  einkaufBezahltSetzen,
  kundenrechnungErfassen,
  laufzeitAnlegen,
  laufzeitBestaetigen,
  laufzeitVerwerfen,
  proxmoxRechnungErfassen,
  RechnungsFehler,
  verkaufBezahltSetzen,
  verkaufErstelltSetzen,
} from "@/server/services/rechnungen";
import type { AktionsErgebnis } from "./kunden";

function datum(wert: FormDataEntryValue | null): Date | null {
  const text = wert?.toString().trim();
  return text ? new Date(`${text}T00:00:00Z`) : null;
}

function betrag(wert: FormDataEntryValue | null): number | null {
  const text = wert?.toString().trim().replace(",", ".");
  if (!text) return null;
  const zahl = Number(text);
  return Number.isFinite(zahl) ? zahl : null;
}

function seitenNeuLaden(hostId?: string | null) {
  revalidatePath("/rechnungen");
  revalidatePath("/");
  revalidatePath("/kunden");
  if (hostId) revalidatePath(`/hosts/${hostId}`);
}

/** Wandelt Fehler aus der Fachlogik in eine Rückmeldung für das Formular. */
async function ausfuehren(arbeit: () => Promise<string | void>): Promise<AktionsErgebnis> {
  try {
    const meldung = await arbeit();
    return { erfolg: meldung || "Gespeichert." };
  } catch (fehler) {
    if (fehler instanceof RechnungsFehler || fehler instanceof UploadFehler) {
      return { fehler: fehler.message };
    }
    throw fehler;
  }
}

export async function laufzeitBestaetigenAktion(formular: FormData) {
  await sitzungErforderlich();
  const id = formular.get("laufzeitId")?.toString();
  if (!id) return;
  await laufzeitBestaetigen(id);
  seitenNeuLaden(formular.get("hostId")?.toString());
}

export async function laufzeitVerwerfenAktion(formular: FormData) {
  await sitzungErforderlich();
  const id = formular.get("laufzeitId")?.toString();
  if (!id) return;
  await laufzeitVerwerfen(id);
  seitenNeuLaden(formular.get("hostId")?.toString());
}

/** Häkchen aus der Rechnungstabelle. */
export async function statusUmschalten(formular: FormData): Promise<void> {
  await sitzungErforderlich();
  const laufzeitId = formular.get("laufzeitId")?.toString();
  const feld = formular.get("feld")?.toString();
  const wert = formular.get("wert")?.toString() === "true";
  if (!laufzeitId || !feld) return;

  try {
    if (feld === "einkaufBezahlt") await einkaufBezahltSetzen(laufzeitId, wert);
    if (feld === "verkaufErstellt") await verkaufErstelltSetzen(laufzeitId, wert);
    if (feld === "verkaufBezahlt") await verkaufBezahltSetzen(laufzeitId, wert);
  } catch (fehler) {
    if (!(fehler instanceof RechnungsFehler)) throw fehler;
    // Fehlt die Rechnung, bleibt der Status unverändert; die Tabelle zeigt weiterhin „Fehlt“.
  }

  seitenNeuLaden(formular.get("hostId")?.toString());
}

export async function proxmoxRechnungSpeichern(
  _vorher: AktionsErgebnis,
  formular: FormData,
): Promise<AktionsErgebnis> {
  await sitzungErforderlich();
  const laufzeitId = formular.get("laufzeitId")?.toString();
  if (!laufzeitId) return { fehler: "Laufzeit fehlt." };

  return ausfuehren(async () => {
    const pdf = formular.get("pdf");
    const anhangId = pdf instanceof File && pdf.size > 0 ? await anhangSpeichern(pdf) : null;
    const rechnungsdatum = datum(formular.get("datum"));

    if (!rechnungsdatum) throw new RechnungsFehler("Bitte ein Rechnungsdatum angeben.");
    const netto = betrag(formular.get("nettoBetrag"));
    if (netto === null) throw new RechnungsFehler("Bitte einen Nettobetrag angeben.");

    const ergebnis = await proxmoxRechnungErfassen(laufzeitId, {
      nummer: formular.get("nummer")?.toString() ?? "",
      datum: rechnungsdatum,
      faelligAm: datum(formular.get("faelligAm")),
      nettoBetrag: netto,
      ustSatz: betrag(formular.get("ustSatz")) ?? undefined,
      rabatt: betrag(formular.get("rabatt")),
      zahlungsart: formular.get("zahlungsart")?.toString().trim() || null,
      bezahlt: formular.get("bezahlt") === "on",
      bezahltAm: datum(formular.get("bezahltAm")),
      anhangId,
      notizen: formular.get("notizen")?.toString().trim() || null,
    });

    seitenNeuLaden(formular.get("hostId")?.toString());
    return ergebnis.sammelrechnung
      ? "Gespeichert – die Laufzeit hängt jetzt als weitere Position an dieser Sammelrechnung."
      : "Proxmox-Rechnung gespeichert.";
  });
}

export async function kundenrechnungSpeichern(
  _vorher: AktionsErgebnis,
  formular: FormData,
): Promise<AktionsErgebnis> {
  await sitzungErforderlich();
  const laufzeitId = formular.get("laufzeitId")?.toString();
  if (!laufzeitId) return { fehler: "Laufzeit fehlt." };

  return ausfuehren(async () => {
    const pdf = formular.get("pdf");
    const anhangId = pdf instanceof File && pdf.size > 0 ? await anhangSpeichern(pdf) : null;

    const ergebnis = await kundenrechnungErfassen(laufzeitId, {
      erstellt: formular.get("erstellt") === "on",
      nummer: formular.get("nummer")?.toString().trim() || null,
      datum: datum(formular.get("datum")),
      nettoBetrag: betrag(formular.get("nettoBetrag")),
      ustSatz: betrag(formular.get("ustSatz")) ?? undefined,
      bezahlt: formular.get("bezahlt") === "on",
      bezahltAm: datum(formular.get("bezahltAm")),
      anhangId,
      notizen: formular.get("notizen")?.toString().trim() || null,
    });

    seitenNeuLaden(formular.get("hostId")?.toString());
    return ergebnis.sammelrechnung
      ? "Gespeichert – die Laufzeit hängt jetzt als weitere Position an dieser Sammelrechnung."
      : "Kundenrechnung gespeichert.";
  });
}

export async function laufzeitAnlegenAktion(
  _vorher: AktionsErgebnis,
  formular: FormData,
): Promise<AktionsErgebnis> {
  await sitzungErforderlich();
  const hostId = formular.get("hostId")?.toString();
  const key = formular.get("key")?.toString().trim();
  const start = datum(formular.get("start"));
  const ende = datum(formular.get("ende"));

  if (!hostId || !key || !start || !ende) {
    return { fehler: "Bitte Host, Key, Beginn und Ende angeben." };
  }

  return ausfuehren(async () => {
    await laufzeitAnlegen({ hostId, key, start, ende, notizen: null });
    seitenNeuLaden(hostId);
    return "Laufzeit angelegt.";
  });
}
