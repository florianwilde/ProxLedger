import { basisUrl, skriptAntwort, skriptLaden } from "@/server/agent/skripte";

export const dynamic = "force-dynamic";

/** Aktuelles Agent-Skript, wird vom Installer und vom Update-Mechanismus geladen. */
export async function GET(request: Request) {
  const inhalt = await skriptLaden("proxledger-agent.sh", await basisUrl(request));
  return skriptAntwort(inhalt, "proxledger-agent.sh");
}
