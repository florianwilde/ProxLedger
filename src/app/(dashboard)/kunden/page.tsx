import Link from "next/link";
import { ContentHeader } from "@/components/layout/ContentHeader";
import { AblaufBadge, Badge } from "@/components/ui/Badges";
import { Card } from "@/components/ui/Card";
import { kundenListe, offeneRechnungspunkteProKunde } from "@/server/queries/kunden";

export const metadata = { title: "Kunden" };

export default async function KundenSeite() {
  const [kunden, rechnungspunkte] = await Promise.all([kundenListe(), offeneRechnungspunkteProKunde()]);
  const heute = new Date();

  return (
    <>
      <ContentHeader titel="Kunden" brotkrumen={[{ titel: "Kunden" }]} />

      <div className="app-content">
        <div className="container-fluid">
          <Card
            titel={`${kunden.length} Kunden`}
            rahmen="primary"
            tabelle
            werkzeuge={
              <Link href="/kunden/neu" className="btn btn-sm btn-primary">
                <i className="bi bi-plus-lg me-1" aria-hidden="true" />
                Kunde anlegen
              </Link>
            }
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
                  </tr>
                </thead>
                <tbody>
                  {kunden.map((kunde) => {
                    const punkte = rechnungspunkte.get(kunde.id);
                    return (
                      <tr key={kunde.id}>
                        <td>
                          <Link href={`/kunden/${kunde.id}`} className="fw-semibold text-decoration-none">
                            {kunde.name}
                          </Link>
                          <div className="small text-body-secondary">{kunde.ansprechpartner ?? "–"}</div>
                        </td>
                        <td className="pl-mono">{kunde.kundennummer}</td>
                        <td>{kunde.hosts}</td>
                        <td>{kunde.aktiv}</td>
                        <td>
                          <AblaufBadge datum={kunde.naechsterAblauf?.toISOString() ?? null} heute={heute} />
                        </td>
                        <td>
                          {kunde.offeneAlerts > 0 ? (
                            <Badge farbe="warning">{kunde.offeneAlerts} offen</Badge>
                          ) : (
                            <Badge farbe="success">keine</Badge>
                          )}
                        </td>
                        <td>
                          {punkte && punkte.offen > 0 ? (
                            <Badge farbe="danger">{punkte.offen} offen</Badge>
                          ) : (
                            <Badge farbe="success">erledigt</Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {kunden.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center text-body-secondary py-4">
                        Noch keine Kunden angelegt.{" "}
                        <Link href="/kunden/neu">Jetzt den ersten Kunden anlegen.</Link>
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
