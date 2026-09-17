import Link from "next/link";
import { ContentHeader } from "@/components/layout/ContentHeader";
import { Card } from "@/components/ui/Card";
import { formatDatum, tageBis } from "@/lib/format";
import { HEUTE, hosts, kunden } from "@/mock/data";

export const metadata = { title: "Jahresbahn" };

const MONATE = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

export default function JahresbahnSeite() {
  const start = new Date(Date.UTC(HEUTE.getUTCFullYear(), HEUTE.getUTCMonth(), 1));
  const gesamtTage = 365;

  function position(datum: string): number | null {
    const tage = Math.round((new Date(datum).getTime() - start.getTime()) / 86_400_000);
    if (tage < 0 || tage > gesamtTage) return null;
    return (tage / gesamtTage) * 100;
  }

  const heutePosition = position(HEUTE.toISOString().slice(0, 10)) ?? 0;

  const monatsBeschriftung = Array.from({ length: 12 }, (_, i) => {
    const datum = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 1));
    return `${MONATE[datum.getUTCMonth()]} ${String(datum.getUTCFullYear()).slice(2)}`;
  });

  return (
    <>
      <ContentHeader titel="Jahresbahn" brotkrumen={[{ titel: "Jahresbahn" }]} />

      <div className="app-content">
        <div className="container-fluid">
          <Card titel="Abläufe der nächsten 12 Monate" rahmen="primary">
            <div className="table-responsive">
              <div style={{ minWidth: "760px" }}>
                <div className="d-flex text-body-secondary small mb-2" style={{ marginLeft: "12rem" }}>
                  {monatsBeschriftung.map((monat) => (
                    <div key={monat} style={{ width: `${100 / 12}%` }}>
                      {monat}
                    </div>
                  ))}
                </div>

                {kunden.map((kunde) => {
                  const eigene = hosts.filter(
                    (h) => h.kundeId === kunde.id && h.subscription.nextduedate !== null,
                  );
                  if (eigene.length === 0) return null;
                  return (
                    <div key={kunde.id} className="mb-3">
                      <div className="fw-semibold small mb-1">
                        <Link href={`/kunden/${kunde.id}`} className="text-decoration-none">
                          {kunde.name}
                        </Link>
                      </div>
                      {eigene.map((host) => {
                        const datum = host.subscription.nextduedate!;
                        const links = position(datum.slice(0, 10));
                        const tage = tageBis(datum, HEUTE);
                        const farbe =
                          tage === null || tage < 14
                            ? "var(--pl-danger)"
                            : tage < 30
                              ? "var(--pl-warning)"
                              : "var(--pl-info)";
                        return (
                          <div key={host.id} className="d-flex align-items-center mb-1">
                            <div className="small text-truncate" style={{ width: "12rem" }}>
                              <Link href={`/hosts/${host.id}`} className="text-decoration-none">
                                {host.hostname}
                              </Link>
                            </div>
                            <div className="pl-timeline-row flex-grow-1 position-relative">
                              <div className="pl-timeline-heute" style={{ left: `${heutePosition}%` }} />
                              {links === null ? (
                                <span className="small text-body-secondary ms-2">
                                  außerhalb des Zeitraums ({formatDatum(datum)})
                                </span>
                              ) : (
                                <div
                                  className="pl-timeline-bar"
                                  style={{
                                    left: `${Math.max(0, links - 6)}%`,
                                    backgroundColor: farbe,
                                    color: farbe === "var(--pl-warning)" ? "var(--pl-warning-text)" : "#fff",
                                  }}
                                  title={`${host.hostname} läuft am ${formatDatum(datum)} ab`}
                                >
                                  {formatDatum(datum)}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
            <p className="small text-body-secondary mb-0">
              Die rote Linie markiert heute ({formatDatum(HEUTE)}). Farbe der Balken: rot unter 14 Tagen, gelb
              unter 30 Tagen, sonst blau.
            </p>
          </Card>
        </div>
      </div>
    </>
  );
}
