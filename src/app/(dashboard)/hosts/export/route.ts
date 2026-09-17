import { PRODUKT_TEXT, STATUS_TEXT, statusAusDatenbank } from "@/lib/anzeige";
import { csvAntwort, csvDatei } from "@/lib/csv";
import { formatDatum } from "@/lib/format";
import { Bericht, pdfAntwort, Tabelle } from "@/server/pdf/dokument";
import { hostListe, type HostFilter } from "@/server/queries/hostliste";

type ExportHost = Awaited<ReturnType<typeof hostListe>>["hosts"][number];

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
  const alle: ExportHost[] = [];
  for (let seite = 1; alle.length < gesamt; seite++) {
    const teil = await hostListe({ ...filter, seite }, new Date());
    if (teil.hosts.length === 0) break;
    alle.push(...teil.hosts);
  }

  const datum = new Date().toISOString().slice(0, 10);

  if (new URL(request.url).searchParams.get("format") === "pdf") {
    return pdfAntwort(
      Bericht({
        titel: "Host-Liste",
        untertitel: `${alle.length} Hosts`,
        quer: true,
        children: Tabelle({
          spalten: [
            { titel: "Host", breite: 18, wert: (h: ExportHost) => h.hostname },
            { titel: "Kunde", breite: 18, wert: (h) => h.kunde?.name ?? "Nicht zugeordnet" },
            { titel: "Produkt", breite: 15, wert: (h) => PRODUKT_TEXT[h.produkt] },
            { titel: "Status", breite: 12, wert: (h) => STATUS_TEXT[statusAusDatenbank(h.subStatus)] },
            { titel: "Key", breite: 15, wert: (h) => h.subKey ?? "–" },
            {
              titel: "Sockets",
              breite: 8,
              wert: (h) => `${h.subLizenzierteSockets ?? "–"} / ${h.sockets ?? "–"}`,
              rechts: true,
            },
            {
              titel: "Ablauf",
              breite: 14,
              wert: (h) => (h.subNextduedate ? formatDatum(h.subNextduedate) : "–"),
              rechts: true,
            },
          ],
          zeilen: alle,
        }),
      }),
      `proxledger-hosts-${datum}.pdf`,
    );
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

  return csvAntwort(inhalt, `proxledger-hosts-${datum}.csv`);
}
