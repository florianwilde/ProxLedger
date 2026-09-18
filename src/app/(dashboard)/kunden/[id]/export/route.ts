import { PRODUKT_TEXT, STATUS_TEXT, statusAusDatenbank } from "@/lib/anzeige";
import { formatDatum, formatEuro } from "@/lib/format";
import { Abschnitt, Bericht, pdfAntwort, Tabelle } from "@/server/pdf/dokument";
import { kundeMitDetails, laufzeitenVonKunde, summen, summenProJahr } from "@/server/queries/kunden";
import { einstellungen } from "@/server/einstellungen";

export const dynamic = "force-dynamic";

/** Kundenunterlage als PDF: Hosts, Laufzeiten und Summen eines Kunden. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const kunde = await kundeMitDetails(id);
  if (!kunde) return new Response("Nicht gefunden", { status: 404 });

  const laufzeiten = await laufzeitenVonKunde(kunde.id);
  const gesamt = summen(laufzeiten);
  const proJahr = summenProJahr(laufzeiten);
  const datum = new Date().toISOString().slice(0, 10);
  const { firmaName, firmaAnschrift, firmaEmail, zeitzone } = await einstellungen();
  const firmaAngaben = { name: firmaName, anschrift: firmaAnschrift, email: firmaEmail, zeitzone };

  return pdfAntwort(
    Bericht({
      firma: firmaAngaben,
      titel: kunde.name,
      untertitel: `Kundennummer ${kunde.kundennummer}${kunde.ansprechpartner ? ` · ${kunde.ansprechpartner}` : ""}`,
      children: [
        Abschnitt({ titel: `Hosts (${kunde.hosts.length})` }),
        Tabelle({
          spalten: [
            { titel: "Host", breite: 28, wert: (h: (typeof kunde.hosts)[number]) => h.hostname },
            { titel: "Produkt", breite: 22, wert: (h) => PRODUKT_TEXT[h.produkt] },
            { titel: "Status", breite: 16, wert: (h) => STATUS_TEXT[statusAusDatenbank(h.subStatus)] },
            { titel: "Key", breite: 20, wert: (h) => h.subKey ?? "–" },
            {
              titel: "Ablauf",
              breite: 14,
              wert: (h) => (h.subNextduedate ? formatDatum(h.subNextduedate) : "–"),
              rechts: true,
            },
          ],
          zeilen: kunde.hosts,
        }),

        Abschnitt({ titel: `Laufzeiten (${laufzeiten.length})` }),
        Tabelle({
          spalten: [
            {
              titel: "Zeitraum",
              breite: 26,
              wert: (l: (typeof laufzeiten)[number]) => `${formatDatum(l.start)} – ${formatDatum(l.ende)}`,
            },
            { titel: "Host", breite: 18, wert: (l) => l.hostname },
            { titel: "Proxmox-Rechnung", breite: 18, wert: (l) => l.einkauf?.nummer ?? "–" },
            { titel: "Einkauf", breite: 12, wert: (l) => formatEuro(l.einkauf?.nettoBetrag), rechts: true },
            { titel: "Kundenrechnung", breite: 18, wert: (l) => l.verkauf?.nummer ?? "–" },
            { titel: "Verkauf", breite: 8, wert: (l) => formatEuro(l.verkauf?.nettoBetrag), rechts: true },
          ],
          zeilen: laufzeiten,
          summe: ["Summe", "", "", formatEuro(gesamt.einkauf), "", formatEuro(gesamt.verkauf)],
        }),

        Abschnitt({ titel: "Summen pro Jahr" }),
        Tabelle({
          spalten: [
            { titel: "Jahr", breite: 25, wert: (j: (typeof proJahr)[number]) => j.jahr },
            { titel: "Einkauf netto", breite: 25, wert: (j) => formatEuro(j.einkauf), rechts: true },
            { titel: "Verkauf netto", breite: 25, wert: (j) => formatEuro(j.verkauf), rechts: true },
            { titel: "Marge", breite: 25, wert: (j) => formatEuro(j.marge), rechts: true },
          ],
          zeilen: proJahr,
          summe: ["Gesamt", formatEuro(gesamt.einkauf), formatEuro(gesamt.verkauf), formatEuro(gesamt.marge)],
        }),
      ],
    }),
    `proxledger-${kunde.kundennummer}-${datum}.pdf`,
  );
}
