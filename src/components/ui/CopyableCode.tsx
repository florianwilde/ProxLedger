"use client";

import { useState } from "react";

/** Monospace-Wert (Key, Server-ID, Rechnungsnummer) mit Kopier-Button. */
export function CopyableCode({ wert, className = "" }: { wert: string | null; className?: string }) {
  const [kopiert, setKopiert] = useState(false);

  if (!wert) return <span className="text-body-secondary">–</span>;

  async function kopieren() {
    try {
      await navigator.clipboard.writeText(wert as string);
      setKopiert(true);
      setTimeout(() => setKopiert(false), 1500);
    } catch {
      // Zwischenablage nicht verfügbar (z. B. ohne HTTPS) – Wert bleibt markierbar.
    }
  }

  return (
    <span className={`d-inline-flex align-items-center gap-1 ${className}`}>
      <span className="pl-mono">{wert}</span>
      <button
        type="button"
        className="pl-copy-button"
        onClick={kopieren}
        title={`${wert} kopieren`}
        aria-label={`${wert} kopieren`}
      >
        <i className={`bi ${kopiert ? "bi-check-lg" : "bi-clipboard"}`} aria-hidden="true" />
      </button>
    </span>
  );
}
