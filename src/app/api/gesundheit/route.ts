import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Einfache Zustandsprüfung für Container und Reverse Proxy. */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ ok: true, datenbank: "erreichbar", zeit: new Date().toISOString() });
  } catch {
    return Response.json({ ok: false, datenbank: "nicht erreichbar" }, { status: 503 });
  }
}
