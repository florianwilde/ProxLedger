import Link from "next/link";
import { ContentHeader } from "@/components/layout/ContentHeader";
import { AblaufBadge, EinkaufBadge, KeineMeldungBadge, VerkaufBadge } from "@/components/ui/Badges";
import { Callout, ProgressBar } from "@/components/ui/Callout";
import { Card } from "@/components/ui/Card";
import { CopyableCode } from "@/components/ui/CopyableCode";
import { SmallBox } from "@/components/ui/SmallBox";
import { TodoList, type Aufgabe } from "@/components/ui/TodoList";
import { formatDatum, formatEuro } from "@/lib/format";
import { HEUTE } from "@/mock/data";
import {
  laufzeitZuAblauf,
  dashboardKennzahlen,
  getKunde,
  hostMeldetNicht,
  hostsNachAblauf,
  nichtZugeordneteHosts,
  offeneRechnungsLaufzeiten,
  rechnungsFortschrittProKunde,
} from "@/mock/queries";

export const metadata = { title: "Dashboard" };

function aufgabenliste(): Aufgabe[] {
  return offeneRechnungsLaufzeiten().flatMap((laufzeit) => {
    const host = hostsNachAblauf().find((h) => h.id === laufzeit.hostId);
    const kunde = getKunde(host?.kundeId ?? null);
    const basis = `${host?.hostname ?? "?"} · ${kunde?.name ?? "Nicht zugeordnet"}`;
    const aufgaben: Aufgabe[] = [];

    if (laufzeit.einkauf && !laufzeit.einkauf.bezahlt) {
      aufgaben.push({
        id: `${laufzeit.id}-einkauf`,
        titel: `Proxmox-Rechnung ${laufzeit.einkauf.nummer} bezahlen`,
        detail: `${basis} · ${formatEuro(laufzeit.einkauf.nettoBetrag)} netto · fällig am ${formatDatum(
          laufzeit.einkauf.faelligAm,
        )}`,
        dringlichkeit: "gefahr",
        badgeText: "Einkauf",
        href: `/hosts/${laufzeit.hostId}`,
      });
    }

    if (laufzeit.einkauf && (!laufzeit.verkauf || !laufzeit.verkauf.erstellt)) {
      aufgaben.push({
        id: `${laufzeit.id}-verkauf`,
        titel: "Kundenrechnung erstellen",
        detail: `${basis} · Laufzeit ${formatDatum(laufzeit.start)} – ${formatDatum(laufzeit.ende)}`,
        dringlichkeit: "warnung",
        badgeText: "Verkauf",
        href: `/rechnungen`,
      });
    }

    return aufgaben;
  });
}

