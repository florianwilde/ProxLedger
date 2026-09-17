import Link from "next/link";
import { ContentHeader } from "@/components/layout/ContentHeader";
import { AblaufBadge, KeineMeldungBadge, StatusBadge } from "@/components/ui/Badges";
import { Card } from "@/components/ui/Card";
import { CopyableCode } from "@/components/ui/CopyableCode";
import { HEUTE, hosts } from "@/mock/data";
import { PRODUKT_NAME, getKunde, hostMeldetNicht, suche } from "@/mock/queries";

export const metadata = { title: "Hosts" };

export default async function HostsSeite({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; kunde?: string }>;
}) {
  const { q, status, kunde } = await searchParams;

  let liste = q ? suche(q).hosts : hosts;
  if (status) liste = liste.filter((h) => h.subscription.status === status);
  if (kunde) liste = liste.filter((h) => h.kundeId === kunde);

  return (
    <>
      <ContentHeader titel="Hosts" brotkrumen={[{ titel: "Hosts" }]} />

      <div className="app-content">
        <div className="container-fluid">
          <Card
            titel={`${liste.length} von ${hosts.length} Hosts`}
            rahmen="primary"
            tabelle
            werkzeuge={
              <>
                <Link href="/hosts/nicht-zugeordnet" className="btn btn-sm btn-outline-primary">
                  Nicht zugeordnete
                </Link>
                <span className="btn btn-sm btn-outline-secondary disabled">CSV-Export (ab #007)</span>
              </>
            }
          >
            <form className="p-3 border-bottom row g-2" role="search">
              <div className="col-md-5">
                <input
                  type="search"
                  name="q"
                  defaultValue={q ?? ""}
                  className="form-control"
                  placeholder="Hostname, Key, Server-ID oder IP …"
                  aria-label="Hosts durchsuchen"
                />
              </div>
              <div className="col-md-3">
                <select name="status" defaultValue={status ?? ""} className="form-select" aria-label="Status">
                  <option value="">Alle Status</option>
                  <option value="active">Aktiv</option>
                  <option value="expired">Abgelaufen</option>
                  <option value="notfound">Keine Subscription</option>
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
                    <th scope="col">Host</th>
                    <th scope="col">Kunde</th>
                    <th scope="col">Produkt</th>
                    <th scope="col">Status</th>
                    <th scope="col">Key</th>
                    <th scope="col">Ablauf</th>
                    <th scope="col">Sockets</th>
                  </tr>
                </thead>
                <tbody>
                  {liste.map((host) => {
                    const kundeDesHosts = getKunde(host.kundeId);
                    const socketAbweichung =
                      host.subscription.lizenzierteSockets !== null &&
                      host.sockets !== null &&
                      host.subscription.lizenzierteSockets !== host.sockets;
                    return (
                      <tr key={host.id}>
                        <td>
                          <Link href={`/hosts/${host.id}`} className="fw-semibold text-decoration-none">
                            {host.hostname}
                          </Link>
                          {hostMeldetNicht(host) ? <KeineMeldungBadge /> : null}
                          <div className="small text-body-secondary">{host.ips.join(", ")}</div>
                        </td>
                        <td>
                          {kundeDesHosts ? (
                            <Link href={`/kunden/${kundeDesHosts.id}`} className="text-decoration-none">
                              {kundeDesHosts.name}
                            </Link>
                          ) : (
                            <span className="badge pl-bg-neutral">Nicht zugeordnet</span>
                          )}
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
                        <td>
                          {host.subscription.lizenzierteSockets ?? "–"} / {host.sockets ?? "–"}
                          {socketAbweichung ? (
                            <i
                              className="bi bi-exclamation-triangle-fill pl-text-warning ms-2"
                              title="Lizenzierte und physische Sockets weichen ab"
                            />
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                  {liste.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center text-body-secondary py-4">
                        Keine Hosts gefunden.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
