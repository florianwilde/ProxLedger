import { csvAntwort, csvDatei } from "@/lib/csv";
import { formatDatum, formatEuro } from "@/lib/format";
import { Bericht, pdfAntwort, Tabelle } from "@/server/pdf/dokument";
import {
  kundenListe,
  offeneRechnungspunkteProKunde,
  laufzeitenVonKunde,
  summen,
} from "@/server/queries/kunden";

export const dynamic = "force-dynamic";

/** Kundenübersicht als CSV oder PDF. */
export async function GET(request: Request) {
  const format = new URL(request.url).searchParams.get("format") ?? "csv";
  const [kunden, punkte] = await Promise.all([kundenListe(), offeneRechnungspunkteProKunde()]);

  const zeilen = await Promise.all(
    kunden.map(async (kunde) => {
      const laufzeiten = await laufzeitenVonKunde(kunde.id);
      const betraege = summen(laufzeiten);
      return {
        ...kunde,
        offeneRechnungspunkte: punkte.get(kunde.id)?.offen ?? 0,
        ...betraege,
      };
    }),
  );

  const datum = new Date().toISOString().slice(0, 10);

  if (format === "pdf") {
    return pdfAntwort(
      Bericht({
        titel: "Kundenübersicht",
        untertitel: `${zeilen.length} Kunden`,
        quer: true,
        children: Tabelle({
          spalten: [
            { titel: "Kunde", breite: 26, wert: (z: (typeof zeilen)[number]) => z.name },
            { titel: "Nummer", breite: 10, wert: (z) => z.kundennummer },
            { titel: "Hosts", breite: 7, wert: (z) => String(z.hosts), rechts: true },
            { titel: "Aktiv", breite: 7, wert: (z) => String(z.aktiv), rechts: true },
            {
              titel: "Nächster Ablauf",
              breite: 13,
              wert: (z) => (z.naechsterAblauf ? formatDatum(z.naechsterAblauf) : "–"),
            },
            { titel: "Warnungen", breite: 9, wert: (z) => String(z.offeneAlerts), rechts: true },
            {
              titel: "Offene Rechn.",
              breite: 10,
              wert: (z) => String(z.offeneRechnungspunkte),
              rechts: true,
            },
            { titel: "Einkauf", breite: 9, wert: (z) => formatEuro(z.einkauf), rechts: true },
            { titel: "Marge", breite: 9, wert: (z) => formatEuro(z.marge), rechts: true },
          ],
          zeilen,
          summe: [
            "Summe",
            "",
            String(zeilen.reduce((s, z) => s + z.hosts, 0)),
            String(zeilen.reduce((s, z) => s + z.aktiv, 0)),
            "",
            "",
            "",
            formatEuro(zeilen.reduce((s, z) => s + z.einkauf, 0)),
            formatEuro(zeilen.reduce((s, z) => s + z.marge, 0)),
          ],
        }),
      }),
      `proxledger-kunden-${datum}.pdf`,
    );
  }

  const inhalt = csvDatei(
    [
      "Kunde",
      "Kundennummer",
      "Ansprechpartner",
      "Hosts",
      "Aktiv lizenziert",
      "Nächster Ablauf",
      "Offene Warnungen",
      "Offene Rechnungspunkte",
      "Einkauf netto",
      "Verkauf netto",
      "Marge netto",
    ],
    zeilen.map((z) => [
      z.name,
      z.kundennummer,
      z.ansprechpartner,
      z.hosts,
      z.aktiv,
      z.naechsterAblauf,
      z.offeneAlerts,
      z.offeneRechnungspunkte,
      z.einkauf,
      z.verkauf,
      z.marge,
    ]),
  );

  return csvAntwort(inhalt, `proxledger-kunden-${datum}.csv`);
}
