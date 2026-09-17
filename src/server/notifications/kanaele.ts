import { createHmac } from "node:crypto";
import nodemailer from "nodemailer";
import type { NotificationKanal } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { entschluesseln } from "@/lib/geheimnisse";

/**
 * Versandwege für Benachrichtigungen: SMTP (getestet gegen Microsoft 365) und ein generischer Webhook,
 * an den sich Matrix, Zabbix oder Home Assistant anbinden lassen.
 */

export interface EmailKonfiguration {
  host: string;
  port: number;
  /** true = SMTPS (Port 465), false = STARTTLS (Port 587, so macht es Microsoft 365). */
  secure: boolean;
  benutzer: string;
  passwort: string;
  absender: string;
  empfaenger: string[];
}

export interface WebhookKonfiguration {
  url: string;
  /** Optionales Geheimnis für die Signatur im Header `X-ProxLedger-Signatur`. */
  geheimnis?: string;
  kopfzeilen?: Record<string, string>;
}

export interface Nachricht {
  betreff: string;
  text: string;
  html: string;
  /** Strukturierte Fassung für den Webhook. */
  daten: Record<string, unknown>;
}

export class VersandFehler extends Error {}

/** Verschickt eine Nachricht per SMTP. */
export async function perEmailSenden(konfiguration: EmailKonfiguration, nachricht: Nachricht): Promise<void> {
  if (konfiguration.empfaenger.length === 0) {
    throw new VersandFehler("Kein Empfänger hinterlegt.");
  }

  const transport = nodemailer.createTransport({
    host: konfiguration.host,
    port: konfiguration.port,
    secure: konfiguration.secure,
    auth: konfiguration.benutzer ? { user: konfiguration.benutzer, pass: konfiguration.passwort } : undefined,
    // Microsoft 365 verlangt STARTTLS auf Port 587; `requireTLS` verhindert unverschlüsselten Versand.
    requireTLS: !konfiguration.secure,
  });

  try {
    await transport.sendMail({
      from: konfiguration.absender,
      to: konfiguration.empfaenger.join(", "),
      subject: nachricht.betreff,
      text: nachricht.text,
      html: nachricht.html,
    });
  } catch (fehler) {
    throw new VersandFehler(fehler instanceof Error ? fehler.message : "SMTP-Versand fehlgeschlagen.");
  } finally {
    transport.close();
  }
}

/** Verschickt eine Nachricht an einen Webhook; bei Geheimnis mit HMAC-Signatur. */
export async function perWebhookSenden(
  konfiguration: WebhookKonfiguration,
  nachricht: Nachricht,
): Promise<void> {
  const koerper = JSON.stringify({
    betreff: nachricht.betreff,
    text: nachricht.text,
    ...nachricht.daten,
  });

  const kopfzeilen: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "ProxLedger",
    ...konfiguration.kopfzeilen,
  };

  if (konfiguration.geheimnis) {
    kopfzeilen["X-ProxLedger-Signatur"] = `sha256=${createHmac("sha256", konfiguration.geheimnis)
      .update(koerper)
      .digest("hex")}`;
  }

  let antwort: Response;
  try {
    antwort = await fetch(konfiguration.url, { method: "POST", headers: kopfzeilen, body: koerper });
  } catch (fehler) {
    throw new VersandFehler(fehler instanceof Error ? fehler.message : "Webhook nicht erreichbar.");
  }

  if (!antwort.ok) {
    throw new VersandFehler(`Webhook antwortet mit HTTP ${antwort.status}.`);
  }
}

export interface KanalEintrag {
  id: string;
  typ: NotificationKanal;
  name: string;
  aktiv: boolean;
  konfiguration: EmailKonfiguration | WebhookKonfiguration;
}

/** Holt die Zugangsdaten aus der Datenbank und entschlüsselt sie für den Versand. */
export function konfigurationLesen(
  typ: NotificationKanal,
  gespeichert: unknown,
): EmailKonfiguration | WebhookKonfiguration {
  if (typ === "EMAIL") {
    const eintrag = gespeichert as EmailKonfiguration;
    return { ...eintrag, passwort: entschluesseln(eintrag.passwort ?? "") };
  }
  const eintrag = gespeichert as WebhookKonfiguration;
  return { ...eintrag, geheimnis: eintrag.geheimnis ? entschluesseln(eintrag.geheimnis) : undefined };
}

export async function aktiveKanaele(): Promise<KanalEintrag[]> {
  const kanaele = await prisma.benachrichtigungskanal.findMany({ where: { aktiv: true } });
  return kanaele.map((kanal) => ({
    id: kanal.id,
    typ: kanal.typ,
    name: kanal.name,
    aktiv: kanal.aktiv,
    konfiguration: konfigurationLesen(kanal.typ, kanal.konfiguration),
  }));
}

/** Verschickt über einen Kanal und schreibt das Ergebnis ins Versandprotokoll. */
export async function ueberKanalSenden(
  kanal: KanalEintrag,
  nachricht: Nachricht,
  alertId: string | null = null,
): Promise<void> {
  const empfaenger =
    kanal.typ === "EMAIL"
      ? (kanal.konfiguration as EmailKonfiguration).empfaenger.join(", ")
      : (kanal.konfiguration as WebhookKonfiguration).url;

  try {
    if (kanal.typ === "EMAIL") {
      await perEmailSenden(kanal.konfiguration as EmailKonfiguration, nachricht);
    } else {
      await perWebhookSenden(kanal.konfiguration as WebhookKonfiguration, nachricht);
    }

    await prisma.benachrichtigung.create({
      data: {
        alertId,
        kanal: kanal.typ,
        empfaenger,
        betreff: nachricht.betreff,
        status: "GESENDET",
        versendetAm: new Date(),
      },
    });
  } catch (fehler) {
    await prisma.benachrichtigung.create({
      data: {
        alertId,
        kanal: kanal.typ,
        empfaenger,
        betreff: nachricht.betreff,
        status: "FEHLGESCHLAGEN",
        fehler: fehler instanceof Error ? fehler.message : String(fehler),
      },
    });
    throw fehler;
  }
}
