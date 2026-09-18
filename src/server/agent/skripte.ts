import { readFile } from "node:fs/promises";
import path from "node:path";
import { einstellungen, onCalendar } from "@/server/einstellungen";
import { AGENT_VERSION } from "./http";

/**
 * Liefert die Agent-Skripte aus dem Verzeichnis `agent/` aus und setzt dabei Dashboard-Adresse,
 * Agent-Version und die Vorgaben aus *Einstellungen → System* ein (Melderhythmus, Streuung,
 * Selbstaktualisierung).
 */
export async function skriptLaden(datei: "install.sh" | "proxledger-agent.sh", basisUrl: string) {
  const pfad = path.join(process.cwd(), "agent", datei);
  const [inhalt, werte] = await Promise.all([readFile(pfad, "utf8"), einstellungen()]);

  return inhalt
    .replaceAll("@@DASHBOARD_URL@@", basisUrl.replace(/\/$/, ""))
    .replaceAll("@@AGENT_VERSION@@", AGENT_VERSION)
    .replaceAll("@@TIMER_ONCALENDAR@@", onCalendar(werte.agentRhythmus))
    .replaceAll("@@TIMER_STREUUNG@@", `${werte.agentStreuungStunden}h`)
    .replaceAll("@@AUTO_UPDATE@@", werte.agentAutoUpdate ? "yes" : "no");
}

/**
 * Bevorzugt die im Dashboard eingetragene Adresse, dann `APP_URL`, sonst die Herkunft der Anfrage.
 * Die Reihenfolge ist wichtig: Hinter einem Reverse Proxy stimmt die Herkunft oft nicht.
 */
export async function basisUrl(request: Request): Promise<string> {
  const werte = await einstellungen();
  if (werte.dashboardUrl) return werte.dashboardUrl;
  if (process.env.APP_URL) return process.env.APP_URL;
  return new URL(request.url).origin;
}

export function skriptAntwort(inhalt: string, dateiname: string) {
  return new Response(inhalt, {
    headers: {
      "Content-Type": "text/x-shellscript; charset=utf-8",
      "Content-Disposition": `inline; filename="${dateiname}"`,
      "Cache-Control": "no-store",
    },
  });
}
