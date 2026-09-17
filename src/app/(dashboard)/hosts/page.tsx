import Link from "next/link";
import { ContentHeader } from "@/components/layout/ContentHeader";
import { HostFilterLeiste } from "@/components/hosts/HostFilterLeiste";
import { AblaufBadge, KeineMeldungBadge, StatusBadge } from "@/components/ui/Badges";
import { Card } from "@/components/ui/Card";
import { CopyableCode } from "@/components/ui/CopyableCode";
import { PRODUKT_TEXT } from "@/lib/anzeige";
import { formatDatumZeit } from "@/lib/format";
import { filterOptionen, hostListe, type HostFilter } from "@/server/queries/hostliste";

export const metadata = { title: "Hosts" };

type SuchParameter = Promise<Record<string, string | string[] | undefined>>;

function einzeln(wert: string | string[] | undefined): string | undefined {
  const text = Array.isArray(wert) ? wert[0] : wert;
  return text && text.length > 0 ? text : undefined;
}

/** Baut eine Adresse mit geänderten Parametern – für Sortierung, Blättern und Export. */
function mitParametern(
  basis: Record<string, string | undefined>,
  aenderung: Record<string, string | undefined> = {},
  pfad = "/hosts",
) {
  const params = new URLSearchParams();
  for (const [schluessel, wert] of Object.entries({ ...basis, ...aenderung })) {
    if (wert) params.set(schluessel, wert);
  }
  const text = params.toString();
  return text ? `${pfad}?${text}` : pfad;
}

/** Spaltenkopf, der beim Klick die Sortierung umschaltet. */
function SortierKopf({
  titel,
  feld,
  basis,
  sortierung,
}: {
  titel: string;
  feld: string;
  basis: Record<string, string | undefined>;
  sortierung: string | undefined;
}) {
  const aktiv = (sortierung ?? "hostname").startsWith(feld);
  const absteigend = sortierung === `${feld}-ab`;
  return (
    <th scope="col">
      <Link
        href={mitParametern(basis, { sortierung: absteigend ? feld : `${feld}-ab`, seite: undefined })}
        className="text-decoration-none text-body d-inline-flex align-items-center gap-1"
      >
        {titel}
        {aktiv ? (
          <i
            className={`bi ${absteigend ? "bi-caret-down-fill" : "bi-caret-up-fill"} small`}
            aria-hidden="true"
          />
        ) : null}
      </Link>
    </th>
  );
}

