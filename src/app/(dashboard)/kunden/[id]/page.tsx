import Link from "next/link";
import { notFound } from "next/navigation";
import { ContentHeader } from "@/components/layout/ContentHeader";
import {
  AblaufBadge,
  EinkaufBadge,
  KeineMeldungBadge,
  StatusBadge,
  VerkaufBadge,
} from "@/components/ui/Badges";
import { Card } from "@/components/ui/Card";
import { CopyableCode } from "@/components/ui/CopyableCode";
import { InfoBox } from "@/components/ui/SmallBox";
import { formatDatum, formatEuro } from "@/lib/format";
import { HEUTE, kunden } from "@/mock/data";
import {
  PRODUKT_NAME,
  alertsVonKunde,
  getKunde,
  hostMeldetNicht,
  hostsVonKunde,
  laufzeitenVonKunde,
  summenProJahr,
  summenVonKunde,
} from "@/mock/queries";

export function generateStaticParams() {
  return kunden.map((kunde) => ({ id: kunde.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return { title: getKunde(id)?.name ?? "Kunde" };
}

export default async function KundenDetailSeite({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const kunde = getKunde(id);
  if (!kunde) notFound();

  const eigeneHosts = hostsVonKunde(kunde.id);
  const laufzeiten = laufzeitenVonKunde(kunde.id);
  const summen = summenVonKunde(kunde.id);
  const proJahr = summenProJahr(laufzeiten);
  const alerts = alertsVonKunde(kunde.id);

  return (
    <>
      <ContentHeader
        titel={kunde.name}
        brotkrumen={[{ titel: "Kunden", href: "/kunden" }, { titel: kunde.name }]}
      />

      <div className="app-content">
        <div className="container-fluid">
          <div className="row">
            <div className="col-6 col-lg-3">
              <InfoBox text="Hosts" wert={String(eigeneHosts.length)} icon="bi-hdd-stack" farbe="info" />
            </div>
            <div className="col-6 col-lg-3">
              <InfoBox
                text="Einkauf netto"
                wert={formatEuro(summen.einkauf)}
                icon="bi-cart"
                farbe="neutral"
              />
            </div>
            <div className="col-6 col-lg-3">
              <InfoBox
                text="Verkauf netto"
                wert={formatEuro(summen.verkauf)}
                icon="bi-receipt"
                farbe="primary"
              />
            </div>
            <div className="col-6 col-lg-3">
              <InfoBox
                text="Marge"
                wert={formatEuro(summen.marge)}
                icon="bi-graph-up-arrow"
                farbe="success"
              />
            </div>
          </div>

          <div className="row">
            <div className="col-lg-4">
              <Card titel="Stammdaten" rahmen="primary">
                <dl className="row mb-0">
                  <dt className="col-5 fw-normal text-body-secondary">Kundennummer</dt>
                  <dd className="col-7 pl-mono">{kunde.kundennummer}</dd>
                  <dt className="col-5 fw-normal text-body-secondary">Ansprechpartner</dt>
                  <dd className="col-7">{kunde.ansprechpartner ?? "–"}</dd>
                  <dt className="col-5 fw-normal text-body-secondary">E-Mail</dt>
                  <dd className="col-7">
                    {kunde.email ? <a href={`mailto:${kunde.email}`}>{kunde.email}</a> : "–"}
                  </dd>
                  <dt className="col-5 fw-normal text-body-secondary">Telefon</dt>
                  <dd className="col-7">{kunde.telefon ?? "–"}</dd>
                  <dt className="col-5 fw-normal text-body-secondary">Standorte</dt>
                  <dd className="col-7">
                    {kunde.standorte.map((s) => (
                      <div key={s.id}>
                        {s.name}
                        {s.ort ? <span className="text-body-secondary"> · {s.ort}</span> : null}
                      </div>
                    ))}
                  </dd>
                </dl>
                <hr />
                <h4 className="h6">Notizen</h4>
                <p className="mb-0 small">
                  {kunde.notizen ?? <span className="text-body-secondary">Keine Notizen hinterlegt.</span>}
                </p>
              </Card>

              <Card titel="Offene Warnungen" rahmen={alerts.length > 0 ? "danger" : "info"}>
                {alerts.length === 0 ? (
                  <p className="mb-0 text-body-secondary">Keine offenen Warnungen.</p>
                ) : (
                  <ul className="list-unstyled mb-0 small">
                    {alerts.map((alert) => (
                      <li key={alert.id} className="mb-2">
                        <strong>{alert.titel}</strong>
                        <div className="text-body-secondary">{alert.beschreibung}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>

            <div className="col-lg-8">
              <Card titel="Hosts" rahmen="primary" tabelle>
                <div className="table-responsive">
                  <table className="table table-striped align-middle">
                    <thead>
                      <tr>
                        <th scope="col">Host</th>
                        <th scope="col">Produkt</th>
                        <th scope="col">Status</th>
                        <th scope="col">Key</th>
                        <th scope="col">Ablauf</th>
                      </tr>
                    </thead>
                    <tbody>
                      {eigeneHosts.map((host) => (
                        <tr key={host.id}>
                          <td>
                            <Link href={`/hosts/${host.id}`} className="fw-semibold text-decoration-none">
                              {host.hostname}
                            </Link>
                            {hostMeldetNicht(host) ? <KeineMeldungBadge /> : null}
                          </td>
                          <td>{PRODUKT_NAME[host.produkt]}</td>
                          <td>
                            <StatusBadge status={host.subscription.status} />
                          </td>
                          <td>
                            <CopyableCode wert={host.subscription.key} />
                          </td>
                          <td>
                            <AblaufBadge datum={host.subscription.nextduedate} heute={HEUTE} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              <Card titel="Laufzeiten und Rechnungen" rahmen="info" tabelle>
                <div className="table-responsive">
                  <table className="table table-striped align-middle">
                    <thead>
                      <tr>
                        <th scope="col">Laufzeit</th>
                        <th scope="col">Host</th>
                        <th scope="col">Proxmox</th>
                        <th scope="col">Einkauf</th>
                        <th scope="col">Kundenrechnung</th>
                        <th scope="col">Verkauf</th>
                      </tr>
                    </thead>
                    <tbody>
                      {laufzeiten.map((laufzeit) => {
                        const host = eigeneHosts.find((h) => h.id === laufzeit.hostId);
                        return (
                          <tr key={laufzeit.id}>
                            <td>
                              {formatDatum(laufzeit.start)} – {formatDatum(laufzeit.ende)}
                              {laufzeit.vorschlag ? (
                                <span className="badge pl-bg-info ms-2">Vorschlag</span>
                              ) : null}
                            </td>
                            <td>{host?.hostname ?? "–"}</td>
                            <td>
                              <CopyableCode wert={laufzeit.einkauf?.nummer ?? null} />
                              <div>
                                <EinkaufBadge bezahlt={laufzeit.einkauf ? laufzeit.einkauf.bezahlt : null} />
                              </div>
                            </td>
                            <td>{formatEuro(laufzeit.einkauf?.nettoBetrag)}</td>
                            <td>
                              <CopyableCode wert={laufzeit.verkauf?.nummer ?? null} />
                              <div>
                                <VerkaufBadge
                                  erstellt={laufzeit.verkauf?.erstellt ?? false}
                                  bezahlt={laufzeit.verkauf?.bezahlt ?? false}
                                />
                              </div>
                            </td>
                            <td>{formatEuro(laufzeit.verkauf?.nettoBetrag)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>

              <Card titel="Summen pro Jahr" rahmen="info" tabelle>
                <table className="table table-striped align-middle mb-0">
                  <thead>
                    <tr>
                      <th scope="col">Jahr</th>
                      <th scope="col">Einkauf netto</th>
                      <th scope="col">Verkauf netto</th>
                      <th scope="col">Marge</th>
                    </tr>
                  </thead>
                  <tbody>
                    {proJahr.map((jahr) => (
                      <tr key={jahr.jahr}>
                        <td>{jahr.jahr}</td>
                        <td>{formatEuro(jahr.einkauf)}</td>
                        <td>{formatEuro(jahr.verkauf)}</td>
                        <td className={jahr.marge >= 0 ? "pl-text-success" : "pl-text-danger"}>
                          {formatEuro(jahr.marge)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
