"use client";

import { useState, useTransition } from "react";
import { alertsJetztPruefen } from "@/server/actions/alerts";

/** Stößt die Auswertung sofort an, statt auf den nächsten Durchlauf des Workers zu warten. */
export function PruefenKnopf() {
  const [meldung, setMeldung] = useState<string | null>(null);
  const [laeuft, starte] = useTransition();

  return (
    <span className="d-flex align-items-center gap-2">
      <button
        type="button"
        className="btn btn-sm btn-outline-primary"
        disabled={laeuft}
        onClick={() =>
          starte(async () => {
            const ergebnis = await alertsJetztPruefen();
            setMeldung(ergebnis.erfolg ?? ergebnis.fehler ?? null);
          })
        }
      >
        <i className="bi bi-arrow-clockwise me-1" aria-hidden="true" />
        {laeuft ? "Prüft …" : "Jetzt prüfen"}
      </button>
      {meldung ? <span className="small text-body-secondary">{meldung}</span> : null}
    </span>
  );
}
