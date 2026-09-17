import Link from "next/link";
import { ContentHeader } from "@/components/layout/ContentHeader";
import { ZuweisungsFormular } from "@/components/hosts/ZuweisungsFormular";
import { Callout } from "@/components/ui/Callout";
import { Card } from "@/components/ui/Card";
import { prisma } from "@/lib/db";
import { hostsOhneKunde } from "@/server/queries/hosts";

export const metadata = { title: "Nicht zugeordnete Hosts" };

export default async function NichtZugeordnetSeite() {
  const [hosts, kunden] = await Promise.all([
    hostsOhneKunde(),
    prisma.kunde.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        standorte: { select: { id: true, name: true }, orderBy: { name: "asc" } },
      },
    }),
  ]);

  return (
    <>
      <ContentHeader
        titel="Nicht zugeordnete Hosts"
        brotkrumen={[{ titel: "Hosts", href: "/hosts" }, { titel: "Nicht zugeordnet" }]}
      />

      <div className="app-content">
        <div className="container-fluid">
          {hosts.length === 0 ? (
            <Callout titel="Alles zugeordnet" farbe="info">
              Jeder gemeldete Host gehört zu einem Kunden. Neu registrierte Hosts erscheinen automatisch hier.
            </Callout>
          ) : (
            <Callout titel="Schnellzuweisung" farbe="warning">
              Hosts auswählen, Kunde wählen und in einem Schritt zuweisen. Wer Hosts direkt vorzuordnen
              möchte, erzeugt unter <Link href="/einstellungen/tokens">Agent-Tokens</Link> einen
              Enrollment-Token mit Kundenbindung – damit landen neue Hosts sofort beim richtigen Kunden.
            </Callout>
          )}

          {kunden.length === 0 ? (
            <Callout titel="Noch kein Kunde vorhanden" farbe="danger">
              Zum Zuweisen wird mindestens ein Kunde benötigt.{" "}
              <Link href="/kunden/neu">Jetzt einen Kunden anlegen.</Link>
            </Callout>
          ) : null}

          {hosts.length > 0 ? (
            <Card titel={`${hosts.length} Hosts ohne Kunde`} rahmen="warning" tabelle>
              <ZuweisungsFormular
                hosts={hosts.map((host) => ({
                  id: host.id,
                  hostname: host.hostname,
                  produkt: host.produkt,
                  serverId: host.serverId,
                  subKey: host.subKey,
                  erstmalsGesehenAm: host.erstmalsGesehenAm.toISOString(),
                }))}
                kunden={kunden}
              />
            </Card>
          ) : null}
        </div>
      </div>
    </>
  );
}