export default async function HostsSeite({ searchParams }: { searchParams: SuchParameter }) {
  const roh = await searchParams;
  const filter: HostFilter = {
    q: einzeln(roh.q),
    kunde: einzeln(roh.kunde),
    status: einzeln(roh.status),
    produkt: einzeln(roh.produkt),
    ablauf: einzeln(roh.ablauf) as HostFilter["ablauf"],
    rechnung: einzeln(roh.rechnung) as HostFilter["rechnung"],
    sortierung: einzeln(roh.sortierung),
    seite: Number(einzeln(roh.seite) ?? 1),
  };

  const jetzt = new Date();
  const [{ hosts, gesamt, seite, seiten }, optionen] = await Promise.all([
    hostListe(filter, jetzt),
    filterOptionen(),
  ]);

  const basis: Record<string, string | undefined> = {
    q: filter.q,
    kunde: filter.kunde,
    status: filter.status,
    produkt: filter.produkt,
    ablauf: filter.ablauf,
    rechnung: filter.rechnung,
    sortierung: filter.sortierung,
  };

  return (
    <>
      <ContentHeader titel="Hosts" brotkrumen={[{ titel: "Hosts" }]} />

      <div className="app-content">
        <div className="container-fluid">
          <Card
            titel={`${gesamt} Host${gesamt === 1 ? "" : "s"}${gesamt !== hosts.length ? ` · Seite ${seite} von ${seiten}` : ""}`}
            rahmen="primary"
            tabelle
            werkzeuge={
              <>
                <Link href="/hosts/nicht-zugeordnet" className="btn btn-sm btn-outline-primary">
                  Nicht zugeordnete
                </Link>
                <a
                  href={mitParametern(basis, {}, "/hosts/export")}
                  className="btn btn-sm btn-outline-secondary"
                >
                  <i className="bi bi-filetype-csv me-1" aria-hidden="true" />
                  CSV
                </a>
              </>
            }
          >
            <HostFilterLeiste kunden={optionen.kunden} werte={basis} />

            <div className="table-responsive">
              <table className="table table-striped align-middle">
                <thead>
                  <tr>
                    <SortierKopf titel="Host" feld="hostname" basis={basis} sortierung={filter.sortierung} />
                    <SortierKopf titel="Kunde" feld="kunde" basis={basis} sortierung={filter.sortierung} />
                    <th scope="col" className="d-none d-lg-table-cell">
                      Produkt
                    </th>
                    <SortierKopf titel="Status" feld="status" basis={basis} sortierung={filter.sortierung} />
                    <th scope="col" className="d-none d-md-table-cell">
                      Key
                    </th>
                    <SortierKopf titel="Ablauf" feld="ablauf" basis={basis} sortierung={filter.sortierung} />
                    <th scope="col" className="d-none d-lg-table-cell">
                      Sockets
                    </th>
                    <SortierKopf
                      titel="Letzte Meldung"
                      feld="meldung"
                      basis={basis}
                      sortierung={filter.sortierung}
                    />
                  </tr>
                </thead>
                <tbody>
                  {hosts.map((host) => (
                    <tr key={host.id}>
                      <td>
                        <Link href={`/hosts/${host.id}`} className="fw-semibold text-decoration-none">
                          {host.hostname}
                        </Link>
                        {host.meldetNicht ? <KeineMeldungBadge /> : null}
                        <div className="small text-body-secondary">{host.ips.join(", ") || "–"}</div>
                      </td>
                      <td>
                        {host.kunde ? (
                          <Link href={`/kunden/${host.kunde.id}`} className="text-decoration-none">
                            {host.kunde.name}
                          </Link>
                        ) : (
                          <Link
                            href="/hosts/nicht-zugeordnet"
                            className="badge pl-bg-neutral text-decoration-none"
                          >
                            Nicht zugeordnet
                          </Link>
                        )}
                        {host.standort ? (
                          <div className="small text-body-secondary">{host.standort.name}</div>
                        ) : null}
                      </td>
                      <td className="d-none d-lg-table-cell">{PRODUKT_TEXT[host.produkt]}</td>
                      <td>
                        <StatusBadge status={host.subStatus} />
                      </td>
                      <td className="d-none d-md-table-cell">
                        <CopyableCode wert={host.subKey} />
                      </td>
                      <td>
                        <AblaufBadge datum={host.subNextduedate?.toISOString() ?? null} heute={jetzt} />
                      </td>
                      <td className="d-none d-lg-table-cell">
                        {host.subLizenzierteSockets ?? "–"} / {host.sockets ?? "–"}
                        {host.socketAbweichung ? (
                          <i
                            className="bi bi-exclamation-triangle-fill pl-text-warning ms-2"
                            title="Lizenzierte und physische Sockets weichen ab"
                          />
                        ) : null}
                      </td>
                      <td className="small d-none d-xl-table-cell">
                        {formatDatumZeit(host.letzterReportAm)}
                      </td>
                    </tr>
                  ))}
                  {hosts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center text-body-secondary py-4">
                        Keine Hosts gefunden. <Link href="/hosts">Filter zurücksetzen</Link>
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            {seiten > 1 ? (
              <nav className="p-3 border-top" aria-label="Seiten">
                <ul className="pagination pagination-sm mb-0">
                  <li className={`page-item ${seite <= 1 ? "disabled" : ""}`}>
                    <Link className="page-link" href={mitParametern(basis, { seite: String(seite - 1) })}>
                      Zurück
                    </Link>
                  </li>
                  {Array.from({ length: seiten }, (_, i) => i + 1).map((nummer) => (
                    <li key={nummer} className={`page-item ${nummer === seite ? "active" : ""}`}>
                      <Link className="page-link" href={mitParametern(basis, { seite: String(nummer) })}>
                        {nummer}
                      </Link>
                    </li>
                  ))}
                  <li className={`page-item ${seite >= seiten ? "disabled" : ""}`}>
                    <Link className="page-link" href={mitParametern(basis, { seite: String(seite + 1) })}>
                      Weiter
                    </Link>
                  </li>
                </ul>
              </nav>
            ) : null}
          </Card>
        </div>
      </div>
    </>
  );
}
