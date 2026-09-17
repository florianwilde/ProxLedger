import Link from "next/link";
import { ContentHeader } from "@/components/layout/ContentHeader";
import { Card } from "@/components/ui/Card";
import { CopyableCode } from "@/components/ui/CopyableCode";
import { formatDatum, formatEuro } from "@/lib/format";
import { hosts, laufzeiten } from "@/mock/data";
import { getKunde, istAbgeschlossen } from "@/mock/queries";

export const metadata = { title: "Rechnungen" };

export default async function RechnungenSeite({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter = "offen" } = await searchParams;
  const alle = laufzeiten.filter((l) => !l.vorschlag);
  const liste =
    filter === "erledigt"
      ? alle.filter(istAbgeschlossen)
      : filter === "alle"
        ? alle
        : alle.filter((l) => !istAbgeschlossen(l));

  return (
    <>
      <ContentHeader titel="Rechnungen" brotkrumen={[{ titel: "Rechnungen" }]} />

      <div className="app-content">
        <div className="container-fluid">
          <Card
            titel={`${liste.length} Laufzeiten`}
            rahmen="primary"
            tabelle
            werkzeuge={
              <div className="btn-group btn-group-sm" role="group" aria-label="Filter">
                {[
                  ["offen", "Offen"],
                  ["erledigt", "Erledigt"],
                  ["alle", "Alle"],
                ].map(([wert, text]) => (
                  <Link
                    key={wert}
                    href={`/rechnungen?filter=${wert}`}
                    className={`btn ${filter === wert ? "btn-primary" : "btn-outline-primary"}`}
                  >
                    {text}
                  </Link>
                ))}
              </div>
            }
          >
            <div className="table-responsive">
              <table className="table table-striped align-middle">
                <thead>
                  <tr>
                    <th scope="col">Kunde</th>
                    <th scope="col">Host</th>
                    <th scope="col">Laufzeit</th>
                    <th scope="col">Proxmox-Rechnung</th>
                    <th scope="col">Netto</th>
                    <th scope="col" className="text-center">
                      Proxmox bezahlt
                    </th>
                    <th scope="col">Kundenrechnung</th>
                    <th scope="col">Netto</th>
                    <th scope="col" className="text-center">
                      Kundenrechnung erstellt
                    </th>
                    <th scope="col">Marge</th>
                  </tr>
                </thead>
                <tbody>
                  {liste.map((laufzeit) => {
                    const host = hosts.find((h) => h.id === laufzeit.hostId);
                    const kunde = getKunde(host?.kundeId ?? null);
                    const marge = (laufzeit.verkauf?.nettoBetrag ?? 0) - (laufzeit.einkauf?.nettoBetrag ?? 0);
                    return (
                      <tr key={laufzeit.id}>
                        <td>
                          {kunde ? (
                            <Link href={`/kunden/${kunde.id}`} className="text-decoration-none">
                              {kunde.name}
                            </Link>
                          ) : (
                            <span className="badge pl-bg-neutral">Nicht zugeordnet</span>
                          )}
                        </td>
                        <td>
                          <Link href={`/hosts/${laufzeit.hostId}`} className="text-decoration-none">
                            {host?.hostname}
                          </Link>
                        </td>
                        <td>
                          {formatDatum(laufzeit.start)} – {formatDatum(laufzeit.ende)}
                        </td>
                        <td>
                          <CopyableCode wert={laufzeit.einkauf?.nummer ?? null} />
                        </td>
                        <td>{formatEuro(laufzeit.einkauf?.nettoBetrag)}</td>
                        <td className="text-center">
                          <input
                            type="checkbox"
                            className="form-check-input pl-touch-target"
                            defaultChecked={laufzeit.einkauf?.bezahlt ?? false}
                            aria-label="Proxmox-Rechnung bezahlt"
                          />
                        </td>
                        <td>
                          <CopyableCode wert={laufzeit.verkauf?.nummer ?? null} />
                        </td>
                        <td>{formatEuro(laufzeit.verkauf?.nettoBetrag)}</td>
                        <td className="text-center">
                          <input
                            type="checkbox"
                            className="form-check-input pl-touch-target"
                            defaultChecked={laufzeit.verkauf?.erstellt ?? false}
                            aria-label="Kundenrechnung erstellt"
                          />
                        </td>
                        <td className={marge >= 0 ? "pl-text-success" : "pl-text-danger"}>
                          {laufzeit.verkauf?.nettoBetrag ? formatEuro(marge) : "–"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
          <p className="small text-body-secondary">
            Im Prototyp sind die Häkchen noch ohne Wirkung. Ab #008 setzen sie den Status direkt.
          </p>
        </div>
      </div>
    </>
  );
}
