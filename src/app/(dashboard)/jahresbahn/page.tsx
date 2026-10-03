import Link from "next/link";
import { ContentHeader } from "@/components/layout/ContentHeader";
import { AblaufBadge, EinkaufBadge, VerkaufBadge } from "@/components/ui/Badges";
import { Card } from "@/components/ui/Card";
import { CopyableCode } from "@/components/ui/CopyableCode";
import { formatDatum, formatTageBis } from "@/lib/format";
import { ablaufDaten } from "@/server/queries/jahresbahn";

export const metadata = { title: "Jahresbahn" };

const MONATE = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
const GESAMT_TAGE = 365;

export default async function JahresbahnSeite() {
  const jetzt = new Date();
  const { gruppen, naechste90Tage, abgelaufen } = await ablaufDaten(jetzt);

  // Die Bahn beginnt am Ersten des laufenden Monats und zeigt zwölf Monate.
  const start = new Date(Date.UTC(jetzt.getUTCFullYear(), jetzt.getUTCMonth(), 1));

  function position(datum: Date): number | null {
    const tage = Math.round((datum.getTime() - start.getTime()) / 86_400_000);
    if (tage < 0 || tage > GESAMT_TAGE) return null;
    return (tage / GESAMT_TAGE) * 100;
  }

  const heutePosition = position(jetzt) ?? 0;
  const monate = Array.from({ length: 12 }, (_, i) => {
    const datum = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 1));
    return `${MONATE[datum.getUTCMonth()]} ${String(datum.getUTCFullYear()).slice(2)}`;
  });

  return (
    <>
      <ContentHeader titel="Jahresbahn" brotkrumen={[{ titel: "Jahresbahn" }]} />

      <div className="app-content">
        <div className="container-fluid">
          <Card titel="Abläufe der nächsten zwölf Monate" rahmen="primary">
            {gruppen.length === 0 ? (
              <p className="mb-0 text-body-secondary">Noch kein Host mit Ablaufdatum gemeldet.</p>
            ) : (
              <div className="table-responsive">
                <div className="pl-timeline">
                  <div className="d-flex text-body-secondary small mb-2 pl-timeline-kopf">
                    {monate.map((monat) => (
                      <div key={monat} style={{ width: `${100 / 12}%` }}>
                        {monat}
                      </div>
                    ))}
                  </div>

                  {gruppen.map((gruppe) => (
                    <div key={gruppe.kundeId ?? "ohne"} className="mb-3">
                      <div className="fw-semibold small mb-1">
                        {gruppe.kundeId ? (
                          <Link href={`/kunden/${gruppe.kundeId}`} className="text-decoration-none">
                            {gruppe.name}
                          </Link>
                        ) : (
                          <span className="badge pl-bg-neutral">{gruppe.name}</span>
                        )}
                      </div>

                      {gruppe.eintraege.map((eintrag) => {
                        const links = position(eintrag.ablauf);
                        const farbe =
                          eintrag.tage < 14
                            ? "var(--pl-danger)"
                            : eintrag.tage < 30
                              ? "var(--pl-warning)"
                              : "var(--pl-info)";
                        return (
                          <div key={eintrag.hostId} className="d-flex align-items-center mb-1">
                            <div className="small text-truncate pl-timeline-name">
                              <Link href={`/hosts/${eintrag.hostId}`} className="text-decoration-none">
                                {eintrag.hostname}
                              </Link>
                            </div>
                            <div className="pl-timeline-row flex-grow-1 position-relative">
                              <div className="pl-timeline-heute" style={{ left: `${heutePosition}%` }} />
                              {links === null ? (
                                <span className="small text-body-secondary ms-2">
                                  außerhalb des Zeitraums ({formatDatum(eintrag.ablauf)})
                                </span>
                              ) : (
                                <Link
                                  href={
                                    eintrag.laufzeitId
                                      ? `/rechnungen/${eintrag.laufzeitId}`
                                      : `/hosts/${eintrag.hostId}`
                                  }
                                  className="pl-timeline-bar text-decoration-none"
                                  style={{
                                    left: `${Math.min(92, Math.max(0, links - 5))}%`,
                                    backgroundColor: farbe,
                                    color: farbe === "var(--pl-warning)" ? "var(--pl-warning-text)" : "#fff",
                                  }}
                                  title={`${eintrag.hostname} läuft am ${formatDatum(eintrag.ablauf)} ab`}
                                >
                                  {formatDatum(eintrag.ablauf)}
                                </Link>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="small text-body-secondary mb-0">
              <span className="d-md-none">Seitwärts wischen zeigt die späteren Monate. </span>Die rote
              Linie markiert heute ({formatDatum(jetzt)}). Balkenfarbe: rot unter 14 Tagen, gelb
              unter 30 Tagen, sonst blau. Ein Klick führt zur Laufzeit mit ihren Rechnungen.
            </p>
          </Card>

          <div className="row">
            <div className="col-lg-8">
              <Card
                titel={`Ablauf-Kalender: nächste 90 Tage (${naechste90Tage.length})`}
                rahmen="warning"
                tabelle
              >
                <div className="table-responsive">
                  <table className="table table-striped align-middle pl-karten-tabelle">
                    <thead>
                      <tr>
                        <th scope="col">Host</th>
                        <th scope="col">Ablauf</th>
                        <th scope="col">Kunde</th>
                        <th scope="col">Key</th>
                        <th scope="col">Proxmox</th>
                        <th scope="col">Kundenrechnung</th>
                      </tr>
                    </thead>
                    <tbody>
                      {naechste90Tage.map((eintrag) => (
                        <tr key={eintrag.hostId}>
                          <td className="pl-karten-kopf">
                            <Link href={`/hosts/${eintrag.hostId}`} className="fw-semibold text-decoration-none">
                              {eintrag.hostname}
                            </Link>
                          </td>
                          <td data-label="Ablauf">
                            <AblaufBadge datum={eintrag.ablauf.toISOString()} heute={jetzt} />
                          </td>
                          <td data-label="Kunde">
                            {eintrag.kunde ? (
                              <Link href={`/kunden/${eintrag.kunde.id}`} className="text-decoration-none">
                                {eintrag.kunde.name}
                              </Link>
                            ) : (
                              <span className="badge pl-bg-neutral">Nicht zugeordnet</span>
                            )}
                          </td>
                          <td data-label="Key">
                            <CopyableCode wert={eintrag.key} />
                          </td>
                          <td data-label="Proxmox">
                            <EinkaufBadge bezahlt={eintrag.einkaufBezahlt} />
                          </td>
                          <td data-label="Kundenrechnung">
                            <VerkaufBadge erstellt={eintrag.verkaufErstellt ?? false} bezahlt={false} />
                          </td>
                        </tr>
                      ))}
                      {naechste90Tage.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center text-body-secondary py-4">
                            In den nächsten 90 Tagen läuft nichts ab.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>

            <div className="col-lg-4">
              <Card
                titel={`Bereits abgelaufen (${abgelaufen.length})`}
                rahmen={abgelaufen.length > 0 ? "danger" : "info"}
              >
                {abgelaufen.length === 0 ? (
                  <p className="mb-0 text-body-secondary">Keine abgelaufenen Subscriptions.</p>
                ) : (
                  <ul className="list-unstyled mb-0">
                    {abgelaufen.map((eintrag) => (
                      <li key={eintrag.hostId} className="mb-2">
                        <Link href={`/hosts/${eintrag.hostId}`} className="fw-semibold text-decoration-none">
                          {eintrag.hostname}
                        </Link>
                        <div className="small text-body-secondary">
                          {eintrag.kunde?.name ?? "Nicht zugeordnet"} · {formatDatum(eintrag.ablauf)} (
                          {formatTageBis(eintrag.tage)})
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
