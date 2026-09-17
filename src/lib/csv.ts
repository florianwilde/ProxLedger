/** CSV für deutsche Tabellenkalkulationen: Semikolon, UTF-8 mit BOM, Komma als Dezimaltrennzeichen. */

const datumFormat = new Intl.DateTimeFormat("de-DE", {
  timeZone: "Europe/Berlin",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function csvZelle(wert: string | number | Date | null | undefined): string {
  if (wert === null || wert === undefined) return "";
  if (wert instanceof Date) return datumFormat.format(wert);
  if (typeof wert === "number") {
    // Ganze Zahlen (z. B. Sockets) ohne Nachkommastellen, Beträge mit zwei.
    return Number.isInteger(wert)
      ? wert.toLocaleString("de-DE")
      : wert.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  const text = String(wert);
  return /[";\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function csvDatei(
  kopfzeile: string[],
  zeilen: (string | number | Date | null | undefined)[][],
): string {
  const inhalt = [kopfzeile, ...zeilen].map((zeile) => zeile.map(csvZelle).join(";")).join("\r\n");
  // Das BOM sorgt dafür, dass Excel die Umlaute richtig liest.
  return `\uFEFF${inhalt}\r\n`;
}

export function csvAntwort(inhalt: string, dateiname: string): Response {
  return new Response(inhalt, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${dateiname}"`,
      "Cache-Control": "no-store",
    },
  });
}
