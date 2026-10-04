"use client";

import Link from "next/link";
import { useActionState } from "react";
import { kundeSpeichern, type AktionsErgebnis } from "@/server/actions/kunden";

export interface KundeFormularWerte {
  id?: string;
  name: string;
  kundennummer: string;
  ansprechpartner: string | null;
  email: string | null;
  telefon: string | null;
  eigenbedarf: boolean;
  notizen: string | null;
}

const LEER: AktionsErgebnis = {};

export function KundeFormular({ werte }: { werte?: KundeFormularWerte }) {
  const [ergebnis, aktion, laeuft] = useActionState(kundeSpeichern, LEER);

  function feldKlasse(feld: string) {
    return `form-control ${ergebnis.felder?.[feld] ? "is-invalid" : ""}`;
  }

  return (
    <form action={aktion}>
      {werte?.id ? <input type="hidden" name="id" value={werte.id} /> : null}

      {ergebnis.fehler ? (
        <div className="alert alert-danger" role="alert">
          {ergebnis.fehler}
        </div>
      ) : null}

      <div className="row g-3">
        <div className="col-md-6">
          <label className="form-label" htmlFor="name">
            Name *
          </label>
          <input
            id="name"
            name="name"
            className={feldKlasse("name")}
            defaultValue={werte?.name ?? ""}
            required
          />
          {ergebnis.felder?.name ? <div className="invalid-feedback">{ergebnis.felder.name}</div> : null}
        </div>

        <div className="col-md-6">
          <label className="form-label" htmlFor="kundennummer">
            Kundennummer *
          </label>
          <input
            id="kundennummer"
            name="kundennummer"
            className={`${feldKlasse("kundennummer")} pl-mono`}
            defaultValue={werte?.kundennummer ?? ""}
            placeholder="K-1001"
            required
          />
          {ergebnis.felder?.kundennummer ? (
            <div className="invalid-feedback">{ergebnis.felder.kundennummer}</div>
          ) : null}
        </div>

        <div className="col-md-6">
          <label className="form-label" htmlFor="ansprechpartner">
            Ansprechpartner
          </label>
          <input
            id="ansprechpartner"
            name="ansprechpartner"
            className="form-control"
            defaultValue={werte?.ansprechpartner ?? ""}
          />
        </div>

        <div className="col-md-6">
          <label className="form-label" htmlFor="email">
            E-Mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            className={feldKlasse("email")}
            defaultValue={werte?.email ?? ""}
          />
          {ergebnis.felder?.email ? <div className="invalid-feedback">{ergebnis.felder.email}</div> : null}
        </div>

        <div className="col-md-6">
          <label className="form-label" htmlFor="telefon">
            Telefon
          </label>
          <input id="telefon" name="telefon" className="form-control" defaultValue={werte?.telefon ?? ""} />
        </div>

        <div className="col-12">
          <div className="form-check">
            <input
              className="form-check-input pl-touch-target"
              type="checkbox"
              id="eigenbedarf"
              name="eigenbedarf"
              value="an"
              defaultChecked={werte?.eigenbedarf ?? false}
            />
            <label className="form-check-label" htmlFor="eigenbedarf">
              Eigenbedarf – diese Hosts werden nicht weiterberechnet
            </label>
            <div className="form-text">
              Für solche Kunden entfällt die Kundenrechnung: keine Warnungen darüber, keine Marge. Die
              Einkaufsrechnung von Proxmox wird weiterhin geführt.
            </div>
          </div>
        </div>

        <div className="col-12">
          <label className="form-label" htmlFor="notizen">
            Notizen
          </label>
          <textarea
            id="notizen"
            name="notizen"
            rows={3}
            className="form-control"
            defaultValue={werte?.notizen ?? ""}
          />
        </div>
      </div>

      <div className="d-flex gap-2 mt-4">
        <button type="submit" className="btn btn-primary pl-touch-target" disabled={laeuft}>
          {laeuft ? "Speichert …" : "Speichern"}
        </button>
        <Link href={werte?.id ? `/kunden/${werte.id}` : "/kunden"} className="btn btn-outline-secondary">
          Abbrechen
        </Link>
      </div>
    </form>
  );
}
