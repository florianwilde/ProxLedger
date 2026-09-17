/** Deutsche Formatierung für Datum, Währung und Zahlen. Anzeige-Zeitzone: Europe/Berlin. */

const ZEITZONE = "Europe/Berlin";

const datumFormat = new Intl.DateTimeFormat("de-DE", {
  timeZone: ZEITZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const datumZeitFormat = new Intl.DateTimeFormat("de-DE", {
  timeZone: ZEITZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const waehrungFormat = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });

export function formatDatum(wert: string | Date | null | undefined): string {
  if (!wert) return "–";
  return datumFormat.format(new Date(wert));
}

export function formatDatumZeit(wert: string | Date | null | undefined): string {
  if (!wert) return "–";
  return `${datumZeitFormat.format(new Date(wert))} Uhr`;
}

export function formatEuro(betrag: number | null | undefined): string {
  if (betrag === null || betrag === undefined) return "–";
  return waehrungFormat.format(betrag);
}

export function formatZahl(wert: number | null | undefined): string {
  if (wert === null || wert === undefined) return "–";
  return new Intl.NumberFormat("de-DE").format(wert);
}

/** Ganze Tage zwischen heute und einem Datum; negativ, wenn das Datum in der Vergangenheit liegt. */
export function tageBis(datum: string | Date | null | undefined, heute: Date): number | null {
  if (!datum) return null;
  const tagMs = 24 * 60 * 60 * 1000;
  const ziel = Date.UTC(
    new Date(datum).getUTCFullYear(),
    new Date(datum).getUTCMonth(),
    new Date(datum).getUTCDate(),
  );
  const start = Date.UTC(heute.getUTCFullYear(), heute.getUTCMonth(), heute.getUTCDate());
  return Math.round((ziel - start) / tagMs);
}

export function formatTageBis(tage: number | null): string {
  if (tage === null) return "–";
  if (tage === 0) return "heute";
  if (tage === 1) return "in 1 Tag";
  if (tage > 1) return `in ${tage} Tagen`;
  if (tage === -1) return "seit 1 Tag";
  return `seit ${Math.abs(tage)} Tagen`;
}

export function formatUptime(sekunden: number | null | undefined): string {
  if (sekunden === null || sekunden === undefined) return "–";
  const tage = Math.floor(sekunden / 86400);
  const stunden = Math.floor((sekunden % 86400) / 3600);
  if (tage > 0) return `${formatZahl(tage)} Tage, ${stunden} h`;
  return `${stunden} h`;
}

/** Stunden seit einem Zeitpunkt, für die Regel „keine Meldung seit 48 h“. */
export function stundenSeit(zeitpunkt: string | Date | null | undefined, jetzt: Date): number | null {
  if (!zeitpunkt) return null;
  return (jetzt.getTime() - new Date(zeitpunkt).getTime()) / 3_600_000;
}
