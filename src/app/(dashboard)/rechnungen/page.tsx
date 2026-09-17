import Link from "next/link";
import { ContentHeader } from "@/components/layout/ContentHeader";
import { StatusHaken } from "@/components/rechnungen/StatusHaken";
import { Badge } from "@/components/ui/Badges";
import { Callout } from "@/components/ui/Callout";
import { Card } from "@/components/ui/Card";
import { CopyableCode } from "@/components/ui/CopyableCode";
import { InfoBox } from "@/components/ui/SmallBox";
import { prisma } from "@/lib/db";
import { formatDatum, formatEuro, tageBis } from "@/lib/format";
import {
  anzahlVorschlaege,
  laufzeitJahre,
  rechnungsListe,
  type RechnungsFilter,
} from "@/server/queries/rechnungen";

export const metadata = { title: "Rechnungen" };

type SuchParameter = Promise<Record<string, string | string[] | undefined>>;

function einzeln(wert: string | string[] | undefined): string | undefined {
  const text = Array.isArray(wert) ? wert[0] : wert;
  return text && text.length > 0 ? text : undefined;
}

export default async function RechnungenSeite({ searchParams }: { searchParams: SuchParameter }) {
  const roh = await searchParams;
  const filter: RechnungsFilter = {
    status: (einzeln(roh.status) as RechnungsFilter["status"]) ?? "offen",
    kunde: einzeln(roh.kunde),
    jahr: einzeln(roh.jahr),
    q: einzeln(roh.q),
  };

  const [{ zeilen, summen }, jahre, kunden, vorschlaege] = await Promise.all([
    rechnungsListe(filter),
    laufzeitJahre(),
    prisma.kunde.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    anzahlVorschlaege(),
  ]);

  const heute = new Date();

  function adresse(aenderung: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    for (const [schluessel, wert] of Object.entries({ ...filter, ...aenderung })) {
      if (wert) params.set(schluessel, String(wert));
    }
    const text = params.toString();
    return text ? `/rechnungen?${text}` : "/rechnungen";
  }

  return (
    <>
      <ContentHeader titel="Rechnungen" brotkrumen={[{ titel: "Rechnungen" }]} />

      <div className="app-content">
        <div className="container-fluid">
          {vorschlaege > 0 && filter.status !== "vorschlaege" ? (
            <Callout
              titel={`${vorschlaege} vorgeschlagene Laufzeit${vorschlaege === 1 ? "" : "en"}`}
              farbe="info"
              aktion={
                <Link href={adresse({ status: "vorschlaege" })} className="btn btn-primary pl-touch-target">
                  Ansehen
                </Link>
              }
            >
              Die Agents haben neue Ablaufdaten gemeldet. Bestätige die Laufzeit und trage die Rechnungsdaten
              ein.
            </Callout>
          ) : null}

          <p className="small text-body-secondary mb-2">
            Summen beziehen sich auf die aktuelle Auswahl ({zeilen.length} Laufzeiten).
          </p>

          <div className="row">
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
            <div className="col-6 col-lg-3">
              <InfoBox text="Laufzeiten" wert={String(zeilen.length)} icon="bi-calendar-range" farbe="info" />
            </div>
          </div>

          <Card
            titel="Laufzeiten und Rechnungen"
            rahmen="primary"
            tabelle
            werkzeuge={
              <div className="btn-group btn-group-sm" role="group" aria-label="Filter">
                {(
                  [
                    ["offen", "Offen"],
                    ["erledigt", "Erledigt"],
                    ["alle", "Alle"],
                    ["vorschlaege", `Vorschläge${vorschlaege ? ` (${vorschlaege})` : ""}`],
                  ] as const
                ).map(([wert, text]) => (
                  <Link
                    key={wert}
                    href={adresse({ status: wert })}
                    className={`btn ${filter.status === wert ? "btn-primary" : "btn-outline-primary"}`}
                  >
                    {text}
                  </Link>
                ))}
              </div>
            }
          >
            <form className="row g-2 p-3 border-bottom" role="search">
              <input type="hidden" name="status" value={filter.status} />
              <div className="col-md-4">
                <input
                  name="q"
                  type="search"
                  defaultValue={filter.q ?? ""}
                  className="form-control"
                  placeholder="Rechnungsnummer, Key oder Host …"
                  aria-label="Suche"
                />
              </div>
              <div className="col-6 col-md-3">
                <select
                  name="kunde"
                  defaultValue={filter.kunde ?? ""}
                  className="form-select"
                  aria-label="Kunde"
                >
                  <option value="">Alle Kunden</option>
                  {kunden.map((kunde) => (
                    <option key={kunde.id} value={kunde.id}>
                      {kunde.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-6 col-md-2">
                <select
                  name="jahr"
                  defaultValue={filter.jahr ?? ""}
                  className="form-select"
                  aria-label="Jahr"
                >
                  <option value="">Alle Jahre</option>
                  {jahre.map((jahr) => (
                    <option key={jahr} value={jahr}>
                      {jahr}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-2">
                <button type="submit" className="btn btn-primary w-100">
                  Filtern
                </button>
              </div>
            </form>

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
                      Bezahlt
                    </th>
                    <th scope="col">Kundenrechnung</th>
                    <th scope="col">Netto</th>
                    <th scope="col" className="text-center">
                      Erstellt
                    </th>
                    <th scope="col" className="text-center">
                      Bezahlt
                    </th>
                    <th scope="col">Marge</th>
                  </tr>
                </thead>
                <tbody>
                  {zeilen.map((zeile) => {
                    const faelligIn = tageBis(zeile.einkaufFaelligAm, heute);
                    return (
                      <tr key={zeile.id}>
                        <td>
                          {zeile.kunde ? (
                            <Link href={`/kunden/${zeile.kunde.id}`} className="text-decoration-none">
                              {zeile.kunde.name}
                            </Link>
                          ) : (
                            <span className="badge pl-bg-neutral">Nicht zugeordnet</span>
                          )}
                        </td>
                        <td>
                          <Link href={`/hosts/${zeile.hostId}`} className="text-decoration-none">
                            {zeile.hostname}
                          </Link>
                        </td>
                        <td>
                          <Link href={`/rechnungen/${zeile.id}`} className="text-decoration-none">
                            {formatDatum(zeile.start)} – {formatDatum(zeile.ende)}
                          </Link>
                          {zeile.vorschlag ? <Badge farbe="info">Vorschlag</Badge> : null}
                        </td>
                        <td>
                          <CopyableCode wert={zeile.einkaufNummer} />
                          {zeile.einkaufBezahlt === false && faelligIn !== null && faelligIn <= 7 ? (
                            <div className="small pl-text-danger">
                              fällig {formatDatum(zeile.einkaufFaelligAm)}
                            </div>
                          ) : null}
                        </td>
                        <td>{formatEuro(zeile.einkaufBetrag)}</td>
                        <td className="text-center">
                          <StatusHaken
                            laufzeitId={zeile.id}
                            hostId={zeile.hostId}
                            feld="einkaufBezahlt"
                            wert={zeile.einkaufBezahlt === true}
                            deaktiviert={zeile.einkaufBezahlt === null}
                            titel="Proxmox-Rechnung bezahlt"
                          />
                        </td>
                        <td>
                          <CopyableCode wert={zeile.verkaufNummer} />
                        </td>
                        <td>{formatEuro(zeile.verkaufBetrag)}</td>
                        <td className="text-center">
                          <StatusHaken
                            laufzeitId={zeile.id}
                            hostId={zeile.hostId}
                            feld="verkaufErstellt"
                            wert={zeile.verkaufErstellt}
                            titel="Kundenrechnung erstellt"
                          />
                        </td>
                        <td className="text-center">
                          <StatusHaken
                            laufzeitId={zeile.id}
                            hostId={zeile.hostId}
                            feld="verkaufBezahlt"
                            wert={zeile.verkaufBezahlt}
                            deaktiviert={!zeile.verkaufErstellt}
                            titel="Kundenrechnung vom Kunden bezahlt"
                          />
                        </td>
                        <td className={(zeile.marge ?? 0) >= 0 ? "pl-text-success" : "pl-text-danger"}>
                          {zeile.marge === null ? "–" : formatEuro(zeile.marge)}
                        </td>
                      </tr>
                    );
                  })}
                  {zeilen.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="text-center text-body-secondary py-4">
                        Nichts gefunden. <Link href="/rechnungen?status=alle">Alle anzeigen</Link>
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </Card>

          <p className="small text-body-secondary">
            Die Häkchen wirken sofort. Für Rechnungsnummer, Beträge und PDF die Laufzeit öffnen.
          </p>
        </div>
      </div>
    </>
  );
}
