import { clientIp } from "@/lib/ratelimit";
import {
  AGENT_VERSION,
  agentRateLimit,
  bearerToken,
  fehlerAntwort,
  fehlerBehandeln,
  jsonEingabe,
  rateLimitPruefen,
} from "@/server/agent/http";
import { reportSchema } from "@/server/agent/schema";
import { authentifiziereHost, verarbeiteReport } from "@/server/agent/service";
import { alertsAbgleichen } from "@/server/alerts/abgleich";

export const dynamic = "force-dynamic";

/** Täglicher Statusbericht eines Hosts. */
export async function POST(request: Request) {
  const token = bearerToken(request);
  const gebremst = rateLimitPruefen(agentRateLimit, request.headers, token);
  if (gebremst) return gebremst;

  if (!token) {
    return fehlerAntwort(401, "token_fehlt", "Host-Token fehlt (Authorization: Bearer …).");
  }

  const eingabe = await jsonEingabe(request, reportSchema);
  if ("antwort" in eingabe) return eingabe.antwort;

  try {
    const host = await authentifiziereHost(token);
    const ergebnis = await verarbeiteReport(host, eingabe.daten, clientIp(request.headers));

    // Warnungen sofort neu bewerten – ein Report ist der häufigste Auslöser für Änderungen.
    // Schlägt das fehl, ist der Report trotzdem angenommen.
    try {
      await alertsAbgleichen();
    } catch (fehler) {
      console.error("Auswertung der Warnregeln nach einem Report fehlgeschlagen:", fehler);
    }

    return Response.json({
      ok: true,
      hostId: host.id,
      doppelt: ergebnis.doppelt,
      laufzeitVorschlag: ergebnis.laufzeitVorschlagAngelegt,
      agentVersion: AGENT_VERSION,
      serverZeit: new Date().toISOString(),
    });
  } catch (fehler) {
    return fehlerBehandeln(fehler);
  }
}
