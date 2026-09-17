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
