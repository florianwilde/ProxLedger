import Link from "next/link";
import { notFound } from "next/navigation";
import { ContentHeader } from "@/components/layout/ContentHeader";
import {
  AblaufBadge,
  Badge,
  EinkaufBadge,
  KeineMeldungBadge,
  StatusBadge,
  VerkaufBadge,
} from "@/components/ui/Badges";
import { Card } from "@/components/ui/Card";
import { CopyableCode } from "@/components/ui/CopyableCode";
import { Tabs } from "@/components/ui/Tabs";
import { formatDatum, formatDatumZeit, formatEuro, formatUptime, formatZahl } from "@/lib/format";
import { HEUTE } from "@/mock/data";
import {
  PRODUKT_NAME,
  alertsVonHost,
  getHost,
  getKunde,
  hostMeldetNicht,
  laufzeitenVonHost,
  reportsVonHost,
} from "@/mock/queries";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return { title: getHost(id)?.hostname ?? "Host" };
}

function Zeile({ bezeichnung, children }: { bezeichnung: string; children: React.ReactNode }) {
  return (
    <div className="d-flex justify-content-between gap-3 py-2 border-bottom">
      <span className="text-body-secondary">{bezeichnung}</span>
      <span className="text-end">{children}</span>
    </div>
  );
}

