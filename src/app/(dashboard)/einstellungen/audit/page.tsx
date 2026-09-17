import Link from "next/link";
import { ContentHeader } from "@/components/layout/ContentHeader";
import { Card } from "@/components/ui/Card";
import { prisma } from "@/lib/db";
import { formatDatumZeit } from "@/lib/format";

export const metadata = { title: "Protokoll" };

type SuchParameter = Promise<Record<string, string | string[] | undefined>>;

export default async function AuditSeite({ searchParams }: { searchParams: SuchParameter }) {
  const roh = await searchParams;
  const einzeln = (wert: string | string[] | undefined) => (Array.isArray(wert) ? wert[0] : wert);
  const aktion = einzeln(roh.aktion);
  const entitaet = einzeln(roh.entitaet);

  const [eintraege, aktionen] = await Promise.all([
    prisma.auditEintrag.findMany({
      where: {
        ...(aktion ? { aktion } : {}),
        ...(entitaet ? { entitaet } : {}),
      },
      orderBy: { erstelltAm: "desc" },
      take: 200,
      include: { benutzer: { select: { name: true, email: true } } },
    }),
    prisma.auditEintrag.groupBy({ by: ["aktion"], _count: { _all: true }, orderBy: { aktion: "asc" } }),
  ]);

  return (
    <>
      <ContentHeader titel="Protokoll" brotkrumen={[{ titel: "Einstellungen" }, { titel: "Protokoll" }]} />

      <div className="app-content">
        <div className="container-fluid">
          <Card titel={`Letzte ${eintraege.length} Einträge`} rahmen="primary" tabelle>
            <form className="row g-2 p-3 border-bottom">
              <div className="col-md-4">
                <select name="aktion" defaultValue={aktion ?? ""} className="form-select" aria-label="Aktion">
                  <option value="">Alle Aktionen</option>
                  {aktionen.map((eintrag) => (
                    <option key={eintrag.aktion} value={eintrag.aktion}>
                      {eintrag.aktion} ({eintrag._count._all})
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-3">
                <input
                  name="entitaet"
                  defaultValue={entitaet ?? ""}
                  className="form-control"
                  placeholder="Entität, z. B. Host"
                  aria-label="Entität"
                />
              </div>
              <div className="col-md-2">
                <button type="submit" className="btn btn-primary w-100">
                  Filtern
                </button>
              </div>
              <div className="col-md-3 d-flex align-items-center">
                {aktion || entitaet ? <Link href="/einstellungen/audit">Filter zurücksetzen</Link> : null}
              </div>
            </form>

            <div className="table-responsive">
              <table className="table table-striped align-middle">
                <thead>
                  <tr>
                    <th scope="col">Zeitpunkt</th>
                    <th scope="col">Aktion</th>
                    <th scope="col">Entität</th>
                    <th scope="col">Benutzer</th>
                    <th scope="col">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {eintraege.map((eintrag) => (
                    <tr key={eintrag.id}>
                      <td className="small">{formatDatumZeit(eintrag.erstelltAm)}</td>
                      <td className="pl-mono small">{eintrag.aktion}</td>
                      <td className="small">
                        {eintrag.entitaet}
                        {eintrag.entitaetId ? (
                          <div className="text-body-secondary pl-mono">{eintrag.entitaetId}</div>
                        ) : null}
                      </td>
                      <td className="small">{eintrag.benutzer?.name ?? "System"}</td>
                      <td className="small text-body-secondary" style={{ maxWidth: "28rem" }}>
                        <span className="d-inline-block text-truncate w-100">
                          {eintrag.aenderung ? JSON.stringify(eintrag.aenderung) : "–"}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {eintraege.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center text-body-secondary py-4">
                        Keine Einträge gefunden.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
