/**
 * Einfaches Token-Bucket-Rate-Limit im Prozessspeicher.
 * Für eine einzelne Instanz ausreichend; bei mehreren Instanzen müsste der Zustand
 * in die Datenbank oder einen gemeinsamen Cache wandern (siehe #014).
 */

interface Eimer {
  tokens: number;
  zuletzt: number;
}

export interface RateLimitErgebnis {
  erlaubt: boolean;
  /** Sekunden bis zum nächsten erlaubten Versuch (nur wenn abgelehnt). */
  wiederholenNach: number;
  verbleibend: number;
}

export class RateLimit {
  private eimer = new Map<string, Eimer>();

  constructor(
    private readonly kapazitaet: number,
    private readonly nachfuellProSekunde: number,
  ) {}

  pruefe(schluessel: string, jetzt: number = Date.now()): RateLimitErgebnis {
    const vorhanden = this.eimer.get(schluessel) ?? { tokens: this.kapazitaet, zuletzt: jetzt };
    const vergangen = Math.max(0, (jetzt - vorhanden.zuletzt) / 1000);
    const tokens = Math.min(this.kapazitaet, vorhanden.tokens + vergangen * this.nachfuellProSekunde);

    if (tokens < 1) {
      this.eimer.set(schluessel, { tokens, zuletzt: jetzt });
      return {
        erlaubt: false,
        wiederholenNach: Math.ceil((1 - tokens) / this.nachfuellProSekunde),
        verbleibend: 0,
      };
    }

    this.eimer.set(schluessel, { tokens: tokens - 1, zuletzt: jetzt });
    return { erlaubt: true, wiederholenNach: 0, verbleibend: Math.floor(tokens - 1) };
  }

  /** Entfernt Einträge, die wieder voll aufgefüllt sind (Aufräumen bei vielen Hosts). */
  aufraeumen(jetzt: number = Date.now()) {
    const vollNach = (this.kapazitaet / this.nachfuellProSekunde) * 1000;
    for (const [schluessel, eimer] of this.eimer) {
      if (jetzt - eimer.zuletzt > vollNach) this.eimer.delete(schluessel);
    }
  }

  zuruecksetzen() {
    this.eimer.clear();
  }
}

/** 10 Anfragen pro Minute je Token bzw. IP – ein Agent meldet sich einmal täglich. */
export const agentRateLimit = new RateLimit(10, 10 / 60);

/** Registrierungen sind seltener und werden strenger begrenzt. */
export const enrollRateLimit = new RateLimit(5, 5 / 60);

/** Ermittelt die Client-IP hinter einem Reverse Proxy. */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return headers.get("x-real-ip") ?? "unbekannt";
}
