"use client";

import { useActionState } from "react";
import { warnregelnSpeichern } from "@/server/actions/alerts";
import type { AktionsErgebnis } from "@/server/actions/kunden";

export interface RegelAnzeige {
  name: string;
  beschreibung: string;
  aktiv: boolean;
  /** Schwellwerte als Text, mehrere Stufen mit Komma getrennt. */
  schwellwerte: { name: string; beschriftung: string; wert: string }[];
}

const LEER: AktionsErgebnis = {};

export function WarnregelFormular({ regeln }: { regeln: RegelAnzeige[] }) {
  const [ergebnis, aktion, laeuft] = useActionState(warnregelnSpeichern, LEER);

  return (
    <form action={aktion}>
      {ergebnis.fehler ? <div className="alert alert-danger">{ergebnis.fehler}</div> : null}
      {ergebnis.erfolg ? <div className="alert alert-success">{ergebnis.erfolg}</div> : null}

      <div className="table-responsive">
        <table className="table align-middle">
          <thead>
            <tr>
              <th scope="col" style={{ width: "6rem" }}>
                Aktiv
              </th>
              <th scope="col">Regel</th>
              <th scope="col" style={{ width: "22rem" }}>
                Schwellwerte
              </th>
            </tr>
          </thead>
          <tbody>
            {regeln.map((regel) => (
              <tr key={regel.name}>
                <td>
                  <input
                    type="checkbox"
                    className="form-check-input pl-touch-target"
                    name={`aktiv:${regel.name}`}
                    defaultChecked={regel.aktiv}
                    aria-label={`${regel.beschreibung} aktiv`}
                  />
                </td>
                <td>
                  <span className="fw-semibold">{regel.beschreibung}</span>
                  <div className="small text-body-secondary pl-mono">{regel.name}</div>
                </td>
                <td>
                  {regel.schwellwerte.length === 0 ? (
                    <span className="small text-body-secondary">keine</span>
                  ) : (
                    regel.schwellwerte.map((schwelle) => (
                      <div className="mb-2" key={schwelle.name}>
                        <label className="form-label small mb-1" htmlFor={`${regel.name}-${schwelle.name}`}>
                          {schwelle.beschriftung}
                        </label>
                        <input
                          id={`${regel.name}-${schwelle.name}`}
                          name={`schwelle:${regel.name}:${schwelle.name}`}
                          className="form-control form-control-sm"
                          defaultValue={schwelle.wert}
                        />
                      </div>
                    ))
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button type="submit" className="btn btn-primary pl-touch-target" disabled={laeuft}>
        {laeuft ? "Speichert …" : "Speichern und neu auswerten"}
      </button>
    </form>
  );
}
