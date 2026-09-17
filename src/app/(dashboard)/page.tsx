import Link from "next/link";
import { ContentHeader } from "@/components/layout/ContentHeader";
import { AblaufBadge, EinkaufBadge, KeineMeldungBadge, VerkaufBadge } from "@/components/ui/Badges";
import { Callout, ProgressBar } from "@/components/ui/Callout";
import { Card } from "@/components/ui/Card";
import { CopyableCode } from "@/components/ui/CopyableCode";
import { SmallBox } from "@/components/ui/SmallBox";
import { TodoList, type Aufgabe } from "@/components/ui/TodoList";
import { formatDatum, formatEuro } from "@/lib/format";
import { hostsNachAblauf, offeneAufgaben } from "@/server/queries/dashboard";
import { hostsOhneKunde, kennzahlen } from "@/server/queries/hosts";
import { kundenListe, offeneRechnungspunkteProKunde } from "@/server/queries/kunden";

export const metadata = { title: "Dashboard" };

export default async function DashboardSeite() {
  const heute = new Date();
  const [zahlen, ohneKunde, ablaufListe, aufgabenRoh, kunden, rechnungspunkte] = await Promise.all([
    kennzahlen(heute),
    hostsOhneKunde(),
    hostsNachAblauf(heute),
    offeneAufgaben(),
    kundenListe(),
    offeneRechnungspunkteProKunde(),
  ]);

  const aufgaben: Aufgabe[] = [
    ...aufgabenRoh.map((aufgabe) => ({
      id: aufgabe.id,
      titel: aufgabe.titel,
      detail: [
        aufgabe.detail,
        aufgabe.betrag !== null ? `${formatEuro(aufgabe.betrag)} netto` : null,
        aufgabe.faelligAm ? `fällig am ${formatDatum(aufgabe.faelligAm)}` : null,
        `Laufzeit ${formatDatum(aufgabe.start)} – ${formatDatum(aufgabe.ende)}`,
      ]
        .filter(Boolean)
        .join(" · "),
      dringlichkeit: aufgabe.dringlichkeit,
      badgeText: aufgabe.badgeText,
      href: aufgabe.href,
      aktion: aufgabe.aktion,
    })),
    ...ohneKunde.map((host) => ({
      id: `zuweisen-${host.id}`,
      titel: `${host.hostname} einem Kunden zuweisen`,
      detail: `Server-ID ${host.serverId ?? "unbekannt"} · seit ${formatDatum(host.erstmalsGesehenAm)} gemeldet`,
      dringlichkeit: "info" as const,
      badgeText: "Zuweisen",
      href: "/hosts/nicht-zugeordnet",
    })),
  ];

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
              {ohneKunde.map((host) => host.hostname).join(", ")}
            </Callout>
          ) : null}

          <div className="row">
            <div className="col-6 col-lg-3">
              <SmallBox
                wert={zahlen.hostsGesamt}
                text="Hosts gemeldet"
                zusatz={`${zahlen.ohneMeldung} ohne Meldung`}
                icon="bi-hdd-stack"
                farbe="info"
                href="/hosts"
              />
            </div>
            <div className="col-6 col-lg-3">
              <SmallBox
                wert={zahlen.aktivLizenziert}
                text="Aktiv lizenziert"
                zusatz={`${zahlen.ohneSubscription} ohne gültige Subscription`}
                icon="bi-patch-check"
                farbe="success"
                href="/hosts?status=ACTIVE"
              />
            </div>
            <div className="col-6 col-lg-3">
              <SmallBox
                wert={zahlen.baldAblaufend}
                text="Läuft in 30 Tagen ab"
                zusatz="Verlängerung vorbereiten"
                icon="bi-hourglass-split"
                farbe="warning"
                href="/jahresbahn"
              />
            </div>
            <div className="col-6 col-lg-3">
              <SmallBox
                wert={zahlen.offeneRechnungspunkte}
                text="Offene Rechnungspunkte"
                zusatz={`${zahlen.offeneEinkaufsrechnungen} Einkauf · ${zahlen.fehlendeKundenrechnungen} Verkauf`}
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
                      {ablaufListe.map((host) => (
                        <tr key={host.id}>
                          <td>
                            <Link href={`/hosts/${host.id}`} className="fw-semibold text-decoration-none">
                              {host.hostname}
                            </Link>
                            {host.meldetNicht ? <KeineMeldungBadge /> : null}
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
                          </td>
                          <td>
                            <CopyableCode wert={host.subKey} />
                          </td>
                          <td>
                            <AblaufBadge datum={host.nextduedate?.toISOString() ?? null} heute={heute} />
                          </td>
                          <td>
                            <EinkaufBadge bezahlt={host.einkaufBezahlt} />
                          </td>
                          <td>
                            <VerkaufBadge erstellt={host.verkaufErstellt} bezahlt={host.verkaufBezahlt} />
                          </td>
                        </tr>
                      ))}
                      {ablaufListe.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center text-body-secondary py-4">
                            Noch kein Host mit Subscription gemeldet.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>

            <div className="col-lg-4">
              <Card
                titel="Aufgaben"
                rahmen="warning"
                werkzeuge={<span className="badge pl-bg-warning">{aufgaben.length}</span>}
              >
                <TodoList aufgaben={aufgaben} />
              </Card>
            </div>
          </div>

          <div className="row">
            <div className="col-lg-8">
              <Card titel="Rechnungsstatus je Kunde" rahmen="info">
                {kunden.length === 0 ? (
                  <p className="mb-0 text-body-secondary">
                    Noch keine Kunden angelegt. <Link href="/kunden/neu">Ersten Kunden anlegen</Link>
                  </p>
                ) : (
                  kunden.map((kunde) => {
                    const punkte = rechnungspunkte.get(kunde.id) ?? { offen: 0, gesamt: 0 };
                    const erledigt = punkte.gesamt - punkte.offen;
                    const prozent = punkte.gesamt === 0 ? 100 : Math.round((erledigt / punkte.gesamt) * 100);
                    return (
                      <div className="mb-3" key={kunde.id}>
                        <div className="d-flex justify-content-between small mb-1">
                          <Link href={`/kunden/${kunde.id}`} className="text-decoration-none">
                            {kunde.name}
                          </Link>
                          <span className="text-body-secondary">
                            {erledigt} von {punkte.gesamt} Punkten erledigt
                          </span>
                        </div>
                        <ProgressBar prozent={prozent} beschriftung={`Rechnungsstatus ${kunde.name}`} />
                      </div>
                    );
                  })
                )}
              </Card>
            </div>
            <div className="col-lg-4">
              <Card titel="Nächste Schritte" rahmen="info">
                <ul className="list-unstyled mb-0 small">
                  <li className="mb-2">
                    <i className="bi bi-arrow-right-short" aria-hidden="true" />{" "}
                    <Link href="/einstellungen/tokens">Agent auf einem Host ausrollen</Link>
                  </li>
                  <li className="mb-2">
                    <i className="bi bi-arrow-right-short" aria-hidden="true" />{" "}
                    <Link href="/kunden">Kundenübersicht öffnen</Link>
                  </li>
                  <li>
                    <i className="bi bi-arrow-right-short" aria-hidden="true" />{" "}
                    <Link href="/rechnungen">Rechnungen pflegen</Link>
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