export default async function HostDetailSeite({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const host = getHost(id);
  if (!host) notFound();

  const kunde = getKunde(host.kundeId);
  const standort = kunde?.standorte.find((s) => s.id === host.standortId);
  const laufzeiten = laufzeitenVonHost(host.id);
  const reports = reportsVonHost(host.id);
  const alerts = alertsVonHost(host.id);
  const keys = [...new Set(laufzeiten.map((l) => l.key))];

  return (
    <>
      <ContentHeader
        titel={host.hostname}
        brotkrumen={[{ titel: "Hosts", href: "/hosts" }, { titel: host.hostname }]}
        aktion={<StatusBadge status={host.subscription.status} />}
      />

      <div className="app-content">
        <div className="container-fluid">
          {alerts.length > 0 ? (
            <div className="row">
              <div className="col-12">
                <Card titel="Offene Warnungen" rahmen="danger">
                  <ul className="list-unstyled mb-0">
                    {alerts.map((alert) => (
                      <li key={alert.id} className="mb-2">
                        <Badge
                          farbe={
                            alert.schwere === "gefahr"
                              ? "danger"
                              : alert.schwere === "warnung"
                                ? "warning"
                                : "info"
                          }
                        >
                          {alert.titel}
                        </Badge>{" "}
                        <span className="small text-body-secondary">{alert.beschreibung}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              </div>
            </div>
          ) : null}

          <div className="row">
            <div className="col-lg-4">
              <Card titel="Host" rahmen="primary">
                <div className="text-center mb-3">
                  <i className="bi bi-hdd-rack fs-1 text-body-secondary" aria-hidden="true" />
                  <h2 className="h5 mt-2 mb-1">{host.hostname}</h2>
                  <div className="text-body-secondary small">{host.fqdn ?? "Kein FQDN gemeldet"}</div>
                  {hostMeldetNicht(host) ? <KeineMeldungBadge /> : null}
                </div>

                <Zeile bezeichnung="Kunde">
                  {kunde ? (
                    <Link href={`/kunden/${kunde.id}`}>{kunde.name}</Link>
                  ) : (
                    <Link href="/hosts/nicht-zugeordnet" className="badge pl-bg-neutral text-decoration-none">
                      Nicht zugeordnet
                    </Link>
                  )}
                </Zeile>
                <Zeile bezeichnung="Standort">{standort?.name ?? "–"}</Zeile>
                <Zeile bezeichnung="Produkt">{PRODUKT_NAME[host.produkt]}</Zeile>
                <Zeile bezeichnung="Version">{host.produktVersion ?? "–"}</Zeile>
                <Zeile bezeichnung="Kernel">{host.kernel ?? "–"}</Zeile>
                <Zeile bezeichnung="Server-ID">
                  <CopyableCode wert={host.serverId} />
                </Zeile>
                <Zeile bezeichnung="Cluster / Node">
                  {host.clusterName ? `${host.clusterName} / ${host.nodeName}` : "–"}
                </Zeile>
                <Zeile bezeichnung="IP-Adressen">{host.ips.join(", ")}</Zeile>
                <Zeile bezeichnung="CPU">{host.cpuModell ?? "–"}</Zeile>
                <Zeile bezeichnung="Sockets (lizenziert / physisch)">
                  {host.subscription.lizenzierteSockets ?? "–"} / {host.sockets ?? "–"}
                </Zeile>
                <Zeile bezeichnung="Uptime">{formatUptime(host.uptimeSekunden)}</Zeile>
                <Zeile bezeichnung="Paket-Updates">{formatZahl(host.paketUpdates)}</Zeile>
                <Zeile bezeichnung="Agent-Version">{host.agentVersion}</Zeile>
                <Zeile bezeichnung="Letzte Meldung">{formatDatumZeit(host.letzterReport)}</Zeile>
                <div className="d-grid gap-2 mt-3">
                  <span className="btn btn-outline-secondary disabled">Kunde ändern (ab #006)</span>
                </div>
              </Card>
            </div>

            <div className="col-lg-8">
              <Tabs
                tabs={[
                  {
                    id: "uebersicht",
                    titel: "Übersicht",
                    icon: "bi-info-circle",
                    inhalt: (
                      <>
                        <Zeile bezeichnung="Subscription-Key">
                          <CopyableCode wert={host.subscription.key} />
                        </Zeile>
                        <Zeile bezeichnung="Status">
                          <StatusBadge status={host.subscription.status} />
                        </Zeile>
                        <Zeile bezeichnung="Produktname">{host.subscription.produktname ?? "–"}</Zeile>
                        <Zeile bezeichnung="Level">{host.subscription.level ?? "–"}</Zeile>
                        <Zeile bezeichnung="Registriert am">{formatDatum(host.subscription.regdate)}</Zeile>
                        <Zeile bezeichnung="Läuft ab am">
                          <AblaufBadge datum={host.subscription.nextduedate} heute={HEUTE} />
                        </Zeile>
                        <Zeile bezeichnung="Letzte Prüfung durch Proxmox">
                          {formatDatumZeit(host.subscription.checktime)}
                        </Zeile>
                        <div className="mt-3">
                          {host.tags.map((tag) => (
                            <span key={tag} className="badge pl-bg-neutral me-1">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </>
                    ),
                  },
                  {
                    id: "keys",
                    titel: "Subscription-Historie",
                    icon: "bi-key",
                    inhalt: (
                      <table className="table table-striped align-middle mb-0">
                        <thead>
                          <tr>
                            <th scope="col">Key</th>
                            <th scope="col">Erste Laufzeit</th>
                            <th scope="col">Letzte Laufzeit</th>
                          </tr>
                        </thead>
                        <tbody>
                          {keys.map((key) => {
                            const zugehoerig = laufzeiten.filter((l) => l.key === key);
                            return (
                              <tr key={key}>
                                <td>
                                  <CopyableCode wert={key} />
                                </td>
                                <td>{formatDatum(zugehoerig[zugehoerig.length - 1]?.start)}</td>
                                <td>{formatDatum(zugehoerig[0]?.ende)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    ),
                  },
                  {
                    id: "reports",
                    titel: "Reports",
                    icon: "bi-clock-history",
                    inhalt: (
                      <table className="table table-striped align-middle mb-0">
                        <thead>
                          <tr>
                            <th scope="col">Zeitpunkt</th>
                            <th scope="col">Status</th>
                            <th scope="col">Key</th>
                            <th scope="col">Ablauf</th>
                            <th scope="col">Updates</th>
                            <th scope="col">Agent</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reports.map((report) => (
                            <tr key={report.id}>
                              <td>{formatDatumZeit(report.zeitpunkt)}</td>
                              <td>
                                <StatusBadge status={report.status} />
                              </td>
                              <td>
                                <span className="pl-mono">{report.key ?? "–"}</span>
                              </td>
                              <td>{formatDatum(report.nextduedate)}</td>
                              <td>{formatZahl(report.paketUpdates)}</td>
                              <td>{report.agentVersion}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ),
                  },
                  {
                    id: "rechnungen",
                    titel: "Rechnungen",
                    icon: "bi-receipt",
                    inhalt: (
                      <table className="table table-striped align-middle mb-0">
                        <thead>
                          <tr>
                            <th scope="col">Laufzeit</th>
                            <th scope="col">Proxmox-Rechnung</th>
                            <th scope="col">Einkauf</th>
                            <th scope="col">Kundenrechnung</th>
                            <th scope="col">Verkauf</th>
                            <th scope="col">Marge</th>
                          </tr>
                        </thead>
                        <tbody>
                          {laufzeiten.map((laufzeit) => (
                            <tr key={laufzeit.id}>
                              <td>
                                {formatDatum(laufzeit.start)} – {formatDatum(laufzeit.ende)}
                                {laufzeit.vorschlag ? (
                                  <span className="badge pl-bg-info ms-2">Vorschlag</span>
                                ) : null}
                              </td>
                              <td>
                                <CopyableCode wert={laufzeit.einkauf?.nummer ?? null} />
                                <div>
                                  <EinkaufBadge
                                    bezahlt={laufzeit.einkauf ? laufzeit.einkauf.bezahlt : null}
                                  />
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
                              <td>
                                {laufzeit.einkauf && laufzeit.verkauf?.nettoBetrag
                                  ? formatEuro(
                                      (laufzeit.verkauf.nettoBetrag ?? 0) -
                                        (laufzeit.einkauf.nettoBetrag ?? 0),
                                    )
                                  : "–"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ),
                  },
                  {
                    id: "notizen",
                    titel: "Notizen",
                    icon: "bi-journal-text",
                    inhalt: (
                      <p className="mb-0">
                        {host.notizen ?? (
                          <span className="text-body-secondary">Keine Notizen hinterlegt.</span>
                        )}
                      </p>
                    ),
                  },
                ]}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
