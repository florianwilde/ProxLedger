"use client";

import { useActionState } from "react";
import { CopyableCode } from "@/components/ui/CopyableCode";
import { enrollmentTokenErzeugen, type TokenErgebnis } from "@/server/actions/tokens";

const LEER: TokenErgebnis = {};

/** Erzeugt Enrollment-Tokens und zeigt den Klartext genau einmal an. */
export function TokenFormular({
  kunden,
  dashboardUrl,
}: {
  kunden: { id: string; name: string }[];
  dashboardUrl: string;
}) {
  const [ergebnis, aktion, laeuft] = useActionState(enrollmentTokenErzeugen, LEER);

  return (
    <>
      {ergebnis.fehler ? <div className="alert alert-danger">{ergebnis.fehler}</div> : null}

      {ergebnis.klartext ? (
        <div className="alert alert-success">
          <p className="fw-semibold mb-2">
            <i className="bi bi-check-circle me-1" aria-hidden="true" />
            Token erzeugt – er wird nur dieses eine Mal angezeigt.
          </p>
          <div className="mb-2">
            <CopyableCode wert={ergebnis.klartext} />
          </div>
          <p className="mb-1 small">Auf dem Proxmox-Host als root ausführen:</p>
          <pre className="bg-body p-2 rounded mb-0">
            <code className="pl-mono">
              curl -fsSL {dashboardUrl}/install.sh | bash -s -- --token {ergebnis.klartext}
            </code>
          </pre>
        </div>
      ) : null}

      <form action={aktion} className="row g-3">
        <div className="col-md-4">
          <label className="form-label" htmlFor="bezeichnung">
            Bezeichnung
          </label>
          <input
            id="bezeichnung"
            name="bezeichnung"
            className="form-control"
            placeholder="z. B. Rollout Brandl"
          />
        </div>
        <div className="col-md-4">
          <label className="form-label" htmlFor="token-kundeId">
            Hosts direkt zuordnen zu
          </label>
          <select id="token-kundeId" name="kundeId" className="form-select">
            <option value="">– keinem Kunden –</option>
            {kunden.map((kunde) => (
              <option key={kunde.id} value={kunde.id}>
                {kunde.name}
              </option>
            ))}
          </select>
        </div>
        <div className="col-md-2">
          <label className="form-label" htmlFor="gueltigTage">
            Gültig (Tage)
          </label>
          <input
            id="gueltigTage"
            name="gueltigTage"
            type="number"
            min={1}
            max={365}
            defaultValue={30}
            className="form-control"
          />
        </div>
        <div className="col-md-2">
          <label className="form-label" htmlFor="maxNutzungen">
            Max. Nutzungen
          </label>
          <input
            id="maxNutzungen"
            name="maxNutzungen"
            type="number"
            min={1}
            placeholder="unbegrenzt"
            className="form-control"
          />
        </div>
        <div className="col-12">
          <button type="submit" className="btn btn-primary pl-touch-target" disabled={laeuft}>
            {laeuft ? "Erzeugt …" : "Token erzeugen"}
          </button>
        </div>
      </form>
    </>
  );
}
