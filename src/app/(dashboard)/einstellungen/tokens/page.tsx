import Link from "next/link";
import { ContentHeader } from "@/components/layout/ContentHeader";
import { TokenFormular } from "@/components/tokens/TokenFormular";
import { Badge } from "@/components/ui/Badges";
import { Card } from "@/components/ui/Card";
import { formatDatum, formatDatumZeit } from "@/lib/format";
import { prisma } from "@/lib/db";
import { enrollmentTokenWiderrufen, hostTokenWiderrufen } from "@/server/actions/tokens";

export const metadata = { title: "Agent-Tokens" };

export default async function TokensSeite() {
  const dashboardUrl = (process.env.APP_URL ?? "https://dashboard.example.de").replace(/\/$/, "");

  const [kunden, enrollmentTokens, hostTokens] = await Promise.all([
    prisma.kunde.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.enrollmentToken.findMany({
      orderBy: { erstelltAm: "desc" },
      include: { kunde: { select: { name: true } } },
    }),
    prisma.agentToken.findMany({
      orderBy: { erstelltAm: "desc" },
      include: { host: { select: { id: true, hostname: true } } },
    }),
  ]);

  const jetzt = new Date();

  function zustand(token: {
    widerrufenAm: Date | null;
    gueltigBis: Date | null;
    maxNutzungen: number | null;
    nutzungen: number;
  }) {
    if (token.widerrufenAm) return { text: "Widerrufen", farbe: "neutral" as const };
    if (token.gueltigBis && token.gueltigBis < jetzt) return { text: "Abgelaufen", farbe: "danger" as const };
    if (token.maxNutzungen !== null && token.nutzungen >= token.maxNutzungen)
      return { text: "Aufgebraucht", farbe: "warning" as const };
    return { text: "Gültig", farbe: "success" as const };
  }

  return (
    <>
      <ContentHeader
        titel="Agent-Tokens"
        brotkrumen={[{ titel: "Einstellungen" }, { titel: "Agent-Tokens" }]}
      />

      <div className="app-content">
        <div className="container-fluid">
          <Card titel="Neuen Enrollment-Token erzeugen" rahmen="primary">
            <p className="text-body-secondary">
              Mit einem Enrollment-Token registriert sich ein Agent einmalig und erhält dabei seinen eigenen
              Host-Token. Ist ein Kunde hinterlegt, sind neue Hosts sofort zugeordnet und tauchen nicht unter{" "}
              <Link href="/hosts/nicht-zugeordnet">Nicht zugeordnet</Link> auf.
            </p>
            <TokenFormular kunden={kunden} dashboardUrl={dashboardUrl} />
          </Card>

          <Card titel={`Enrollment-Tokens (${enrollmentTokens.length})`} rahmen="info" tabelle>
            <div className="table-responsive">
              <table className="table table-striped align-middle">
                <thead>
                  <tr>
                    <th scope="col">Bezeichnung</th>
                    <th scope="col">Anfang</th>
                    <th scope="col">Kunde</th>
                    <th scope="col">Gültig bis</th>
                    <th scope="col">Nutzungen</th>
                    <th scope="col">Zustand</th>
                    <th scope="col" className="text-end">
                      Aktion
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {enrollmentTokens.map((token) => {
                    const status = zustand(token);
                    return (
                      <tr key={token.id}>
                        <td>{token.bezeichnung ?? "–"}</td>
                        <td className="pl-mono">{token.praefix}…</td>
                        <td>{token.kunde?.name ?? "–"}</td>
                        <td>{formatDatum(token.gueltigBis)}</td>
                        <td>
                          {token.nutzungen}
                          {token.maxNutzungen !== null ? ` / ${token.maxNutzungen}` : ""}
                        </td>
                        <td>
                          <Badge farbe={status.farbe}>{status.text}</Badge>
                        </td>
                        <td className="text-end">
                          {token.widerrufenAm ? null : (
                            <form action={enrollmentTokenWiderrufen}>
                              <input type="hidden" name="id" value={token.id} />
                              <button type="submit" className="btn btn-sm btn-outline-danger">
                                Widerrufen
                              </button>
                            </form>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {enrollmentTokens.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center text-body-secondary py-4">
                        Noch kein Enrollment-Token erzeugt.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </Card>

          <Card titel={`Host-Tokens (${hostTokens.length})`} rahmen="info" tabelle>
            <div className="table-responsive">
              <table className="table table-striped align-middle">
                <thead>
                  <tr>
                    <th scope="col">Host</th>
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
                  {hostTokens.map((token) => (
                    <tr key={token.id}>
                      <td>
                        <Link href={`/hosts/${token.host.id}`} className="text-decoration-none">
                          {token.host.hostname}
                        </Link>
                      </td>
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
                            <input type="hidden" name="hostId" value={token.host.id} />
                            <button type="submit" className="btn btn-sm btn-outline-danger">
                              Widerrufen
                            </button>
                          </form>
                        )}
                      </td>
                    </tr>
                  ))}
                  {hostTokens.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center text-body-secondary py-4">
                        Noch kein Host registriert.
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
