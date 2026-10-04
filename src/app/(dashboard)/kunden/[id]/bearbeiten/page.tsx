import { notFound } from "next/navigation";
import { ContentHeader } from "@/components/layout/ContentHeader";
import { KundeFormular } from "@/components/kunden/KundeFormular";
import { Card } from "@/components/ui/Card";
import { prisma } from "@/lib/db";
import { kundeLoeschen } from "@/server/actions/kunden";

export const metadata = { title: "Kunde bearbeiten" };

export default async function KundeBearbeitenSeite({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const kunde = await prisma.kunde.findUnique({
    where: { id },
    include: { _count: { select: { hosts: true } } },
  });
  if (!kunde) notFound();

  return (
    <>
      <ContentHeader
        titel={`${kunde.name} bearbeiten`}
        brotkrumen={[
          { titel: "Kunden", href: "/kunden" },
          { titel: kunde.name, href: `/kunden/${kunde.id}` },
          { titel: "Bearbeiten" },
        ]}
      />
      <div className="app-content">
        <div className="container-fluid">
          <div className="row">
            <div className="col-lg-8">
              <Card titel="Stammdaten" rahmen="primary">
                <KundeFormular
                  werte={{
                    id: kunde.id,
                    name: kunde.name,
                    kundennummer: kunde.kundennummer,
                    ansprechpartner: kunde.ansprechpartner,
                    email: kunde.email,
                    telefon: kunde.telefon,
                    eigenbedarf: kunde.eigenbedarf,
                    notizen: kunde.notizen,
                  }}
                />
              </Card>

              <Card titel="Kunde löschen" rahmen="danger">
                <p>
                  Der Kunde wird mit allen Standorten und Kundenrechnungen entfernt. Seine{" "}
                  {kunde._count.hosts} Host(s) bleiben erhalten und erscheinen danach unter „Nicht
                  zugeordnet“.
                </p>
                <form action={kundeLoeschen}>
                  <input type="hidden" name="id" value={kunde.id} />
                  <button type="submit" className="btn btn-danger pl-touch-target">
                    Endgültig löschen
                  </button>
                </form>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
