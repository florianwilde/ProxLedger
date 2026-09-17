import Link from "next/link";
import { notFound } from "next/navigation";
import { ContentHeader } from "@/components/layout/ContentHeader";
import { KundenrechnungFormular, ProxmoxRechnungFormular } from "@/components/rechnungen/RechnungsFormulare";
import { Badge, EinkaufBadge, VerkaufBadge } from "@/components/ui/Badges";
import { Callout } from "@/components/ui/Callout";
import { Card } from "@/components/ui/Card";
import { CopyableCode } from "@/components/ui/CopyableCode";
import { PRODUKT_TEXT } from "@/lib/anzeige";
import { formatDatum, formatEuro } from "@/lib/format";
import { laufzeitBestaetigenAktion, laufzeitVerwerfenAktion } from "@/server/actions/rechnungen";
import { laufzeitDetail } from "@/server/queries/rechnungen";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const laufzeit = await laufzeitDetail(id);
  return { title: laufzeit ? `Laufzeit ${laufzeit.host.hostname}` : "Laufzeit" };
}

export default async function LaufzeitSeite({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const laufzeit = await laufzeitDetail(id);
  if (!laufzeit) notFound();

  const einkauf = laufzeit.proxmoxPosition?.rechnung ?? null;
  const verkauf = laufzeit.kundenPosition?.rechnung ?? null;
  const einkaufBetrag = laufzeit.proxmoxPosition ? Number(laufzeit.proxmoxPosition.nettoBetrag) : null;
  const verkaufBetrag = laufzeit.kundenPosition ? Number(laufzeit.kundenPosition.nettoBetrag) : null;
  const marge = einkaufBetrag !== null && verkaufBetrag !== null ? verkaufBetrag - einkaufBetrag : null;

  const zeitraum = `${formatDatum(laufzeit.start)} – ${formatDatum(laufzeit.ende)}`;

  return (
    <>
      <ContentHeader
        titel={`Laufzeit ${zeitraum}`}
        brotkrumen={[
          { titel: "Rechnungen", href: "/rechnungen" },
          { titel: laufzeit.host.hostname, href: `/hosts/${laufzeit.host.id}` },
          { titel: zeitraum },
        ]}
        aktion={laufzeit.status === "VORSCHLAG" ? <Badge farbe="info">Vorschlag</Badge> : null}
      />

      <div className="app-content">
        <div className="container-fluid">
          {laufzeit.status === "VORSCHLAG" ? (
            <Callout
              titel="Vom Agent vorgeschlagen"
              farbe="info"
              aktion={
                <div className="d-flex gap-2">
                  <form action={laufzeitBestaetigenAktion}>
                    <input type="hidden" name="laufzeitId" value={laufzeit.id} />
                    <input type="hidden" name="hostId" value={laufzeit.host.id} />
                    <button type="submit" className="btn btn-primary pl-touch-target">
                      Bestätigen
                    </button>
                  </form>
                  <form action={laufzeitVerwerfenAktion}>
                    <input type="hidden" name="laufzeitId" value={laufzeit.id} />
                    <input type="hidden" name="hostId" value={laufzeit.host.id} />
                    <button type="submit" className="btn btn-outline-danger pl-touch-target">
                      Verwerfen
                    </button>
                  </form>
                </div>
              }
            >
              Der Host hat ein neues Ablaufdatum gemeldet. Mit dem Erfassen einer Proxmox-Rechnung gilt die
              Laufzeit automatisch als bestätigt.
            </Callout>
          ) : null}

          <div className="row">
            <div className="col-lg-4">
              <Card titel="Laufzeit" rahmen="primary">
                <dl className="row mb-0">
                  <dt className="col-5 fw-normal text-body-secondary">Host</dt>
                  <dd className="col-7">
                    <Link href={`/hosts/${laufzeit.host.id}`}>{laufzeit.host.hostname}</Link>
                  </dd>
                  <dt className="col-5 fw-normal text-body-secondary">Kunde</dt>
                  <dd className="col-7">
                    {laufzeit.host.kunde ? (
                      <Link href={`/kunden/${laufzeit.host.kunde.id}`}>{laufzeit.host.kunde.name}</Link>
                    ) : (
                      <span className="badge pl-bg-neutral">Nicht zugeordnet</span>
                    )}
                  </dd>
                  <dt className="col-5 fw-normal text-body-secondary">Produkt</dt>
                  <dd className="col-7">{PRODUKT_TEXT[laufzeit.host.produkt]}</dd>
                  <dt className="col-5 fw-normal text-body-secondary">Key</dt>
                  <dd className="col-7">
                    <CopyableCode wert={laufzeit.key} />
                  </dd>
                  <dt className="col-5 fw-normal text-body-secondary">Beginn</dt>
                  <dd className="col-7">{formatDatum(laufzeit.start)}</dd>
                  <dt className="col-5 fw-normal text-body-secondary">Ende</dt>
                  <dd className="col-7">{formatDatum(laufzeit.ende)}</dd>
                </dl>
                <hr />
                <dl className="row mb-0">
                  <dt className="col-5 fw-normal text-body-secondary">Einkauf netto</dt>
                  <dd className="col-7">{formatEuro(einkaufBetrag)}</dd>
                  <dt className="col-5 fw-normal text-body-secondary">Verkauf netto</dt>
                  <dd className="col-7">{formatEuro(verkaufBetrag)}</dd>
                  <dt className="col-5 fw-normal text-body-secondary">Marge</dt>
                  <dd className={`col-7 ${(marge ?? 0) >= 0 ? "pl-text-success" : "pl-text-danger"}`}>
                    {marge === null ? "–" : formatEuro(marge)}
                  </dd>
                </dl>
              </Card>

              {einkauf && einkauf.positionen.length > 1 ? (
                <Card titel="Sammelrechnung" rahmen="info">
                  <p className="small">
                    Die Proxmox-Rechnung <span className="pl-mono">{einkauf.nummer}</span> deckt mehrere
                    Laufzeiten ab:
                  </p>
                  <ul className="list-unstyled mb-0 small">
                    {einkauf.positionen.map((position) => (
                      <li key={position.id} className="mb-1">
                        {position.laufzeit ? (
                          <Link href={`/rechnungen/${position.laufzeit.id}`}>
                            {position.laufzeit.host.hostname}
                          </Link>
                        ) : (
                          position.bezeichnung
                        )}{" "}
                        · {formatEuro(Number(position.nettoBetrag))}
                      </li>
                    ))}
                  </ul>
                </Card>
              ) : null}
            </div>

            <div className="col-lg-8">
              <Card
                titel="Proxmox-Rechnung (Einkauf)"
                rahmen={einkauf?.bezahlt ? "info" : "danger"}
                werkzeuge={<EinkaufBadge bezahlt={einkauf ? einkauf.bezahlt : null} />}
              >
                <ProxmoxRechnungFormular
                  laufzeitId={laufzeit.id}
                  hostId={laufzeit.host.id}
                  werte={{
                    nummer: einkauf?.nummer ?? null,
                    datum: einkauf?.datum.toISOString() ?? null,
                    faelligAm: einkauf?.faelligAm?.toISOString() ?? null,
                    nettoBetrag: einkaufBetrag,
                    ustSatz: Number(einkauf?.ustSatz ?? 19),
                    rabatt:
                      einkauf?.rabatt === null || einkauf?.rabatt === undefined
                        ? null
                        : Number(einkauf.rabatt),
                    zahlungsart: einkauf?.zahlungsart ?? null,
                    bezahlt: einkauf?.bezahlt ?? false,
                    bezahltAm: einkauf?.bezahltAm?.toISOString() ?? null,
                    anhangId: einkauf?.anhangId ?? null,
                    anhangName: einkauf?.anhang?.dateiname ?? null,
                  }}
                />
              </Card>

              <Card
                titel="Kundenrechnung (Verkauf)"
                rahmen={verkauf?.erstellt ? "info" : "warning"}
                werkzeuge={
                  <VerkaufBadge erstellt={verkauf?.erstellt ?? false} bezahlt={verkauf?.bezahlt ?? false} />
                }
              >
                <KundenrechnungFormular
                  laufzeitId={laufzeit.id}
                  hostId={laufzeit.host.id}
                  kundeVorhanden={Boolean(laufzeit.host.kunde)}
                  werte={{
                    erstellt: verkauf?.erstellt ?? false,
                    nummer: verkauf?.nummer ?? null,
                    datum: verkauf?.datum?.toISOString() ?? null,
                    nettoBetrag: verkaufBetrag,
                    ustSatz: Number(verkauf?.ustSatz ?? 19),
                    bezahlt: verkauf?.bezahlt ?? false,
                    bezahltAm: verkauf?.bezahltAm?.toISOString() ?? null,
                    anhangId: verkauf?.anhangId ?? null,
                    anhangName: verkauf?.anhang?.dateiname ?? null,
                  }}
                />
              </Card>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
