"use client";

import { useActionState } from "react";
import { hostNotizenSpeichern } from "@/server/actions/host-detail";
import type { AktionsErgebnis } from "@/server/actions/kunden";

const LEER: AktionsErgebnis = {};

export function HostNotizen({
  hostId,
  notizen,
  tags,
}: {
  hostId: string;
  notizen: string | null;
  tags: string[];
}) {
  const [ergebnis, aktion, laeuft] = useActionState(hostNotizenSpeichern, LEER);

  return (
    <form action={aktion}>
      <input type="hidden" name="hostId" value={hostId} />

      {ergebnis.erfolg ? <div className="alert alert-success py-2">{ergebnis.erfolg}</div> : null}
      {ergebnis.fehler ? <div className="alert alert-danger py-2">{ergebnis.fehler}</div> : null}

      <div className="mb-3">
        <label className="form-label" htmlFor="notizen">
          Notizen
        </label>
        <textarea
          id="notizen"
          name="notizen"
          rows={5}
          className="form-control"
          defaultValue={notizen ?? ""}
          placeholder="z. B. Verlängerung mit Kundin besprochen"
        />
      </div>

      <div className="mb-3">
        <label className="form-label" htmlFor="tags">
          Tags
        </label>
        <input
          id="tags"
          name="tags"
          className="form-control"
          defaultValue={tags.join(", ")}
          placeholder="produktiv, cluster, backup"
        />
        <div className="form-text">Mehrere Tags mit Komma trennen.</div>
      </div>

      <button type="submit" className="btn btn-primary pl-touch-target" disabled={laeuft}>
        {laeuft ? "Speichert …" : "Speichern"}
      </button>
    </form>
  );
}
