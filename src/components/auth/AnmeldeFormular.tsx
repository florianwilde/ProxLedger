"use client";

import { useActionState } from "react";
import { anmelden } from "@/server/actions/auth";
import type { AktionsErgebnis } from "@/server/actions/kunden";

const LEER: AktionsErgebnis = {};

export function AnmeldeFormular({ ziel }: { ziel: string }) {
  const [ergebnis, aktion, laeuft] = useActionState(anmelden, LEER);

  return (
    <form action={aktion}>
      <input type="hidden" name="ziel" value={ziel} />

      {ergebnis.fehler ? (
        <div className="alert alert-danger py-2" role="alert">
          {ergebnis.fehler}
        </div>
      ) : null}

      <div className="mb-3">
        <label className="form-label" htmlFor="email">
          E-Mail-Adresse
        </label>
        <input
          id="email"
          name="email"
          type="email"
          className="form-control"
          autoComplete="username"
          required
        />
      </div>

      <div className="mb-3">
        <label className="form-label" htmlFor="passwort">
          Passwort
        </label>
        <input
          id="passwort"
          name="passwort"
          type="password"
          className="form-control"
          autoComplete="current-password"
          required
        />
      </div>

      <button type="submit" className="btn btn-primary w-100 pl-touch-target" disabled={laeuft}>
        {laeuft ? "Meldet an …" : "Anmelden"}
      </button>
    </form>
  );
}
