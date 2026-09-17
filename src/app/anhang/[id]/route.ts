import { readFile } from "node:fs/promises";
import { prisma } from "@/lib/db";
import { anhangPfad } from "@/lib/uploads";

export const dynamic = "force-dynamic";

/** Liefert ein hinterlegtes Rechnungs-PDF aus. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const anhang = await prisma.anhang.findUnique({ where: { id } });
  if (!anhang) return new Response("Nicht gefunden", { status: 404 });

  try {
    const inhalt = await readFile(anhangPfad(anhang.pfad));
    return new Response(new Uint8Array(inhalt), {
      headers: {
        "Content-Type": anhang.mimeTyp,
        "Content-Disposition": `inline; filename="${encodeURIComponent(anhang.dateiname)}"`,
        "Content-Length": String(inhalt.length),
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return new Response("Datei fehlt auf der Platte", { status: 410 });
  }
}
