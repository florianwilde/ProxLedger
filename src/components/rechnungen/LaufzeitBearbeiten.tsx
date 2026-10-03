"use client";

import { useActionState, useState } from "react";
import type { AktionsErgebnis } from "@/server/actions/kunden";
import {
  laufzeitBearbeitenAktion,
  laufzeitenZusammenfuehrenAktion,
} from "@/server/actions/rechnungen";

const LEER: AktionsErgebnis = {};

export interface NachbarLaufzeit {
  id: string;
  zeitraum: string;
  key: string;
  hatEinkauf: boolean;
  hatVerkauf: boolean;
}

/**
 * Laufzeit nachträglich ändern und mit einer anderen desselben Hosts zusammenführen (#043).
 *
 * Nötig, weil Laufzeiten meist aus einem Agenten-Report entstehen: Weicht das gemeldete
 * Ablaufdatum von der Bestellung ab, steht die Laufzeit falsch da – oder gleich doppelt.
 */
export function LaufzeitBearbeiten({
  laufzeitId,
  hostId,
  // Nicht `key` nennen: Das ist in React reserviert und käme hier nie an.
  schluessel,
  start,
  ende,
  notizen,
  nachbarn,
}: {
  laufzeitId: string;
  hostId: string;
  schluessel: string;
  start: string;
  ende: string;
  notizen: string | null;
  nachbarn: NachbarLaufzeit[];
}) {
  const [ergebnis, aktion, laeuft] = useActionState(laufzeitBearbeitenAktion, LEER);
  const [zusammen, zusammenAktion, fuehrtZusammen] = useActionState(laufzeitenZusammenfuehrenAktion, LEER);
  const [offen, setOffen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary"
        onClick={() => setOffen(!offen)}
        aria-expanded={offen}
      >
        <i className="bi bi-pencil me-1" aria-hidden="true" />
        {offen ? "Bearbeiten schließen" : "Laufzeit bearbeiten"}
      </button>

      {offen ? (
        <div className="mt-3">
          {ergebnis.fehler ? <div className="alert alert-danger py-2">{ergebnis.fehler}</div> : null}
          {ergebnis.erfolg ? <div className="alert alert-success py-2">{ergebnis.erfolg}</div> : null}

          <form action={aktion} className="row g-3 align-items-start">
            <input type="hidden" name="laufzeitId" value={laufzeitId} />
            <input type="hidden" name="hostId" value={hostId} />

            <div className="col-12 col-md-4">
              <label className="form-label" htmlFor="lzb-key">
                Subscription-Key
              </label>
              <input
                className="form-control pl-mono"
                id="lzb-key"
                name="key"
                defaultValue={schluessel}
                required
              />
            </div>

            <div className="col-6 col-md-3">
              <label className="form-label" htmlFor="lzb-start">
                Beginn
              </label>
              <input type="date" className="form-control" id="lzb-start" name="start" defaultValue={start} required />
            </div>

            <div className="col-6 col-md-3">
              <label className="form-label" htmlFor="lzb-ende">
                Ende
              </label>
              <input type="date" className="form-control" id="lzb-ende" name="ende" defaultValue={ende} required />
            </div>

            <div className="col-12">
              <label className="form-label" htmlFor="lzb-notizen">
                Notiz
              </label>
              <textarea
                className="form-control"
                id="lzb-notizen"
                name="notizen"
                rows={2}
                defaultValue={notizen ?? ""}
              />
            </div>

            <div className="col-12">
              <button type="submit" className="btn btn-primary" disabled={laeuft}>
                {laeuft ? "Wird gespeichert …" : "Änderung speichern"}
              </button>
            </div>
          </form>

          {nachbarn.length > 0 ? (
            <div className="mt-4 pt-3 border-top">
              <h4 className="h6">Mit einer anderen Laufzeit zusammenführen</h4>
              <p className="small text-body-secondary">
                Die gewählte Laufzeit wird aufgelöst; ihre Rechnungen wandern hierher, sofern hier noch
                keine stehen. Nützlich, wenn der Agent neben einer erfassten Laufzeit einen Vorschlag
                mit abweichendem Datum angelegt hat.
              </p>

              {zusammen.fehler ? <div className="alert alert-danger py-2">{zusammen.fehler}</div> : null}
              {zusammen.erfolg ? <div className="alert alert-success py-2">{zusammen.erfolg}</div> : null}

              <form action={zusammenAktion} className="row g-2 align-items-end">
                <input type="hidden" name="zielId" value={laufzeitId} />
                <input type="hidden" name="hostId" value={hostId} />

                <div className="col-12 col-md-8">
                  <label className="form-label" htmlFor="lzb-quelle">
                    Diese Laufzeit auflösen
                  </label>
                  <select className="form-select" id="lzb-quelle" name="quelleId" required>
                    <option value="">– bitte wählen –</option>
                    {nachbarn.map((nachbar) => (
                      <option key={nachbar.id} value={nachbar.id}>
                        {nachbar.zeitraum} · {nachbar.key}
                        {nachbar.hatEinkauf ? " · mit Einkauf" : ""}
                        {nachbar.hatVerkauf ? " · mit Verkauf" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-12 col-md-4">
                  <button type="submit" className="btn btn-outline-danger" disabled={fuehrtZusammen}>
                    {fuehrtZusammen ? "Wird zusammengeführt …" : "Zusammenführen"}
                  </button>
                </div>
              </form>
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
