import { Document, Page, Path, StyleSheet, Svg, Text, View, renderToBuffer } from "@react-pdf/renderer";
import type { DocumentProps } from "@react-pdf/renderer";
import type { ReactElement } from "react";

/**
 * Gemeinsames Aussehen aller PDF-Ausgaben: einfarbiges Logo, Titel, Datum, Seitenzahl.
 * Gerendert wird serverseitig ohne Browser (@react-pdf/renderer).
 */

const NAVY = "#1E2A44";

const stile = StyleSheet.create({
  seite: { paddingTop: 40, paddingBottom: 48, paddingHorizontal: 40, fontSize: 9, color: "#1F2D3D" },
  kopf: { flexDirection: "row", alignItems: "center", marginBottom: 18 },
  kopfText: { marginLeft: 10 },
  marke: { fontSize: 14, color: NAVY },
  titel: { fontSize: 16, marginBottom: 2 },
  untertitel: { fontSize: 9, color: "#6C757D" },
  tabellenKopf: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: NAVY,
    paddingBottom: 4,
    marginBottom: 2,
    fontSize: 8,
    color: NAVY,
  },
  zeile: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#DEE2E6",
    paddingVertical: 3,
  },
  summenZeile: { flexDirection: "row", borderTopWidth: 1, borderTopColor: NAVY, paddingTop: 4, marginTop: 2 },
  fuss: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: "#6C757D",
  },
  abschnitt: { marginTop: 14, marginBottom: 6, fontSize: 11, color: NAVY },
});

function Logo() {
  return (
    <Svg viewBox="0 0 48 48" style={{ width: 28, height: 28 }}>
      <Path
        d="M8 4h19a12 12 0 0 1 0 24H16v16H8zM16 11h10a5 5 0 0 1 0 10H16z"
        fill={NAVY}
        fillRule="evenodd"
      />
      <Path d="M22 36h20M22 43h14" stroke={NAVY} strokeWidth={3.5} strokeLinecap="round" />
    </Svg>
  );
}

export interface Spalte<T> {
  titel: string;
  breite: number;
  wert: (zeile: T) => string;
  rechts?: boolean;
}

/** Etwas Luft zwischen den Spalten, sonst stoßen rechtsbündige Zahlen an den nächsten Text. */
const zelle = (breite: number, rechts?: boolean) => ({
  width: `${breite}%`,
  textAlign: (rechts ? "right" : "left") as "right" | "left",
  paddingRight: 6,
});

export function Tabelle<T>({
  spalten,
  zeilen,
  summe,
}: {
  spalten: Spalte<T>[];
  zeilen: T[];
  summe?: string[];
}) {
  return (
    <View>
      <View style={stile.tabellenKopf} fixed>
        {spalten.map((spalte) => (
          <Text key={spalte.titel} style={zelle(spalte.breite, spalte.rechts)}>
            {spalte.titel}
          </Text>
        ))}
      </View>
      {zeilen.map((zeile, index) => (
        <View key={index} style={stile.zeile} wrap={false}>
          {spalten.map((spalte) => (
            <Text key={spalte.titel} style={zelle(spalte.breite, spalte.rechts)}>
              {spalte.wert(zeile)}
            </Text>
          ))}
        </View>
      ))}
      {summe ? (
        <View style={stile.summenZeile}>
          {summe.map((wert, index) => (
            <Text key={index} style={zelle(spalten[index]?.breite ?? 10, spalten[index]?.rechts)}>
              {wert}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

export function Abschnitt({ titel }: { titel: string }) {
  return <Text style={stile.abschnitt}>{titel}</Text>;
}

export function Bericht({
  titel,
  untertitel,
  children,
  quer = false,
  firma,
}: {
  titel: string;
  untertitel?: string;
  children: React.ReactNode;
  quer?: boolean;
  /** Firmenangaben und Zeitzone aus den Einstellungen (#025). */
  firma?: { name: string; anschrift: string; email: string; zeitzone: string };
}) {
  const erstellt = new Intl.DateTimeFormat("de-DE", {
    timeZone: firma?.zeitzone || "Europe/Berlin",
    dateStyle: "long",
  }).format(new Date());

  return (
    <Document title={titel} author="ProxLedger">
      <Page size="A4" orientation={quer ? "landscape" : "portrait"} style={stile.seite}>
        <View style={stile.kopf} fixed>
          <Logo />
          <View style={stile.kopfText}>
            <Text style={stile.marke}>{firma?.name || "ProxLedger"}</Text>
            <Text style={stile.untertitel}>
              {firma?.anschrift ? firma.anschrift.replace(/\n/g, " · ") : "Proxmox Subscription Dashboard"}
            </Text>
            {firma?.email ? <Text style={stile.untertitel}>{firma.email}</Text> : null}
          </View>
        </View>

        <Text style={stile.titel}>{titel}</Text>
        {untertitel ? <Text style={stile.untertitel}>{untertitel}</Text> : null}
        <View style={{ marginTop: 12 }}>{children}</View>

        <View style={stile.fuss} fixed>
          <Text>Erstellt am {erstellt}</Text>
          <Text render={({ pageNumber, totalPages }) => `Seite ${pageNumber} von ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

export async function pdfAntwort(element: ReactElement<DocumentProps>, dateiname: string): Promise<Response> {
  const puffer = await renderToBuffer(element);
  return new Response(new Uint8Array(puffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${dateiname}"`,
      "Cache-Control": "no-store",
    },
  });
}
