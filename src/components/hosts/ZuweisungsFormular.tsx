"use client";

import { useActionState, useState } from "react";
import { CopyableCode } from "@/components/ui/CopyableCode";
import { formatDatumZeit } from "@/lib/format";
import { PRODUKT_TEXT } from "@/lib/anzeige";
import { hostsZuweisen } from "@/server/actions/hosts";
import type { AktionsErgebnis } from "@/server/actions/kunden";

export interface ZuweisbarerHost {
  id: string;
  hostname: string;
  produkt: string;
  serverId: string | null;
  subKey: string | null;
  erstmalsGesehenAm: string;
}

export interface KundeMitStandorten {
  id: string;
  name: string;
  standorte: { id: string; name: string }[];
}

const LEER: AktionsErgebnis = {};

/** Liste der nicht zugeordneten Hosts mit Mehrfachauswahl und gemeinsamer Zuweisung. */
export function ZuweisungsFormular({
  hosts,
  kunden,
}: {
  hosts: ZuweisbarerHost[];
  kunden: KundeMitStandorten[];
}) {
  const [ergebnis, aktion, laeuft] = useActionState(hostsZuweisen, LEER);
  const [ausgewaehlt, setAusgewaehlt] = useState<string[]>(hosts.map((host) => host.id));
  const [kundeId, setKundeId] = useState(kunden[0]?.id ?? "");

  const standorte = kunden.find((kunde) => kunde.id === kundeId)?.standorte ?? [];
  const alleAusgewaehlt = ausgewaehlt.length === hosts.length && hosts.length > 0;

  function umschalten(id: string) {
    setAusgewaehlt((alt) => (alt.includes(id) ? alt.filter((x) => x !== id) : [...alt, id]));
  }

  return (
    <form action={aktion}>
      {ergebnis.fehler ? <div className="alert alert-danger">{ergebnis.fehler}</div> : null}
      {ergebnis.erfolg ? <div className="alert alert-success">{ergebnis.erfolg}</div> : null}

      <div className="table-responsive">
        <table className="table table-striped align-middle">
          <thead>
            <tr>
              <th scope="col">
                <input
                  type="checkbox"
                  className="form-check-input"
                  aria-label="Alle auswählen"
                  checked={alleAusgewaehlt}
                  onChange={() => setAusgewaehlt(alleAusgewaehlt ? [] : hosts.map((host) => host.id))}
                />
              </th>
              <th scope="col">Host</th>
              <th scope="col">Produkt</th>
              <th scope="col">Server-ID</th>
              <th scope="col">Key</th>
              <th scope="col">Erstmals gesehen</th>
            </tr>
          </thead>
          <tbody>
            {hosts.map((host) => (
              <tr key={host.id}>
                <td>
                  <input
                    type="checkbox"
                    className="form-check-input pl-touch-target"
                    name="hostId"
                    value={host.id}
                    checked={ausgewaehlt.includes(host.id)}
                    onChange={() => umschalten(host.id)}
                    aria-label={`${host.hostname} auswählen`}
                  />
                </td>
                <td className="fw-semibold">{host.hostname}</td>
                <td>{PRODUKT_TEXT[host.produkt] ?? host.produkt}</td>
                <td>
                  <CopyableCode wert={host.serverId} />
                </td>
                <td>
                  <CopyableCode wert={host.subKey} />
                </td>
                <td>{formatDatumZeit(host.erstmalsGesehenAm)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="row g-2 align-items-end p-3 border-top">
        <div className="col-md-5">
          <label className="form-label" htmlFor="kundeId">
            Kunde
          </label>
          <select
            id="kundeId"
            name="kundeId"
            className="form-select"
            value={kundeId}
            onChange={(e) => setKundeId(e.target.value)}
            required
          >
            {kunden.length === 0 ? <option value="">Bitte zuerst einen Kunden anlegen</option> : null}
            {kunden.map((kunde) => (
              <option key={kunde.id} value={kunde.id}>
                {kunde.name}
              </option>
            ))}
          </select>
        </div>
        <div className="col-md-5">
          <label className="form-label" htmlFor="standortId">
            Standort (optional)
          </label>
          <select id="standortId" name="standortId" className="form-select">
            <option value="">– kein Standort –</option>
            {standorte.map((standort) => (
              <option key={standort.id} value={standort.id}>
                {standort.name}
              </option>
            ))}
          </select>
        </div>
        <div className="col-md-2">
          <button
            type="submit"
            className="btn btn-primary w-100 pl-touch-target"
            disabled={laeuft || ausgewaehlt.length === 0 || kunden.length === 0}
          >
            {laeuft ? "Weist zu …" : `${ausgewaehlt.length} zuweisen`}
          </button>
        </div>
      </div>
    </form>
  );
}
