import Link from "next/link";
import { notFound } from "next/navigation";
import { HostNotizen } from "@/components/hosts/HostNotizen";
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
import { PRODUKT_TEXT } from "@/lib/anzeige";
import { prisma } from "@/lib/db";
import { formatDatum, formatDatumZeit, formatEuro, formatUptime, formatZahl } from "@/lib/format";
import { KundeStandortFormular } from "@/components/hosts/KundeStandortFormular";
import { hostTokenWiderrufen } from "@/server/actions/tokens";
import { hostMitDetails } from "@/server/queries/hostliste";
import { meldungsGrenze } from "@/server/queries/hosts";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const host = await prisma.host.findUnique({ where: { id }, select: { hostname: true } });
  return { title: host?.hostname ?? "Host" };
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
  const host = await hostMitDetails(id);
  if (!host) notFound();

  const kunden = await prisma.kunde.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      standorte: { orderBy: { name: "asc" }, select: { id: true, name: true } },
    },
  });

  // Welche Cluster-Mitglieder melden sich selbst? Fehlende Knoten haben keinen Agent (#022).
  const geschwister =
    host.clusterMitglieder.length > 0
      ? await prisma.host.findMany({
          where: { hostname: { in: host.clusterMitglieder, mode: "insensitive" } },
          select: { id: true, hostname: true, subStatus: true, letzterReportAm: true },
        })
      : [];
  const meldende = new Map(geschwister.map((eintrag) => [eintrag.hostname.toLowerCase(), eintrag]));

  const jetzt = new Date();
  const meldetNicht = !host.letzterReportAm || host.letzterReportAm < meldungsGrenze(jetzt);
  const socketAbweichung =
    host.subLizenzierteSockets !== null &&
    host.sockets !== null &&
    host.subLizenzierteSockets !== host.sockets;

  return (
    <>
      <ContentHeader
        titel={host.hostname}
        brotkrumen={[{ titel: "Hosts", href: "/hosts" }, { titel: host.hostname }]}
        aktion={<StatusBadge status={host.subStatus} />}
      />

      <div className="app-content">
        <div className="container-fluid">
          {host.alerts.length > 0 ? (
            <Card titel={`Offene Warnungen (${host.alerts.length})`} rahmen="danger">
              <ul className="list-unstyled mb-0">
                {host.alerts.map((alert) => (
                  <li key={alert.id} className="mb-2">
                    <Badge
                      farbe={
                        alert.schwere === "GEFAHR"
                          ? "danger"
                          : alert.schwere === "WARNUNG"
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
          ) : null}

          <div className="row">
            <div className="col-lg-4">
              <Card titel="Host" rahmen="primary">
                <div className="text-center mb-3">
                  <i className="bi bi-hdd-rack fs-1 text-body-secondary" aria-hidden="true" />
                  <h2 className="h5 mt-2 mb-1">{host.hostname}</h2>
                  <div className="text-body-secondary small">{host.fqdn ?? "Kein FQDN gemeldet"}</div>
                  {meldetNicht ? <KeineMeldungBadge /> : null}
                </div>

                <Zeile bezeichnung="Kunde">
                  {host.kunde ? (
                    <Link href={`/kunden/${host.kunde.id}`}>{host.kunde.name}</Link>
                  ) : (
                    <span className="badge pl-bg-neutral">Nicht zugeordnet</span>
                  )}
                </Zeile>
                <Zeile bezeichnung="Standort">{host.standort?.name ?? "–"}</Zeile>
                <Zeile bezeichnung="Produkt">{PRODUKT_TEXT[host.produkt]}</Zeile>
                <Zeile bezeichnung="Version">{host.produktVersion ?? "–"}</Zeile>
                <Zeile bezeichnung="Kernel">{host.kernel ?? "–"}</Zeile>
                <Zeile bezeichnung="Server-ID">
                  <CopyableCode wert={host.serverId} />
                </Zeile>
                <Zeile bezeichnung="Cluster / Node">
                  {host.clusterName ? `${host.clusterName} / ${host.nodeName ?? "?"}` : "–"}
                </Zeile>
                {host.clusterMitglieder.length > 0 ? (
                  <Zeile bezeichnung={`Cluster-Knoten (${host.clusterMitglieder.length})`}>
                    <span className="d-inline-block text-start">
                      {host.clusterMitglieder.map((mitglied) => {
                        const eintrag = meldende.get(mitglied.toLowerCase());
                        return (
                          <span key={mitglied} className="d-block small">
                            {eintrag ? (
                              <Link href={`/hosts/${eintrag.id}`} className="text-decoration-none">
                                {mitglied}
                              </Link>
                            ) : (
                              mitglied
                            )}{" "}
                            {eintrag ? (
                              <Badge farbe="success">meldet sich</Badge>
                            ) : (
                              <Badge farbe="warning">kein Agent</Badge>
                            )}
                          </span>
                        );
                      })}
                    </span>
                  </Zeile>
                ) : null}
                <Zeile bezeichnung="IP-Adressen">{host.ips.join(", ") || "–"}</Zeile>
                <Zeile bezeichnung="CPU">{host.cpuModell ?? "–"}</Zeile>
                <Zeile bezeichnung="Sockets (lizenziert / physisch)">
                  {host.subLizenzierteSockets ?? "–"} / {host.sockets ?? "–"}
                  {socketAbweichung ? (
                    <i
                      className="bi bi-exclamation-triangle-fill pl-text-warning ms-2"
                      title="Lizenzierte und physische Sockets weichen ab"
                    />
                  ) : null}
                </Zeile>
                <Zeile bezeichnung="Uptime">
                  {formatUptime(host.uptimeSekunden === null ? null : Number(host.uptimeSekunden))}
                </Zeile>
                <Zeile bezeichnung="Paket-Updates">{formatZahl(host.paketUpdates)}</Zeile>
                <Zeile bezeichnung="Agent-Version">{host.agentVersion ?? "–"}</Zeile>
                <Zeile bezeichnung="Erstmals gesehen">{formatDatum(host.erstmalsGesehenAm)}</Zeile>
                <Zeile bezeichnung="Letzte Meldung">{formatDatumZeit(host.letzterReportAm)}</Zeile>

                <KundeStandortFormular
                  hostId={host.id}
                  kunden={kunden}
                  kundeId={host.kundeId}
                  standortId={host.standortId}
                />
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
                          <CopyableCode wert={host.subKey} />
                        </Zeile>
                        <Zeile bezeichnung="Status">
                          <StatusBadge status={host.subStatus} />
                        </Zeile>
                        <Zeile bezeichnung="Produktname">{host.subProduktname ?? "–"}</Zeile>
                        <Zeile bezeichnung="Level">{host.subLevel ?? "–"}</Zeile>
                        <Zeile bezeichnung="Registriert am">{formatDatum(host.subRegdate)}</Zeile>
                        <Zeile bezeichnung="Läuft ab am">
                          <AblaufBadge datum={host.subNextduedate?.toISOString() ?? null} heute={jetzt} />
                        </Zeile>
                        <Zeile bezeichnung="Letzte Prüfung durch Proxmox">
                          {formatDatumZeit(host.subChecktime)}
                        </Zeile>
                        <div className="mt-3">
                          {host.tags.length === 0 ? (
                            <span className="text-body-secondary small">Keine Tags</span>
                          ) : (
                            host.tags.map((tag) => (
                              <span key={tag.id} className="badge pl-bg-neutral me-1">
                                {tag.name}
                              </span>
                            ))
                          )}
                        </div>
                      </>
                    ),
                  },
                  {
                    id: "historie",
                    titel: "Subscription-Historie",
                    icon: "bi-key",
                    inhalt: (
                      <>
                        <h3 className="h6">Keys</h3>
                        <div className="table-responsive mb-4">
                          <table className="table table-striped align-middle mb-0">
                            <thead>
                              <tr>
                                <th scope="col">Key</th>
                                <th scope="col">Erstmals gemeldet</th>
                                <th scope="col">Zuletzt gemeldet</th>
                              </tr>
                            </thead>
                            <tbody>
                              {host.keyHistorie.map((eintrag) => (
                                <tr key={eintrag.id}>
                                  <td>
                                    <CopyableCode wert={eintrag.key} />
                                  </td>
                                  <td>{formatDatum(eintrag.ersteMeldung)}</td>
                                  <td>{formatDatum(eintrag.letzteMeldung)}</td>
                                </tr>
                              ))}
                              {host.keyHistorie.length === 0 ? (
                                <tr>
                                  <td colSpan={3} className="text-body-secondary">
                                    Noch kein Key gemeldet.
                                  </td>
                                </tr>
                              ) : null}
                            </tbody>
                          </table>
                        </div>

                        <h3 className="h6">Server-IDs</h3>
                        <div className="table-responsive">
                          <table className="table table-striped align-middle mb-0">
                            <thead>
                              <tr>
                                <th scope="col">Server-ID</th>
                                <th scope="col">Erstmals gemeldet</th>
                                <th scope="col">Zuletzt gemeldet</th>
                              </tr>
                            </thead>
                            <tbody>
                              {host.serverIdHistorie.map((eintrag) => (
                                <tr key={eintrag.id}>
                                  <td>
                                    <CopyableCode wert={eintrag.serverId} />
                                  </td>
                                  <td>{formatDatum(eintrag.ersteMeldung)}</td>
                                  <td>{formatDatum(eintrag.letzteMeldung)}</td>
                                </tr>
                              ))}
                              {host.serverIdHistorie.length === 0 ? (
                                <tr>
                                  <td colSpan={3} className="text-body-secondary">
                                    Noch keine Server-ID gemeldet.
                                  </td>
                                </tr>
                              ) : null}
                            </tbody>
                          </table>
                        </div>
                        {host.serverIdHistorie.length > 1 ? (
                          <p className="small pl-text-warning mt-2 mb-0">
                            Mehrere Server-IDs bedeuten Hardwaretausch oder Neuinstallation – der Key muss
                            dann bei Proxmox neu zugewiesen werden.
                          </p>
                        ) : null}
                      </>
                    ),
                  },
                  {
                    id: "reports",
                    titel: `Reports (${host.reports.length})`,
                    icon: "bi-clock-history",
                    inhalt: (
                      <div className="table-responsive">
                        <table className="table table-striped align-middle mb-0">
                          <thead>
                            <tr>
                              <th scope="col">Erhoben</th>
                              <th scope="col">Empfangen</th>
                              <th scope="col">Status</th>
                              <th scope="col">Key</th>
                              <th scope="col">Ablauf</th>
                              <th scope="col">Updates</th>
                              <th scope="col">Agent</th>
                            </tr>
                          </thead>
                          <tbody>
                            {host.reports.map((report) => (
                              <tr key={report.id}>
                                <td>{formatDatumZeit(report.erhobenAm)}</td>
                                <td className="small text-body-secondary">
                                  {formatDatumZeit(report.empfangenAm)}
                                </td>
                                <td>
                                  <StatusBadge status={report.subStatus} />
                                </td>
                                <td className="pl-mono">{report.subKey ?? "–"}</td>
                                <td>{formatDatum(report.subNextduedate)}</td>
                                <td>{formatZahl(report.paketUpdates)}</td>
                                <td>{report.agentVersion ?? "–"}</td>
                              </tr>
                            ))}
                            {host.reports.length === 0 ? (
                              <tr>
                                <td colSpan={7} className="text-body-secondary">
                                  Noch kein Report eingegangen.
                                </td>
                              </tr>
                            ) : null}
                          </tbody>
                        </table>
                      </div>
                    ),
                  },
                  {
                    id: "rechnungen",
                    titel: "Rechnungen",
                    icon: "bi-receipt",
                    inhalt: (
                      <div className="table-responsive">
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
                            {host.laufzeiten.map((laufzeit) => {
                              const einkauf = laufzeit.proxmoxPosition
                                ? Number(laufzeit.proxmoxPosition.nettoBetrag)
                                : null;
                              const verkauf = laufzeit.kundenPosition
                                ? Number(laufzeit.kundenPosition.nettoBetrag)
                                : null;
                              return (
                                <tr key={laufzeit.id}>
                                  <td>
                                    {formatDatum(laufzeit.start)} – {formatDatum(laufzeit.ende)}
                                    {laufzeit.status === "VORSCHLAG" ? (
                                      <span className="badge pl-bg-info ms-2">Vorschlag</span>
                                    ) : null}
                                  </td>
                                  <td>
                                    <CopyableCode wert={laufzeit.proxmoxPosition?.rechnung.nummer ?? null} />
                                    <div>
                                      <EinkaufBadge
                                        bezahlt={
                                          laufzeit.proxmoxPosition
                                            ? laufzeit.proxmoxPosition.rechnung.bezahlt
                                            : null
                                        }
                                      />
                                    </div>
                                  </td>
                                  <td>{formatEuro(einkauf)}</td>
                                  <td>
                                    <CopyableCode wert={laufzeit.kundenPosition?.rechnung.nummer ?? null} />
                                    <div>
                                      <VerkaufBadge
                                        erstellt={laufzeit.kundenPosition?.rechnung.erstellt ?? false}
                                        bezahlt={laufzeit.kundenPosition?.rechnung.bezahlt ?? false}
                                      />
                                    </div>
                                  </td>
                                  <td>{formatEuro(verkauf)}</td>
                                  <td>
                                    {einkauf !== null && verkauf !== null
                                      ? formatEuro(verkauf - einkauf)
                                      : "–"}
                                  </td>
                                </tr>
                              );
                            })}
                            {host.laufzeiten.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="text-body-secondary">
                                  Noch keine Laufzeit erfasst.
                                </td>
                              </tr>
                            ) : null}
                          </tbody>
                        </table>
                      </div>
                    ),
                  },
                  {
                    id: "notizen",
                    titel: "Notizen und Tags",
                    icon: "bi-journal-text",
                    inhalt: (
                      <HostNotizen
                        hostId={host.id}
                        notizen={host.notizen}
                        tags={host.tags.map((tag) => tag.name)}
                      />
                    ),
                  },
                  {
                    id: "tokens",
                    titel: "Tokens",
                    icon: "bi-key-fill",
                    inhalt: (
                      <div className="table-responsive">
                        <table className="table table-striped align-middle mb-0">
                          <thead>
                            <tr>
                              <th scope="col">Anfang</th>
                              <th scope="col">Erstellt</th>
                              <th scope="col">Zuletzt benutzt</th>
                              <th scope="col">Zustand</th>
                              <th scope="col" className="text-end">
                                Aktion
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {host.tokens.map((token) => (
                              <tr key={token.id}>
                                <td className="pl-mono">{token.praefix}…</td>
                                <td>{formatDatum(token.erstelltAm)}</td>
                                <td>{formatDatumZeit(token.letzteNutzungAm)}</td>
                                <td>
                                  {token.widerrufenAm ? (
                                    <Badge farbe="neutral">Widerrufen</Badge>
                                  ) : (
                                    <Badge farbe="success">Aktiv</Badge>
                                  )}
                                </td>
                                <td className="text-end">
                                  {token.widerrufenAm ? null : (
                                    <form action={hostTokenWiderrufen}>
                                      <input type="hidden" name="id" value={token.id} />
                                      <input type="hidden" name="hostId" value={host.id} />
                                      <button type="submit" className="btn btn-sm btn-outline-danger">
                                        Widerrufen
                                      </button>
                                    </form>
                                  )}
                                </td>
                              </tr>
                            ))}
                            {host.tokens.length === 0 ? (
                              <tr>
                                <td colSpan={5} className="text-body-secondary">
                                  Kein Token vorhanden – dieser Host stammt aus den Demo-Daten.
                                </td>
                              </tr>
                            ) : null}
                          </tbody>
                        </table>
                      </div>
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
