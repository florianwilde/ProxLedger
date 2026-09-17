import type { AlertSchwere } from "@/generated/prisma/enums";
import { formatDatum } from "@/lib/format";
import type { Nachricht } from "./kanaele";

/**
 * Textbausteine für Benachrichtigungen. Bewusst schlichtes HTML mit Inline-Stilen –
 * E-Mail-Programme ignorieren Stylesheets.
 */

export interface AlertNachrichtDaten {
  id: string;
  regel: string;
  schwere: AlertSchwere;
  titel: string;
  beschreibung: string;
  hostId: string | null;
}

const FARBE: Record<AlertSchwere, string> = {
  GEFAHR: "#C82333",
  WARNUNG: "#FFC107",
  INFO: "#138496",
};

const SCHWERE_TEXT: Record<AlertSchwere, string> = {
  GEFAHR: "Gefahr",
  WARNUNG: "Warnung",
  INFO: "Hinweis",
};

function rahmen(inhalt: string, appUrl: string): string {
  return `<div style="font-family:'Source Sans 3',Arial,sans-serif;font-size:15px;color:#1F2D3D;max-width:640px">
  <div style="border-bottom:3px solid #1E2A44;padding-bottom:8px;margin-bottom:16px">
    <span style="font-size:20px;color:#1E2A44;font-weight:600">ProxLedger</span>
    <span style="color:#6C757D"> · Proxmox Subscription Dashboard</span>
  </div>
  ${inhalt}
  <p style="color:#6C757D;font-size:13px;margin-top:24px">
    <a href="${appUrl}" style="color:#007BFF">Dashboard öffnen</a>
  </p>
</div>`;
}

/** Eine einzelne neue Warnung. */
export function alertNachricht(alert: AlertNachrichtDaten, appUrl: string): Nachricht {
  const betreff = `[ProxLedger] ${SCHWERE_TEXT[alert.schwere]}: ${alert.titel}`;
  const text = `${SCHWERE_TEXT[alert.schwere]}: ${alert.titel}\n${alert.beschreibung}\n\nRegel: ${alert.regel}\n${appUrl}/warnungen`;

  const html = rahmen(
    `<p style="margin:0 0 4px"><span style="display:inline-block;padding:2px 8px;border-radius:4px;background:${FARBE[alert.schwere]};color:${
      alert.schwere === "WARNUNG" ? "#1F2D3D" : "#FFFFFF"
    };font-size:13px">${SCHWERE_TEXT[alert.schwere]}</span></p>
     <h2 style="margin:8px 0;font-size:18px">${alert.titel}</h2>
     <p style="margin:0 0 8px">${alert.beschreibung}</p>
     <p style="color:#6C757D;font-size:13px;margin:0">Regel: ${alert.regel}</p>`,
    appUrl,
  );

  return {
    betreff,
    text,
    html,
    daten: {
      art: "warnung",
      alertId: alert.id,
      regel: alert.regel,
      schwere: alert.schwere,
      titel: alert.titel,
      beschreibung: alert.beschreibung,
      hostId: alert.hostId,
    },
  };
}

export interface ZusammenfassungDaten {
  zeitraum: "taeglich" | "woechentlich";
  offeneAlerts: AlertNachrichtDaten[];
  neueAlerts: AlertNachrichtDaten[];
  baldAblaufend: { hostname: string; kunde: string; datum: Date; tage: number }[];
  offeneRechnungspunkte: number;
  hostsOhneMeldung: number;
}

