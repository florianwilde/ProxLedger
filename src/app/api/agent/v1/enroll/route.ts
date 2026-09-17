import {
  AGENT_VERSION,
  bearerToken,
  enrollRateLimit,
  fehlerAntwort,
  fehlerBehandeln,
  jsonEingabe,
  rateLimitPruefen,
} from "@/server/agent/http";
import { enrollSchema } from "@/server/agent/schema";
import { registriereAgent } from "@/server/agent/service";

export const dynamic = "force-dynamic";

/** Registrierung eines Agents mit einem Enrollment-Token. */
export async function POST(request: Request) {
  const token = bearerToken(request);
  const gebremst = rateLimitPruefen(enrollRateLimit, request.headers, token);
  if (gebremst) return gebremst;

  if (!token) {
    return fehlerAntwort(401, "token_fehlt", "Enrollment-Token fehlt (Authorization: Bearer …).");
  }

  const eingabe = await jsonEingabe(request, enrollSchema);
  if ("antwort" in eingabe) return eingabe.antwort;

  try {
    const ergebnis = await registriereAgent(eingabe.daten, token);
    return Response.json(
      {
        ok: true,
        hostId: ergebnis.hostId,
        token: ergebnis.token,
        bestehenderHost: ergebnis.bestehenderHost,
        serverIdBereitsBekannt: ergebnis.serverIdBereitsBekannt,
        agentVersion: AGENT_VERSION,
        serverZeit: new Date().toISOString(),
      },
      { status: ergebnis.bestehenderHost ? 200 : 201 },
    );
  } catch (fehler) {
    return fehlerBehandeln(fehler);
  }
}
