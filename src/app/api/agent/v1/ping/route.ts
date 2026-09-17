import {
  AGENT_VERSION,
  agentRateLimit,
  bearerToken,
  fehlerAntwort,
  fehlerBehandeln,
  rateLimitPruefen,
} from "@/server/agent/http";
import { authentifiziereHost } from "@/server/agent/service";

export const dynamic = "force-dynamic";

/** Verbindungstest für `proxledger-agent --test`. */
export async function GET(request: Request) {
  const token = bearerToken(request);
  const gebremst = rateLimitPruefen(agentRateLimit, request.headers, token);
  if (gebremst) return gebremst;

  if (!token) {
    return fehlerAntwort(401, "token_fehlt", "Host-Token fehlt (Authorization: Bearer …).");
  }

  try {
    const host = await authentifiziereHost(token);
    return Response.json({
      ok: true,
      hostId: host.id,
      hostname: host.hostname,
      agentVersion: AGENT_VERSION,
      serverZeit: new Date().toISOString(),
    });
  } catch (fehler) {
    return fehlerBehandeln(fehler);
  }
}
