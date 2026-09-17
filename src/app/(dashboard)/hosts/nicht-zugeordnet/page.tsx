import { ContentHeader } from "@/components/layout/ContentHeader";
import { Callout } from "@/components/ui/Callout";
import { Card } from "@/components/ui/Card";
import { CopyableCode } from "@/components/ui/CopyableCode";
import { formatDatumZeit } from "@/lib/format";
import { kunden } from "@/mock/data";
import { PRODUKT_NAME, nichtZugeordneteHosts } from "@/mock/queries";

export const metadata = { title: "Nicht zugeordnete Hosts" };

export default function NichtZugeordnetSeite() {
  const liste = nichtZugeordneteHosts();

  return (
    <>
      <ContentHeader
        titel="Nicht zugeordnete Hosts"
        brotkrumen={[{ titel: "Hosts", href: "/hosts" }, { titel: "Nicht zugeordnet" }]}
      />

      <div className="app-content">
        <div className="container-fluid">
          <Callout titel="Schnellzuweisung" farbe="info">
            Mehrere Hosts auswählen und gemeinsam einem Kunden zuweisen. Im Prototyp ist das Formular noch
            ohne Funktion – die Zuweisung folgt in #006.
          </Callout>

          <Card titel={`${liste.length} Hosts ohne Kunde`} rahmen="warning" tabelle>
            <div className="table-responsive">
              <table className="table table-striped align-middle">
                <thead>
                  <tr>
                    <th scope="col">
                      <input type="checkbox" className="form-check-input" aria-label="Alle auswählen" />
                    </th>
                    <th scope="col">Host</th>
                    <th scope="col">Produkt</th>
                    <th scope="col">Server-ID</th>
                    <th scope="col">Key</th>
                    <th scope="col">Erste Meldung</th>
                  </tr>
                </thead>
                <tbody>
                  {liste.map((host) => (
                    <tr key={host.id}>
                      <td>
                        <input
                          type="checkbox"
                          className="form-check-input"
                          aria-label={`${host.hostname} auswählen`}
                          defaultChecked
                        />
                      </td>
                      <td className="fw-semibold">{host.hostname}</td>
                      <td>{PRODUKT_NAME[host.produkt]}</td>
                      <td>
                        <CopyableCode wert={host.serverId} />
                      </td>
                      <td>
                        <CopyableCode wert={host.subscription.key} />
                      </td>
                      <td>{formatDatumZeit(host.letzterReport)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card titel="Ausgewählte Hosts zuweisen">
            <div className="row g-2 align-items-end">
              <div className="col-md-5">
                <label className="form-label" htmlFor="kunde">
                  Kunde
                </label>
                <select id="kunde" className="form-select">
                  {kunden.map((kunde) => (
                    <option key={kunde.id}>{kunde.name}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-5">
                <label className="form-label" htmlFor="standort">
                  Standort (optional)
                </label>
                <select id="standort" className="form-select">
                  <option>– kein Standort –</option>
                  {kunden[0].standorte.map((standort) => (
                    <option key={standort.id}>{standort.name}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-2">
                <button type="button" className="btn btn-primary w-100" disabled>
                  Zuweisen
                </button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
