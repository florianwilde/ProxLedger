import Link from "next/link";
import { notFound } from "next/navigation";
import { ContentHeader } from "@/components/layout/ContentHeader";
import { StandortVerwaltung } from "@/components/kunden/StandortVerwaltung";
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
import { hostZuordnungAufheben } from "@/server/actions/hosts";
import { kundeMitDetails, laufzeitenVonKunde, summen, summenProJahr } from "@/server/queries/kunden";
import { meldungsGrenze } from "@/server/queries/hosts";
import { PRODUKT_TEXT, statusAusDatenbank } from "@/lib/anzeige";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const kunde = await kundeMitDetails(id);
  return { title: kunde?.name ?? "Kunde" };
}

export default async function KundenDetailSeite({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const kunde = await kundeMitDetails(id);
  if (!kunde) notFound();

  const laufzeiten = await laufzeitenVonKunde(kunde.id);
  const gesamt = summen(laufzeiten);
  const proJahr = summenProJahr(laufzeiten);
  const heute = new Date();
  const grenze = meldungsGrenze(heute);

  return (
    <>
      <ContentHeader
        titel={kunde.name}
        brotkrumen={[{ titel: "Kunden", href: "/kunden" }, { titel: kunde.name }]}
        aktion={
          <span className="d-flex gap-2">
            <a href={`/kunden/${kunde.id}/export`} className="btn btn-sm btn-outline-secondary">
              <i className="bi bi-filetype-pdf me-1" aria-hidden="true" />
              Unterlage
            </a>
            <Link href={`/kunden/${kunde.id}/bearbeiten`} className="btn btn-sm btn-outline-primary">
              <i className="bi bi-pencil me-1" aria-hidden="true" />
              Bearbeiten
            </Link>
          </span>
        }
      />

      <div className="app-content">
        <div className="container-fluid">
          <div className="row">
            <div className="col-6 col-lg-3">
              <InfoBox text="Hosts" wert={String(kunde.hosts.length)} icon="bi-hdd-stack" farbe="info" />
            </div>
            <div className="col-6 col-lg-3">
              <InfoBox
                text="Einkauf netto"
                wert={formatEuro(gesamt.einkauf)}
                icon="bi-cart"
                farbe="neutral"
              />
            </div>
            <div className="col-6 col-lg-3">
              <InfoBox
                text="Verkauf netto"
                wert={formatEuro(gesamt.verkauf)}
                icon="bi-receipt"
                farbe="primary"
              />
            </div>
            <div className="col-6 col-lg-3">
              <InfoBox
                text="Marge"
                wert={formatEuro(gesamt.marge)}
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
                </dl>
                <hr />
                <h4 className="h6">Notizen</h4>
                <p className="mb-0 small">
                  {kunde.notizen ?? <span className="text-body-secondary">Keine Notizen hinterlegt.</span>}
                </p>
              </Card>

              <Card titel="Standorte" rahmen="info">
                <StandortVerwaltung
                  kundeId={kunde.id}
                  standorte={kunde.standorte.map((standort) => ({
                    id: standort.id,
                    name: standort.name,
                    strasse: standort.strasse,
                    plz: standort.plz,
                    ort: standort.ort,
                    hosts: kunde.hosts.filter((host) => host.standortId === standort.id).length,
                  }))}
                />
              </Card>

              <Card titel="Offene Warnungen" rahmen={kunde.alerts.length > 0 ? "danger" : "info"}>
                {kunde.alerts.length === 0 ? (
                  <p className="mb-0 text-body-secondary">Keine offenen Warnungen.</p>
                ) : (
                  <ul className="list-unstyled mb-0 small">
                    {kunde.alerts.map((alert) => (
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
              <Card titel={`Hosts (${kunde.hosts.length})`} rahmen="primary" tabelle>
                <div className="table-responsive">
                  <table className="table table-striped align-middle">
                    <thead>
                      <tr>
                        <th scope="col">Host</th>
                        <th scope="col">Produkt</th>
                        <th scope="col">Status</th>
                        <th scope="col">Key</th>
                        <th scope="col">Ablauf</th>
                        <th scope="col" className="text-end">
                          Zuordnung
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {kunde.hosts.map((host) => (
                        <tr key={host.id}>
                          <td>
                            <Link href={`/hosts/${host.id}`} className="fw-semibold text-decoration-none">
                              {host.hostname}
                            </Link>
                            {!host.letzterReportAm || host.letzterReportAm < grenze ? (
                              <KeineMeldungBadge />
                            ) : null}
                          </td>
                          <td>{PRODUKT_TEXT[host.produkt]}</td>
                          <td>
                            <StatusBadge status={statusAusDatenbank(host.subStatus)} />
                          </td>
                          <td>
                            <CopyableCode wert={host.subKey} />
                          </td>
                          <td>
                            <AblaufBadge datum={host.subNextduedate?.toISOString() ?? null} heute={heute} />
                          </td>
                          <td className="text-end">
                            <form action={hostZuordnungAufheben}>
                              <input type="hidden" name="hostId" value={host.id} />
                              <button
                                type="submit"
                                className="btn btn-sm btn-outline-secondary"
                                title="Zuordnung zu diesem Kunden aufheben"
                              >
                                Lösen
                              </button>
                            </form>
                          </td>
                        </tr>
                      ))}
                      {kunde.hosts.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center text-body-secondary py-4">
                            Diesem Kunden ist noch kein Host zugewiesen.{" "}
                            <Link href="/hosts/nicht-zugeordnet">Jetzt zuweisen</Link>
                          </td>
                        </tr>
                      ) : null}
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
                      {laufzeiten.map((laufzeit) => (
                        <tr key={laufzeit.id}>
                          <td>
                            {formatDatum(laufzeit.start)} – {formatDatum(laufzeit.ende)}
                            {laufzeit.vorschlag ? (
                              <span className="badge pl-bg-info ms-2">Vorschlag</span>
                            ) : null}
                          </td>
                          <td>{laufzeit.hostname}</td>
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
                      ))}
                      {laufzeiten.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center text-body-secondary py-4">
                            Noch keine Laufzeiten erfasst.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </Card>

              {proJahr.length > 0 ? (
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
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