export default function DashboardSeite() {
  const kennzahlen = dashboardKennzahlen();
  const ohneKunde = nichtZugeordneteHosts();
  const fortschritt = rechnungsFortschrittProKunde();
  const aufgaben = aufgabenliste();

  const nichtZugeordnetAufgaben: Aufgabe[] = ohneKunde.map((host) => ({
    id: `zuweisen-${host.id}`,
    titel: `${host.hostname} einem Kunden zuweisen`,
    detail: `Server-ID ${host.serverId} · seit ${formatDatum(host.letzterReport)} gemeldet`,
    dringlichkeit: "info",
    badgeText: "Zuweisen",
    href: "/hosts/nicht-zugeordnet",
  }));

  return (
    <>
      <ContentHeader titel="Dashboard" brotkrumen={[{ titel: "Dashboard" }]} />

      <div className="app-content">
        <div className="container-fluid">
          {ohneKunde.length > 0 ? (
            <Callout
              titel={`${ohneKunde.length} Host${ohneKunde.length === 1 ? "" : "s"} ohne Kunde`}
              aktion={
                <Link href="/hosts/nicht-zugeordnet" className="btn btn-primary pl-touch-target">
                  Jetzt zuweisen
                </Link>
              }
            >
              Neu registrierte Hosts erscheinen hier, bis sie einem Kunden zugewiesen sind:{" "}
              {ohneKunde.map((h) => h.hostname).join(", ")}
            </Callout>
          ) : null}

          <div className="row">
            <div className="col-6 col-lg-3">
              <SmallBox
                wert={kennzahlen.hostsGesamt}
                text="Hosts gemeldet"
                zusatz={`${kennzahlen.ohneMeldung} ohne Meldung`}
                icon="bi-hdd-stack"
                farbe="info"
                href="/hosts"
              />
            </div>
            <div className="col-6 col-lg-3">
              <SmallBox
                wert={kennzahlen.aktivLizenziert}
                text="Aktiv lizenziert"
                zusatz={`${kennzahlen.ohneSubscription} ohne gültige Subscription`}
                icon="bi-patch-check"
                farbe="success"
                href="/hosts?status=active"
              />
            </div>
            <div className="col-6 col-lg-3">
              <SmallBox
                wert={kennzahlen.baldAblaufend}
                text="Läuft in 30 Tagen ab"
                zusatz="Verlängerung vorbereiten"
                icon="bi-hourglass-split"
                farbe="warning"
                href="/jahresbahn"
              />
            </div>
            <div className="col-6 col-lg-3">
              <SmallBox
                wert={kennzahlen.offeneRechnungspunkte}
                text="Offene Rechnungspunkte"
                zusatz={`${kennzahlen.offeneEinkaufsrechnungen} Einkauf · ${kennzahlen.fehlendeKundenrechnungen} Verkauf`}
                icon="bi-receipt"
                farbe="danger"
                href="/rechnungen"
              />
            </div>
          </div>

          <div className="row">
            <div className="col-lg-8">
              <Card titel="Subscriptions nach Ablaufdatum" rahmen="primary" tabelle>
                <div className="table-responsive">
                  <table className="table table-striped align-middle">
                    <thead>
                      <tr>
                        <th scope="col">Host</th>
                        <th scope="col">Kunde</th>
                        <th scope="col">Key</th>
                        <th scope="col">Ablauf</th>
                        <th scope="col">Proxmox</th>
                        <th scope="col">Kundenrechnung</th>
                      </tr>
                    </thead>
                    <tbody>
                      {hostsNachAblauf().map((host) => {
                        const kunde = getKunde(host.kundeId);
                        const laufzeit = laufzeitZuAblauf(host);
                        return (
                          <tr key={host.id}>
                            <td>
                              <Link href={`/hosts/${host.id}`} className="fw-semibold text-decoration-none">
                                {host.hostname}
                              </Link>
                              {hostMeldetNicht(host) ? <KeineMeldungBadge /> : null}
                            </td>
                            <td>
                              {kunde ? (
                                <Link href={`/kunden/${kunde.id}`} className="text-decoration-none">
                                  {kunde.name}
                                </Link>
                              ) : (
                                <span className="badge pl-bg-neutral">Nicht zugeordnet</span>
                              )}
                            </td>
                            <td>
                              <CopyableCode wert={host.subscription.key} />
                            </td>
                            <td>
                              <AblaufBadge datum={host.subscription.nextduedate} heute={HEUTE} />
                            </td>
                            <td>
                              <EinkaufBadge bezahlt={laufzeit?.einkauf ? laufzeit.einkauf.bezahlt : null} />
                            </td>
                            <td>
                              <VerkaufBadge
                                erstellt={laufzeit?.verkauf?.erstellt ?? false}
                                bezahlt={laufzeit?.verkauf?.bezahlt ?? false}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>

            <div className="col-lg-4">
              <Card
                titel="Aufgaben"
                rahmen="warning"
                werkzeuge={
                  <span className="badge pl-bg-warning">
                    {aufgaben.length + nichtZugeordnetAufgaben.length}
                  </span>
                }
              >
                <TodoList aufgaben={[...aufgaben, ...nichtZugeordnetAufgaben]} />
              </Card>
            </div>
          </div>

          <div className="row">
            <div className="col-lg-8">
              <Card titel="Rechnungsstatus je Kunde" rahmen="info">
                {fortschritt.map((eintrag) => (
                  <div className="mb-3" key={eintrag.kunde.id}>
                    <div className="d-flex justify-content-between small mb-1">
                      <Link href={`/kunden/${eintrag.kunde.id}`} className="text-decoration-none">
                        {eintrag.kunde.name}
                      </Link>
                      <span className="text-body-secondary">
                        {eintrag.erledigt} von {eintrag.gesamt} Punkten erledigt
                      </span>
                    </div>
                    <ProgressBar
                      prozent={eintrag.prozent}
                      beschriftung={`Rechnungsstatus ${eintrag.kunde.name}`}
                    />
                  </div>
                ))}
              </Card>
            </div>
            <div className="col-lg-4">
              <Card titel="Nächste Schritte" rahmen="info">
                <ul className="list-unstyled mb-0 small">
                  <li className="mb-2">
                    <i className="bi bi-arrow-right-short" aria-hidden="true" />{" "}
                    <Link href="/kunden">Kundenübersicht öffnen</Link>
                  </li>
                  <li className="mb-2">
                    <i className="bi bi-arrow-right-short" aria-hidden="true" />{" "}
                    <Link href="/rechnungen">Rechnungen pflegen</Link>
                  </li>
                  <li>
                    <i className="bi bi-arrow-right-short" aria-hidden="true" />{" "}
                    <Link href="/jahresbahn">Abläufe der nächsten 12 Monate ansehen</Link>
                  </li>
                </ul>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
