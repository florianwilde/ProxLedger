import { readFile } from "node:fs/promises";
import path from "node:path";
import { AGENT_VERSION } from "./http";

/**
 * Liefert die Agent-Skripte aus dem Verzeichnis `agent/` aus und setzt dabei
 * Dashboard-Adresse und Agent-Version ein.
 */
export async function skriptLaden(datei: "install.sh" | "proxledger-agent.sh", basisUrl: string) {
  const pfad = path.join(process.cwd(), "agent", datei);
  const inhalt = await readFile(pfad, "utf8");
  return inhalt
    .replaceAll("@@DASHBOARD_URL@@", basisUrl.replace(/\/$/, ""))
    .replaceAll("@@AGENT_VERSION@@", AGENT_VERSION);
}

/** Bevorzugt die konfigurierte Adresse; sonst die Herkunft der Anfrage. */
export function basisUrl(request: Request): string {
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
