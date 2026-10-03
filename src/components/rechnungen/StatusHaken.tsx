"use client";

import { useTransition } from "react";
import { statusUmschalten } from "@/server/actions/rechnungen";

/**
 * Häkchen, das den Rechnungsstatus direkt in der Tabelle setzt.
 * Ohne erfasste Rechnung bleibt es deaktiviert – außer bei „Kundenrechnung erstellt“,
 * denn dort legt das Häkchen eine Rechnung ohne Nummer an, die später ergänzt wird.
 */
export function StatusHaken({
  laufzeitId,
  hostId,
  feld,
  wert,
  deaktiviert = false,
  titel,
}: {
  laufzeitId: string;
  hostId: string;
  feld: "einkaufBezahlt" | "verkaufErstellt" | "verkaufBezahlt";
  wert: boolean;
  deaktiviert?: boolean;
  titel: string;
}) {
  const [laeuft, starte] = useTransition();

  function umschalten(neu: boolean) {
    const daten = new FormData();
    daten.set("laufzeitId", laufzeitId);
    daten.set("hostId", hostId);
    daten.set("feld", feld);
    daten.set("wert", String(neu));
    starte(async () => {
      await statusUmschalten(daten);
    });
  }

  return (
    <span className="pl-haken d-inline-flex align-items-center justify-content-center">
      {laeuft ? (
        <span
          className="spinner-border spinner-border-sm text-body-secondary"
          role="status"
          aria-hidden="true"
        />
      ) : (
        <input
          type="checkbox"
          className="form-check-input"
          checked={wert}
          disabled={deaktiviert}
          onChange={(e) => umschalten(e.target.checked)}
          aria-label={titel}
          title={deaktiviert ? "Erst eine Rechnung erfassen" : titel}
        />
      )}
    </span>
  );
}
