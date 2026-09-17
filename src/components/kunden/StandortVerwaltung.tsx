"use client";

import { useActionState } from "react";
import { standortLoeschen, standortSpeichern, type AktionsErgebnis } from "@/server/actions/kunden";

export interface StandortAnzeige {
  id: string;
  name: string;
  strasse: string | null;
  plz: string | null;
  ort: string | null;
  hosts: number;
}

const LEER: AktionsErgebnis = {};

export function StandortVerwaltung({
  kundeId,
  standorte,
}: {
  kundeId: string;
  standorte: StandortAnzeige[];
}) {
  const [ergebnis, aktion, laeuft] = useActionState(standortSpeichern, LEER);

  return (
    <>
      {standorte.length > 0 ? (
        <ul className="list-group list-group-flush mb-3">
          {standorte.map((standort) => (
            <li
              key={standort.id}
              className="list-group-item d-flex justify-content-between align-items-center px-0"
            >
              <span>
                <span className="fw-semibold">{standort.name}</span>
                <span className="d-block small text-body-secondary">
                  {[standort.strasse, [standort.plz, standort.ort].filter(Boolean).join(" ")]
                    .filter(Boolean)
                    .join(" · ") || "Keine Adresse hinterlegt"}
                  {standort.hosts > 0 ? ` · ${standort.hosts} Host(s)` : ""}
                </span>
              </span>
              <form action={standortLoeschen}>
                <input type="hidden" name="id" value={standort.id} />
                <input type="hidden" name="kundeId" value={kundeId} />
                <button
                  type="submit"
                  className="btn btn-sm btn-outline-danger"
                  title="Standort löschen"
                  aria-label={`Standort ${standort.name} löschen`}
                >
                  <i className="bi bi-trash" aria-hidden="true" />
                </button>
              </form>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-body-secondary">Noch kein Standort hinterlegt.</p>
      )}

      {ergebnis.fehler ? <div className="alert alert-danger py-2">{ergebnis.fehler}</div> : null}
      {ergebnis.erfolg ? <div className="alert alert-success py-2">{ergebnis.erfolg}</div> : null}

      <form action={aktion} className="row g-2">
        <input type="hidden" name="kundeId" value={kundeId} />
        <div className="col-12">
          <label className="form-label small" htmlFor="standort-name">
            Neuer Standort
          </label>
          <input
            id="standort-name"
            name="name"
            className="form-control form-control-sm"
            placeholder="z. B. Zentrale Landshut"
            required
          />
        </div>
        <div className="col-6">
          <input name="plz" className="form-control form-control-sm" placeholder="PLZ" />
        </div>
        <div className="col-6">
          <input name="ort" className="form-control form-control-sm" placeholder="Ort" />
        </div>
        <div className="col-12">
          <button type="submit" className="btn btn-sm btn-outline-primary" disabled={laeuft}>
            {laeuft ? "Speichert …" : "Standort hinzufügen"}
          </button>
        </div>
      </form>
    </>
  );
}
