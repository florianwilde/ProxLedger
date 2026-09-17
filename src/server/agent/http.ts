import type { ZodType } from "zod";
import { agentRateLimit, clientIp, enrollRateLimit, type RateLimit } from "@/lib/ratelimit";
import { tokenAusHeader } from "@/lib/tokens";
import { AgentApiFehler } from "./service";

/** Version des Agent-Skripts, die das Dashboard ausliefert (siehe #005). */
export const AGENT_VERSION = "0.2.0";

export function fehlerAntwort(status: number, code: string, nachricht: string, extra?: HeadersInit) {
  return Response.json({ ok: false, code, fehler: nachricht }, { status, headers: extra });
}

/** Wandelt geworfene Fehler in eine JSON-Antwort, ohne interne Details preiszugeben. */
export function fehlerBehandeln(fehler: unknown) {
  if (fehler instanceof AgentApiFehler) {
    return fehlerAntwort(fehler.status, fehler.code, fehler.message);
  }
  console.error("Agent-API: unerwarteter Fehler", fehler);
  return fehlerAntwort(500, "interner_fehler", "Interner Fehler.");
}

/** Prüft das Rate-Limit für IP und (falls vorhanden) Token. */
export function rateLimitPruefen(limit: RateLimit, headers: Headers, token: string | null): Response | null {
  const schluessel = token ? `token:${token.slice(0, 16)}` : `ip:${clientIp(headers)}`;
  const ergebnis = limit.pruefe(schluessel);
  if (ergebnis.erlaubt) return null;
  return fehlerAntwort(429, "zu_viele_anfragen", "Zu viele Anfragen.", {
    "Retry-After": String(ergebnis.wiederholenNach),
  });
}

export { agentRateLimit, enrollRateLimit };

export function bearerToken(request: Request): string | null {
  return tokenAusHeader(request.headers.get("authorization"));
}

/** Liest und validiert den JSON-Rumpf; liefert bei Fehlern direkt eine Antwort. */
export async function jsonEingabe<T>(
  request: Request,
  schema: ZodType<T>,
): Promise<{ daten: T } | { antwort: Response }> {
  let rohdaten: unknown;
  try {
    rohdaten = await request.json();
  } catch {
    return { antwort: fehlerAntwort(400, "kein_json", "Der Anfragekörper ist kein gültiges JSON.") };
  }

  const ergebnis = schema.safeParse(rohdaten);
  if (!ergebnis.success) {
    const felder = ergebnis.error.issues.map((problem) => ({
      feld: problem.path.join("."),
      meldung: problem.message,
    }));
    return {
      antwort: Response.json(
        { ok: false, code: "validierung", fehler: "Eingabe ist ungültig.", felder },
        { status: 422 },
      ),
    };
  }

  return { daten: ergebnis.data };
}
