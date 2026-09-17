import { basisUrl, skriptAntwort, skriptLaden } from "@/server/agent/skripte";

export const dynamic = "force-dynamic";

/** Installationsskript für den One-Liner `curl -fsSL <url>/install.sh | bash -s -- --token …`. */
export async function GET(request: Request) {
  const inhalt = await skriptLaden("install.sh", basisUrl(request));
  return skriptAntwort(inhalt, "install.sh");
}
