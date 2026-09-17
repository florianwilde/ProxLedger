import Link from "next/link";
import { ContentHeader } from "@/components/layout/ContentHeader";
import { PruefenKnopf } from "@/components/alerts/PruefenKnopf";
import { Badge } from "@/components/ui/Badges";
import { Card } from "@/components/ui/Card";
import { InfoBox } from "@/components/ui/SmallBox";
import { prisma } from "@/lib/db";
import { formatDatumZeit } from "@/lib/format";
import { alertQuittieren, alertSchliessen } from "@/server/actions/alerts";

export const metadata = { title: "Warnungen" };

type SuchParameter = Promise<Record<string, string | string[] | undefined>>;

const SCHWERE_FARBE = { GEFAHR: "danger", WARNUNG: "warning", INFO: "info" } as const;

export default async function WarnungenSeite({ searchParams }: { searchParams: SuchParameter }) {
  const roh = await searchParams;
  const status = (Array.isArray(roh.status) ? roh.status[0] : roh.status) ?? "offen";

  const [alerts, zahlen] = await Promise.all([
    prisma.alert.findMany({
      where: status === "erledigt" ? { erledigtAm: { not: null } } : { erledigtAm: null },
      orderBy: [{ schwere: "asc" }, { geoeffnetAm: "desc" }],
      take: 200,
      include: {
        host: { select: { id: true, hostname: true } },
        kunde: { select: { id: true, name: true } },
        laufzeit: { select: { id: true } },
      },
    }),
    prisma.alert.groupBy({
      by: ["schwere"],
      where: { erledigtAm: null },
      _count: { _all: true },
    }),
  ]);

  const anzahl = (schwere: string) => zahlen.find((z) => z.schwere === schwere)?._count._all ?? 0;

  return (
    <>
      <ContentHeader titel="Warnungen" brotkrumen={[{ titel: "Warnungen" }]} aktion={<PruefenKnopf />} />

      <div className="app-content">
        <div className="container-fluid">
          <div className="row">
            <div className="col-6 col-lg-3">
              <InfoBox
                text="Gefahr"
                wert={String(anzahl("GEFAHR"))}
                icon="bi-exclamation-octagon"
                farbe="danger"
              />
            </div>
            <div className="col-6 col-lg-3">
              <InfoBox
                text="Warnung"
                wert={String(anzahl("WARNUNG"))}
                icon="bi-exclamation-triangle"
                farbe="warning"
              />
            </div>
            <div className="col-6 col-lg-3">
              <InfoBox text="Hinweis" wert={String(anzahl("INFO"))} icon="bi-info-circle" farbe="info" />
            </div>
            <div className="col-6 col-lg-3">
              <InfoBox
                text="Offen gesamt"
                wert={String(anzahl("GEFAHR") + anzahl("WARNUNG") + anzahl("INFO"))}
                icon="bi-bell"
                farbe="neutral"
              />
            </div>
          </div>

          <Card
            titel={status === "erledigt" ? "Erledigte Warnungen" : "Offene Warnungen"}
            rahmen={status === "erledigt" ? "info" : "danger"}
            tabelle
            werkzeuge={
              <div className="btn-group btn-group-sm" role="group" aria-label="Filter">
                <Link
                  href="/warnungen"
                  className={`btn ${status !== "erledigt" ? "btn-primary" : "btn-outline-primary"}`}
                >
                  Offen
                </Link>
                <Link
                  href="/warnungen?status=erledigt"
                  className={`btn ${status === "erledigt" ? "btn-primary" : "btn-outline-primary"}`}
                >
                  Erledigt
                </Link>
              </div>
            }
          >
            <div className="table-responsive">
              <table className="table table-striped align-middle">
                <thead>
                  <tr>
                    <th scope="col">Schwere</th>
                    <th scope="col">Warnung</th>
                    <th scope="col">Betrifft</th>
                    <th scope="col">Seit</th>
                    <th scope="col" className="text-end">
                      Aktion
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.map((alert) => (
                    <tr key={alert.id}>
                      <td>
                        <Badge farbe={SCHWERE_FARBE[alert.schwere]}>
                          {alert.schwere === "GEFAHR"
                            ? "Gefahr"
                            : alert.schwere === "WARNUNG"
                              ? "Warnung"
                              : "Hinweis"}
                        </Badge>
                      </td>
                      <td>
                        <span className="fw-semibold">{alert.titel}</span>
                        <div className="small text-body-secondary">{alert.beschreibung}</div>
                        <div className="small text-body-secondary pl-mono">{alert.regel}</div>
                      </td>
                      <td className="small">
                        {alert.host ? (
                          <div>
                            <Link href={`/hosts/${alert.host.id}`}>{alert.host.hostname}</Link>
                          </div>
                        ) : null}
                        {alert.kunde ? (
                          <div>
                            <Link href={`/kunden/${alert.kunde.id}`}>{alert.kunde.name}</Link>
                          </div>
                        ) : null}
                        {alert.laufzeit ? (
                          <div>
                            <Link href={`/rechnungen/${alert.laufzeit.id}`}>Laufzeit öffnen</Link>
                          </div>
                        ) : null}
                      </td>
                      <td className="small">
                        {formatDatumZeit(alert.geoeffnetAm)}
                        {alert.quittiertAm ? <div className="text-body-secondary">quittiert</div> : null}
                        {alert.erledigtAm ? (
                          <div className="text-body-secondary">
                            erledigt {formatDatumZeit(alert.erledigtAm)}
                          </div>
                        ) : null}
                      </td>
                      <td className="text-end">
                        {alert.erledigtAm ? null : (
                          <div className="d-flex gap-2 justify-content-end">
                            {alert.quittiertAm ? null : (
                              <form action={alertQuittieren}>
                                <input type="hidden" name="id" value={alert.id} />
                                <button type="submit" className="btn btn-sm btn-outline-secondary">
                                  Quittieren
                                </button>
                              </form>
                            )}
                            <form action={alertSchliessen}>
                              <input type="hidden" name="id" value={alert.id} />
                              <button
                                type="submit"
                                className="btn btn-sm btn-outline-danger"
                                title="Schließt die Warnung; besteht die Ursache weiter, kommt sie beim nächsten Durchlauf zurück"
                              >
                                Schließen
                              </button>
                            </form>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {alerts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center text-body-secondary py-4">
                        {status === "erledigt" ? "Noch nichts erledigt." : "Keine offenen Warnungen."}
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </Card>

          <p className="small text-body-secondary">
            Die Regeln laufen stündlich im Worker und nach jedem eingehenden Report.{" "}
            <Link href="/einstellungen/warnregeln">Schwellwerte ändern</Link>
          </p>
        </div>
      </div>
    </>
  );
}