/** Tägliche oder wöchentliche Zusammenfassung. */
export function zusammenfassungNachricht(daten: ZusammenfassungDaten, appUrl: string): Nachricht {
  const titel = daten.zeitraum === "taeglich" ? "Tagesübersicht" : "Wochenübersicht";
  const betreff = `[ProxLedger] ${titel}: ${daten.offeneAlerts.length} offene Warnungen`;

  const zeilen = [
    `${titel} vom ${formatDatum(new Date())}`,
    "",
    `Offene Warnungen: ${daten.offeneAlerts.length} (davon neu: ${daten.neueAlerts.length})`,
    `Offene Rechnungspunkte: ${daten.offeneRechnungspunkte}`,
    `Hosts ohne Meldung: ${daten.hostsOhneMeldung}`,
    "",
    "Bald ablaufende Subscriptions:",
    ...(daten.baldAblaufend.length > 0
      ? daten.baldAblaufend.map(
          (e) => `  · ${e.hostname} (${e.kunde}) – ${formatDatum(e.datum)}, in ${e.tage} Tagen`,
        )
      : ["  keine in den nächsten 30 Tagen"]),
    "",
    "Offene Warnungen:",
    ...(daten.offeneAlerts.length > 0
      ? daten.offeneAlerts.map((a) => `  · [${SCHWERE_TEXT[a.schwere]}] ${a.titel} – ${a.beschreibung}`)
      : ["  keine"]),
    "",
    `${appUrl}/warnungen`,
  ];

  const liste = (eintraege: string[]) =>
    eintraege.length > 0
      ? `<ul style="margin:4px 0 16px;padding-left:20px">${eintraege.map((e) => `<li>${e}</li>`).join("")}</ul>`
      : `<p style="color:#6C757D;margin:4px 0 16px">keine</p>`;

  const html = rahmen(
    `<h2 style="margin:0 0 12px;font-size:18px">${titel}</h2>
     <table style="border-collapse:collapse;margin-bottom:16px">
       <tr><td style="padding:2px 16px 2px 0">Offene Warnungen</td><td><strong>${daten.offeneAlerts.length}</strong> (neu: ${daten.neueAlerts.length})</td></tr>
       <tr><td style="padding:2px 16px 2px 0">Offene Rechnungspunkte</td><td><strong>${daten.offeneRechnungspunkte}</strong></td></tr>
       <tr><td style="padding:2px 16px 2px 0">Hosts ohne Meldung</td><td><strong>${daten.hostsOhneMeldung}</strong></td></tr>
     </table>
     <h3 style="font-size:15px;margin:0">Bald ablaufende Subscriptions</h3>
     ${liste(
       daten.baldAblaufend.map(
         (e) => `${e.hostname} (${e.kunde}) – ${formatDatum(e.datum)}, in ${e.tage} Tagen`,
       ),
     )}
     <h3 style="font-size:15px;margin:0">Offene Warnungen</h3>
     ${liste(
       daten.offeneAlerts.map(
         (a) =>
           `<span style="color:${FARBE[a.schwere]}">${SCHWERE_TEXT[a.schwere]}</span> – ${a.titel}: ${a.beschreibung}`,
       ),
     )}`,
    appUrl,
  );

  return {
    betreff,
    text: zeilen.join("\n"),
    html,
    daten: {
      art: "zusammenfassung",
      zeitraum: daten.zeitraum,
      offeneAlerts: daten.offeneAlerts.length,
      neueAlerts: daten.neueAlerts.length,
      offeneRechnungspunkte: daten.offeneRechnungspunkte,
      hostsOhneMeldung: daten.hostsOhneMeldung,
      baldAblaufend: daten.baldAblaufend.map((e) => ({
        hostname: e.hostname,
        kunde: e.kunde,
        datum: e.datum.toISOString().slice(0, 10),
        tage: e.tage,
      })),
    },
  };
}

/** Testnachricht für den Knopf „Test senden“. */
export function testNachricht(appUrl: string): Nachricht {
  return {
    betreff: "[ProxLedger] Testnachricht",
    text: `Diese Testnachricht bestätigt, dass der Versand funktioniert.\n${appUrl}`,
    html: rahmen(
      `<h2 style="margin:0 0 8px;font-size:18px">Testnachricht</h2>
       <p style="margin:0">Der Versand funktioniert.</p>`,
      appUrl,
    ),
    daten: { art: "test" },
  };
}
