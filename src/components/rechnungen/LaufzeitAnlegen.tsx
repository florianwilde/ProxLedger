"use client";

import { useActionState, useState } from "react";
import type { AktionsErgebnis } from "@/server/actions/kunden";
import { laufzeitAnlegenAktion } from "@/server/actions/rechnungen";

const LEER: AktionsErgebnis = {};

/** Ein Jahr minus einen Tag – dieselbe Rechnung wie beim Vorschlag aus dem Agenten-Report. */
function endeAus(start: string): string {
  if (!start) return "";
  const datum = new Date(`${start}T00:00:00Z`);
  datum.setUTCFullYear(datum.getUTCFullYear() + 1);
  datum.setUTCDate(datum.getUTCDate() - 1);
  return datum.toISOString().slice(0, 10);
}

/**
 * Laufzeit von Hand anlegen (#043).
 *
 * Der Normalfall ist der Vorschlag aus dem Agenten-Report. Von Hand braucht man es, wenn ein Host
 * (noch) kein Ablaufdatum meldet – etwa weil der Key erst bestellt ist – oder wenn ein
 * zurückliegendes Lizenzjahr nachgetragen werden soll.
 */
export function LaufzeitAnlegen({
  hosts,
}: {
  hosts: { id: string; hostname: string; kundeName: string | null; subKey: string | null }[];
}) {
  const [ergebnis, aktion, laeuft] = useActionState(laufzeitAnlegenAktion, LEER);
  const [hostId, setHostId] = useState("");
  const [key, setKey] = useState("");
  const [start, setStart] = useState("");
  const [ende, setEnde] = useState("");

  const gewaehlt = hosts.find((host) => host.id === hostId);

  return (
    <form action={aktion} className="row g-3 align-items-start">
      {ergebnis.fehler ? <div className="alert alert-danger py-2">{ergebnis.fehler}</div> : null}
      {ergebnis.erfolg ? <div className="alert alert-success py-2">{ergebnis.erfolg}</div> : null}

      <div className="col-12 col-md-4">
        <label className="form-label" htmlFor="lz-host">
          Host
        </label>
        <select
          className="form-select"
          id="lz-host"
          name="hostId"
          value={hostId}
          onChange={(e) => {
            setHostId(e.target.value);
            // Den gemeldeten Key vorschlagen – abtippen ist hier die häufigste Fehlerquelle.
            const host = hosts.find((h) => h.id === e.target.value);
            if (host?.subKey) setKey(host.subKey);
          }}
          required
        >
          <option value="">– bitte wählen –</option>
          {hosts.map((host) => (
            <option key={host.id} value={host.id}>
              {host.hostname}
              {host.kundeName ? ` · ${host.kundeName}` : " · nicht zugeordnet"}
            </option>
          ))}
        </select>
      </div>

      <div className="col-12 col-md-3">
        <label className="form-label" htmlFor="lz-key">
          Subscription-Key
        </label>
        <input
          className="form-control pl-mono"
          id="lz-key"
          name="key"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="pve2s-…"
          required
        />
        {gewaehlt?.subKey ? (
          <div className="form-text">Gemeldet: {gewaehlt.subKey}</div>
        ) : (
          <div className="form-text">Dieser Host meldet keinen Key – Nummer aus der Bestellung eintragen.</div>
        )}
      </div>

      <div className="col-6 col-md-2">
        <label className="form-label" htmlFor="lz-start">
          Beginn
        </label>
        <input
          type="date"
          className="form-control"
          id="lz-start"
          name="start"
          value={start}
          onChange={(e) => {
            setStart(e.target.value);
            setEnde(endeAus(e.target.value));
          }}
          required
        />
      </div>

      <div className="col-6 col-md-2">
        <label className="form-label" htmlFor="lz-ende">
          Ende
        </label>
        <input
          type="date"
          className="form-control"
          id="lz-ende"
          name="ende"
          value={ende}
          onChange={(e) => setEnde(e.target.value)}
          required
        />
        <div className="form-text">Ein Jahr, vorbelegt.</div>
      </div>

      <div className="col-12">
        <button type="submit" className="btn btn-outline-primary" disabled={laeuft}>
          {laeuft ? "Wird angelegt …" : "Laufzeit anlegen"}
        </button>
      </div>
    </form>
  );
}
