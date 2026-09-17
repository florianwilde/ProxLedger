"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { verschluesseln } from "@/lib/geheimnisse";
import { protokolliere } from "@/server/audit";
import type { EmailKonfiguration, WebhookKonfiguration } from "@/server/notifications/kanaele";
import { testNachricht } from "@/server/notifications/nachrichten";
import { ueberEinenKanalSenden, zusammenfassungSenden } from "@/server/notifications/versand";
import type { AktionsErgebnis } from "./kunden";

function neuLaden() {
  revalidatePath("/einstellungen/benachrichtigungen");
}

function appUrl() {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

/** Legt den E-Mail-Kanal an oder ändert ihn. Ein leeres Passwortfeld lässt das gespeicherte unangetastet. */
export async function emailKanalSpeichern(
  _vorher: AktionsErgebnis,
  formular: FormData,
): Promise<AktionsErgebnis> {
  const id = formular.get("id")?.toString() || null;
  const host = formular.get("host")?.toString().trim() ?? "";
  const port = Number(formular.get("port") ?? 587);
  const empfaenger = (formular.get("empfaenger")?.toString() ?? "")
    .split(/[,;\s]+/)
    .map((eintrag) => eintrag.trim())
    .filter(Boolean);

  if (!host) return { fehler: "Bitte den SMTP-Server angeben." };
  if (!Number.isInteger(port) || port < 1 || port > 65535) return { fehler: "Ungültiger Port." };
  if (empfaenger.length === 0) return { fehler: "Bitte mindestens einen Empfänger angeben." };

  const bisher = id
    ? ((await prisma.benachrichtigungskanal.findUnique({ where: { id } }))?.konfiguration as unknown as
        EmailKonfiguration | undefined)
    : undefined;

  const passwortEingabe = formular.get("passwort")?.toString() ?? "";

  const konfiguration: EmailKonfiguration = {
    host,
    port,
    secure: port === 465,
    benutzer: formular.get("benutzer")?.toString().trim() ?? "",
    // Leeres Feld heißt „unverändert“; das gespeicherte Passwort bleibt dann wie es ist.
    // Neue Eingaben werden verschlüsselt abgelegt (#021).
    passwort: passwortEingabe ? verschluesseln(passwortEingabe) : (bisher?.passwort ?? ""),
    absender: formular.get("absender")?.toString().trim() ?? "",
    empfaenger,
  };

  const daten = {
    typ: "EMAIL" as const,
    name: formular.get("name")?.toString().trim() || "E-Mail",
    aktiv: formular.get("aktiv") === "on",
    konfiguration: JSON.parse(JSON.stringify(konfiguration)),
  };

  const kanal = id
    ? await prisma.benachrichtigungskanal.update({ where: { id }, data: daten })
    : await prisma.benachrichtigungskanal.create({ data: daten });

  await protokolliere("benachrichtigungskanal.gespeichert", "Benachrichtigungskanal", kanal.id, {
    typ: "EMAIL",
    host,
    empfaenger,
  });

  neuLaden();
  return { erfolg: "E-Mail-Versand gespeichert." };
}

export async function webhookKanalSpeichern(
  _vorher: AktionsErgebnis,
  formular: FormData,
): Promise<AktionsErgebnis> {
  const id = formular.get("id")?.toString() || null;
  const url = formular.get("url")?.toString().trim() ?? "";

  if (!/^https?:\/\//.test(url)) return { fehler: "Bitte eine vollständige Adresse mit https:// angeben." };

  const bisher = id
    ? ((await prisma.benachrichtigungskanal.findUnique({ where: { id } }))?.konfiguration as unknown as
        WebhookKonfiguration | undefined)
    : undefined;

  const geheimnisEingabe = formular.get("geheimnis")?.toString() ?? "";

  const konfiguration: WebhookKonfiguration = {
    url,
    geheimnis: geheimnisEingabe ? verschluesseln(geheimnisEingabe) : bisher?.geheimnis,
  };

  const daten = {
    typ: "WEBHOOK" as const,
    name: formular.get("name")?.toString().trim() || "Webhook",
    aktiv: formular.get("aktiv") === "on",
    konfiguration: JSON.parse(JSON.stringify(konfiguration)),
  };

  const kanal = id
    ? await prisma.benachrichtigungskanal.update({ where: { id }, data: daten })
    : await prisma.benachrichtigungskanal.create({ data: daten });

  await protokolliere("benachrichtigungskanal.gespeichert", "Benachrichtigungskanal", kanal.id, {
    typ: "WEBHOOK",
    url,
  });

  neuLaden();
  return { erfolg: "Webhook gespeichert." };
}

export async function kanalLoeschen(formular: FormData) {
  const id = formular.get("id")?.toString();
  if (!id) return;

  await prisma.benachrichtigungskanal.delete({ where: { id } });
  await protokolliere("benachrichtigungskanal.geloescht", "Benachrichtigungskanal", id, {});
  neuLaden();
}

/** Verschickt eine Testnachricht über einen Kanal. */
export async function testSenden(formular: FormData): Promise<void> {
  const id = formular.get("id")?.toString();
  if (!id) return;

  try {
    await ueberEinenKanalSenden(id, testNachricht(appUrl()));
  } catch (fehler) {
    // Das Ergebnis steht im Versandprotokoll auf der Seite – dort ist auch der Fehlertext zu sehen.
    console.error("Testversand fehlgeschlagen:", fehler);
  }
  neuLaden();
}

/** Zeitraum der Zusammenfassung speichern (täglich, wöchentlich oder aus). */
export async function zusammenfassungSpeichern(formular: FormData) {
  const zeitraum = formular.get("zeitraum")?.toString() ?? "aus";

  await prisma.einstellung.upsert({
    where: { schluessel: "zusammenfassung" },
    update: { wert: { zeitraum } },
    create: { schluessel: "zusammenfassung", wert: { zeitraum } },
  });

  await protokolliere("zusammenfassung.geaendert", "Einstellung", "zusammenfassung", { zeitraum });
  neuLaden();
}

/** Zusammenfassung sofort verschicken – praktisch zum Ausprobieren. */
export async function zusammenfassungJetztSenden(formular: FormData): Promise<void> {
  const zeitraum = formular.get("zeitraum")?.toString() === "woechentlich" ? "woechentlich" : "taeglich";
  await zusammenfassungSenden(zeitraum);
  neuLaden();
}
