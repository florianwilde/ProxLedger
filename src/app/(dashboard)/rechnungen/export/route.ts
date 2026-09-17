import { csvAntwort, csvDatei } from "@/lib/csv";
import { formatDatum, formatEuro } from "@/lib/format";
import { Bericht, pdfAntwort, Tabelle } from "@/server/pdf/dokument";
import { rechnungsListe, type RechnungsFilter } from "@/server/queries/rechnungen";

export const dynamic = "force-dynamic";

/** Rechnungsliste als CSV (Buchhaltung) oder PDF, mit den Filtern der Ansicht. */
export async function GET(request: Request) {
  const parameter = new URL(request.url).searchParams;
  const format = parameter.get("format") ?? "csv";
  const filter: RechnungsFilter = {
    status: (parameter.get("status") as RechnungsFilter["status"]) ?? "alle",
    kunde: parameter.get("kunde") ?? undefined,
    jahr: parameter.get("jahr") ?? undefined,
    q: parameter.get("q") ?? undefined,
  };

  const { zeilen, summen } = await rechnungsListe(filter);
  const datum = new Date().toISOString().slice(0, 10);
  const zeitraum = filter.jahr ? `Jahr ${filter.jahr}` : "alle Jahre";

  if (format === "pdf") {
    return pdfAntwort(
      Bericht({
        titel: "Rechnungsliste",
        untertitel: `${zeilen.length} Laufzeiten · ${zeitraum}`,
        quer: true,
        children: Tabelle({
          spalten: [
            {
              titel: "Kunde",
              breite: 18,
              wert: (z: (typeof zeilen)[number]) => z.kunde?.name ?? "Nicht zugeordnet",
            },
            { titel: "Host", breite: 13, wert: (z) => z.hostname },
            {
              titel: "Laufzeit",
              breite: 16,
              wert: (z) => `${formatDatum(z.start)} – ${formatDatum(z.ende)}`,
            },
            { titel: "Proxmox-Rechnung", breite: 13, wert: (z) => z.einkaufNummer ?? "–" },
            { titel: "Einkauf", breite: 9, wert: (z) => formatEuro(z.einkaufBetrag), rechts: true },
            { titel: "Bezahlt", breite: 7, wert: (z) => (z.einkaufBezahlt ? "ja" : "nein") },
            { titel: "Kundenrechnung", breite: 12, wert: (z) => z.verkaufNummer ?? "–" },
            { titel: "Verkauf", breite: 6, wert: (z) => formatEuro(z.verkaufBetrag), rechts: true },
            {
              titel: "Marge",
              breite: 6,
              wert: (z) => (z.marge === null ? "–" : formatEuro(z.marge)),
              rechts: true,
            },
          ],
          zeilen,
          summe: [
            "Summe",
            "",
            "",
            "",
            formatEuro(summen.einkauf),
            "",
            "",
            formatEuro(summen.verkauf),
            formatEuro(summen.marge),
          ],
        }),
      }),
      `proxledger-rechnungen-${filter.jahr ?? "alle"}-${datum}.pdf`,
    );
  }

  const inhalt = csvDatei(
    [
      "Kunde",
      "Host",
      "Key",
      "Laufzeit von",
      "Laufzeit bis",
      "Proxmox-Rechnung",
      "Einkauf netto",
      "Proxmox bezahlt",
      "Fällig am",
      "Kundenrechnung",
      "Verkauf netto",
      "Kundenrechnung erstellt",
      "Vom Kunden bezahlt",
      "Marge netto",
    ],
    zeilen.map((z) => [
      z.kunde?.name ?? "Nicht zugeordnet",
      z.hostname,
      z.key,
      z.start,
      z.ende,
      z.einkaufNummer,
      z.einkaufBetrag,
      z.einkaufBezahlt === null ? "" : z.einkaufBezahlt ? "ja" : "nein",
      z.einkaufFaelligAm,
      z.verkaufNummer,
      z.verkaufBetrag,
      z.verkaufErstellt ? "ja" : "nein",
      z.verkaufBezahlt ? "ja" : "nein",
      z.marge,
    ]),
  );

  return csvAntwort(inhalt, `proxledger-rechnungen-${filter.jahr ?? "alle"}-${datum}.csv`);
}
