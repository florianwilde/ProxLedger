import Link from "next/link";
import { ContentHeader } from "@/components/layout/ContentHeader";
import { AblaufBadge, Badge } from "@/components/ui/Badges";
import { Card } from "@/components/ui/Card";
import { formatEuro } from "@/lib/format";
import { HEUTE } from "@/mock/data";
import { kundenUebersicht, summenVonKunde } from "@/mock/queries";

export const metadata = { title: "Kunden" };

export default function KundenSeite() {
  const uebersicht = kundenUebersicht();

  return (
    <>
      <ContentHeader titel="Kunden" brotkrumen={[{ titel: "Kunden" }]} />

      <div className="app-content">
        <div className="container-fluid">
          <Card
            titel={`${uebersicht.length} Kunden`}
            rahmen="primary"
            tabelle
            werkzeuge={<span className="btn btn-sm btn-primary disabled">Kunde anlegen (ab #006)</span>}
          >
            <div className="table-responsive">
              <table className="table table-striped align-middle">
                <thead>
                  <tr>
                    <th scope="col">Kunde</th>
                    <th scope="col">Kundennummer</th>
                    <th scope="col">Hosts</th>
                    <th scope="col">Aktiv</th>
                    <th scope="col">Nächster Ablauf</th>
                    <th scope="col">Warnungen</th>
                    <th scope="col">Rechnungen</th>
                    <th scope="col">Marge (netto)</th>
                  </tr>
                </thead>
                <tbody>
                  {uebersicht.map((eintrag) => {
                    const summen = summenVonKunde(eintrag.kunde.id);
                    return (
                      <tr key={eintrag.kunde.id}>
                        <td>
                          <Link
                            href={`/kunden/${eintrag.kunde.id}`}
                            className="fw-semibold text-decoration-none"
                          >
                            {eintrag.kunde.name}
                          </Link>
                          <div className="small text-body-secondary">
                            {eintrag.kunde.ansprechpartner ?? "–"}
                          </div>
                        </td>
                        <td className="pl-mono">{eintrag.kunde.kundennummer}</td>
                        <td>{eintrag.hosts}</td>
                        <td>{eintrag.aktiv}</td>
                        <td>
                          <AblaufBadge datum={eintrag.naechsterAblauf} heute={HEUTE} />
                        </td>
                        <td>
                          {eintrag.offeneAlerts > 0 ? (
                            <Badge farbe="warning">{eintrag.offeneAlerts} offen</Badge>
                          ) : (
                            <Badge farbe="success">keine</Badge>
                          )}
                        </td>
                        <td>
                          {eintrag.offeneRechnungspunkte > 0 ? (
                            <Badge farbe="danger">{eintrag.offeneRechnungspunkte} offen</Badge>
                          ) : (
                            <Badge farbe="success">erledigt</Badge>
                          )}
                        </td>
                        <td>{formatEuro(summen.marge)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
