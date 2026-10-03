"use client";

import { useState } from "react";
import { hostKundeSetzen } from "@/server/actions/host-detail";

export interface KundeMitStandorten {
  id: string;
  name: string;
  standorte: { id: string; name: string }[];
}

/**
 * Kunde und Standort eines Hosts ändern (#036).
 *
 * Beides gehört in **ein** Formular: Die Standorte hängen am Kunden, und ein Formular, das nur den
 * Kunden sendet, würde den Standort beim Speichern mitlöschen – genau das passierte vorher.
 */
export function KundeStandortFormular({
  hostId,
  kunden,
  kundeId,
  standortId,
}: {
  hostId: string;
  kunden: KundeMitStandorten[];
  kundeId: string | null;
  standortId: string | null;
}) {
  const [gewaehlterKunde, setGewaehlterKunde] = useState(kundeId ?? "");
  const standorte = kunden.find((kunde) => kunde.id === gewaehlterKunde)?.standorte ?? [];

  return (
    <form action={hostKundeSetzen} className="mt-3">
      <input type="hidden" name="hostId" value={hostId} />

      <label className="form-label small" htmlFor="kundeId">
        Kunde ändern
      </label>
      <select
        id="kundeId"
        name="kundeId"
        className="form-select form-select-sm mb-2"
        value={gewaehlterKunde}
        onChange={(e) => setGewaehlterKunde(e.target.value)}
      >
        <option value="">– nicht zugeordnet –</option>
        {kunden.map((kunde) => (
          <option key={kunde.id} value={kunde.id}>
            {kunde.name}
          </option>
        ))}
      </select>

      <label className="form-label small" htmlFor="standortId">
        Standort
      </label>
      <div className="input-group input-group-sm">
        <select
          id="standortId"
          name="standortId"
          className="form-select"
          defaultValue={standortId ?? ""}
          disabled={standorte.length === 0}
          // `key` erzwingt ein frisches Feld, wenn der Kunde wechselt – sonst bliebe die alte Auswahl stehen.
          key={gewaehlterKunde}
        >
          <option value="">– keiner –</option>
          {standorte.map((standort) => (
            <option key={standort.id} value={standort.id}>
              {standort.name}
            </option>
          ))}
        </select>
        <button type="submit" className="btn btn-outline-primary">
          Setzen
        </button>
      </div>

      {gewaehlterKunde && standorte.length === 0 ? (
        <div className="form-text">
          Für diesen Kunden gibt es noch keinen Standort. Anlegen lässt er sich auf der Kundenseite.
        </div>
      ) : null}
    </form>
  );
}
