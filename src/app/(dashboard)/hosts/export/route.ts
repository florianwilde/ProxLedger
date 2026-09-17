import { PRODUKT_TEXT, STATUS_TEXT, statusAusDatenbank } from "@/lib/anzeige";
import { csvAntwort, csvDatei } from "@/lib/csv";
import { hostListe, type HostFilter } from "@/server/queries/hostliste";

export const dynamic = "force-dynamic";

/** CSV-Export der Host-Tabelle; übernimmt die Filter aus der Adresse. */
export async function GET(request: Request) {
  const parameter = new URL(request.url).searchParams;
  const filter: HostFilter = {
    q: parameter.get("q") ?? undefined,
    kunde: parameter.get("kunde") ?? undefined,
    status: parameter.get("status") ?? undefined,
    produkt: parameter.get("produkt") ?? undefined,
    ablauf: (parameter.get("ablauf") as HostFilter["ablauf"]) ?? undefined,
    rechnung: (parameter.get("rechnung") as HostFilter["rechnung"]) ?? undefined,
    sortierung: parameter.get("sortierung") ?? undefined,
    // Der Export enthält alle Treffer, nicht nur die aktuelle Seite.
    seite: 1,
  };

  const { gesamt } = await hostListe({ ...filter }, new Date());
  const alle = [];
  for (let seite = 1; alle.length < gesamt; seite++) {
    const teil = await hostListe({ ...filter, seite }, new Date());
    if (teil.hosts.length === 0) break;
    alle.push(...teil.hosts);
  }

  const inhalt = csvDatei(
    [
      "Hostname",
      "FQDN",
      "Kunde",
      "Standort",
      "Produkt",
      "Version",
      "Status",
      "Subscription-Key",
      "Server-ID",
      "Sockets lizenziert",
      "Sockets physisch",
      "Ablauf",
      "Letzte Meldung",
      "IP-Adressen",
      "Agent-Version",
    ],
    alle.map((host) => [
      host.hostname,
      host.fqdn,
      host.kunde?.name ?? "Nicht zugeordnet",
      host.standort?.name ?? "",
      PRODUKT_TEXT[host.produkt],
      host.produktVersion,
      STATUS_TEXT[statusAusDatenbank(host.subStatus)],
      host.subKey,
      host.serverId,
      host.subLizenzierteSockets,
      host.sockets,
      host.subNextduedate,
      host.letzterReportAm,
      host.ips.join(", "),
      host.agentVersion,
    ]),
  );

  const datum = new Date().toISOString().slice(0, 10);
  return csvAntwort(inhalt, `proxledger-hosts-${datum}.csv`);
}
