"use client";

import { useActionState, useState } from "react";
import { Card } from "@/components/ui/Card";
import type { Rolle } from "@/generated/prisma/enums";
import { formatDatumZeit } from "@/lib/format";
import { PASSWORT_MINDESTLAENGE } from "@/lib/passwort";
import {
  type AktionsErgebnis,
  benutzerAnlegen,
  benutzerLoeschen,
  benutzerSpeichern,
  benutzerSperreUmschalten,
} from "@/server/actions/benutzer";
import { ROLLEN_BESCHREIBUNG, ROLLEN_TEXT } from "@/server/auth/rollen";

export interface BenutzerZeile {
  id: string;
  email: string;
  name: string;
  rolle: Rolle;
  kundeId: string | null;
  kundeName: string | null;
  aktiv: boolean;
  hatPasswort: boolean;
  hatOidc: boolean;
  passkeys: number;
  letzterLoginAm: Date | null;
}

const LEER: AktionsErgebnis = {};
const ROLLEN: Rolle[] = ["ADMIN", "TECHNIKER", "KUNDE"];

function RollenFelder({
  eintrag,
  kunden,
  fehler,
}: {
  eintrag?: BenutzerZeile;
  kunden: { id: string; name: string }[];
  fehler: Record<string, string>;
}) {
  const [rolle, setRolle] = useState<Rolle>(eintrag?.rolle ?? "TECHNIKER");

  return (
    <>
      <div className="col-12 col-md-3">
        <label className="form-label" htmlFor={`rolle-${eintrag?.id ?? "neu"}`}>
          Rolle
        </label>
        <select
          className="form-select"
          id={`rolle-${eintrag?.id ?? "neu"}`}
          name="rolle"
          defaultValue={rolle}
          onChange={(e) => setRolle(e.target.value as Rolle)}
        >
          {ROLLEN.map((wert) => (
            <option key={wert} value={wert}>
              {ROLLEN_TEXT[wert]}
            </option>
          ))}
        </select>
        <div className="form-text">{ROLLEN_BESCHREIBUNG[rolle]}</div>
      </div>

      {/* Der Kunde zählt nur für ein Kundenkonto – deshalb erscheint das Feld auch nur dann. */}
      {rolle === "KUNDE" ? (
        <div className="col-12 col-md-3">
          <label className="form-label" htmlFor={`kunde-${eintrag?.id ?? "neu"}`}>
            Kunde
          </label>
          <select
            className="form-select"
            id={`kunde-${eintrag?.id ?? "neu"}`}
            name="kundeId"
            defaultValue={eintrag?.kundeId ?? ""}
          >
            <option value="">– bitte wählen –</option>
            {kunden.map((kunde) => (
              <option key={kunde.id} value={kunde.id}>
                {kunde.name}
              </option>
            ))}
          </select>
          {fehler.kundeId ? <div className="invalid-feedback d-block">{fehler.kundeId}</div> : null}
        </div>
      ) : null}
    </>
  );
}

function NeuFormular({ kunden }: { kunden: { id: string; name: string }[] }) {
  const [ergebnis, aktion, laeuft] = useActionState(benutzerAnlegen, LEER);
  const fehler = ergebnis.felder ?? {};

  return (
    <Card titel="Benutzer anlegen" rahmen="primary">
      <form action={aktion} className="row g-3 align-items-start">
        {ergebnis.fehler ? <div className="alert alert-danger">{ergebnis.fehler}</div> : null}
        {ergebnis.erfolg ? <div className="alert alert-success">{ergebnis.erfolg}</div> : null}

        <div className="col-12 col-md-3">
          <label className="form-label" htmlFor="neu-name">
            Name
          </label>
          <input className="form-control" id="neu-name" name="name" required />
          {fehler.name ? <div className="invalid-feedback d-block">{fehler.name}</div> : null}
        </div>

        <div className="col-12 col-md-3">
          <label className="form-label" htmlFor="neu-email">
            E-Mail
          </label>
          <input type="email" className="form-control" id="neu-email" name="email" required />
          {fehler.email ? <div className="invalid-feedback d-block">{fehler.email}</div> : null}
        </div>

        <RollenFelder kunden={kunden} fehler={fehler} />

        <div className="col-12 col-md-3">
          <label className="form-label" htmlFor="neu-passwort">
            Passwort
          </label>
          <input
            type="password"
            className="form-control"
            id="neu-passwort"
            name="passwort"
            minLength={PASSWORT_MINDESTLAENGE}
            autoComplete="new-password"
          />
          <div className="form-text">
            Leer lassen, wenn sich das Konto nur über OIDC oder einen Passkey anmelden soll.
          </div>
          {fehler.passwort ? <div className="invalid-feedback d-block">{fehler.passwort}</div> : null}
        </div>

        <div className="col-12">
          <button type="submit" className="btn btn-primary" disabled={laeuft}>
            {laeuft ? "Wird angelegt …" : "Benutzer anlegen"}
          </button>
        </div>
      </form>
    </Card>
  );
}

function Zeile({
  eintrag,
  kunden,
  ichSelbst,
}: {
  eintrag: BenutzerZeile;
  kunden: { id: string; name: string }[];
  ichSelbst: boolean;
}) {
  const [ergebnis, aktion, laeuft] = useActionState(benutzerSpeichern, LEER);
  const [offen, setOffen] = useState(false);
  const fehler = ergebnis.felder ?? {};

  const anmeldewege = [
    eintrag.hatPasswort ? "Passwort" : null,
    eintrag.hatOidc ? "OIDC" : null,
    eintrag.passkeys > 0 ? `${eintrag.passkeys} Passkey${eintrag.passkeys === 1 ? "" : "s"}` : null,
  ].filter(Boolean);

  return (
    <>
      <tr>
        <td>
          <button type="button" className="btn btn-link p-0 text-start" onClick={() => setOffen(!offen)}>
            <span className="fw-semibold">{eintrag.name}</span>
          </button>
          {ichSelbst ? <span className="badge text-bg-secondary ms-2">Sie</span> : null}
          <div className="small text-body-secondary">{eintrag.email}</div>
        </td>
        <td>
          {ROLLEN_TEXT[eintrag.rolle]}
          {eintrag.kundeName ? <div className="small text-body-secondary">{eintrag.kundeName}</div> : null}
        </td>
        <td className="small">
          {anmeldewege.length > 0 ? anmeldewege.join(" · ") : <span className="text-danger">kein Zugang</span>}
        </td>
        <td className="small">
          {eintrag.letzterLoginAm ? formatDatumZeit(eintrag.letzterLoginAm) : "noch nie"}
        </td>
        <td>
          {eintrag.aktiv ? (
            <span className="badge text-bg-success">aktiv</span>
          ) : (
            <span className="badge text-bg-danger">gesperrt</span>
          )}
        </td>
        <td className="text-end">
          <div className="d-flex gap-2 justify-content-end">
            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setOffen(!offen)}>
              {offen ? "Schließen" : "Bearbeiten"}
            </button>
            {!ichSelbst ? (
              <>
                <form action={benutzerSperreUmschalten}>
                  <input type="hidden" name="id" value={eintrag.id} />
                  <button type="submit" className="btn btn-sm btn-outline-warning">
                    {eintrag.aktiv ? "Sperren" : "Freigeben"}
                  </button>
                </form>
                <form action={benutzerLoeschen}>
                  <input type="hidden" name="id" value={eintrag.id} />
                  <button type="submit" className="btn btn-sm btn-outline-danger">
                    Löschen
                  </button>
                </form>
              </>
            ) : null}
          </div>
        </td>
      </tr>

      {offen ? (
        <tr>
          <td colSpan={6} className="bg-body-tertiary">
            <form action={aktion} className="row g-3 align-items-start">
              <input type="hidden" name="id" value={eintrag.id} />
              {ergebnis.fehler ? <div className="alert alert-danger">{ergebnis.fehler}</div> : null}
              {ergebnis.erfolg ? <div className="alert alert-success">{ergebnis.erfolg}</div> : null}

              <div className="col-12 col-md-3">
                <label className="form-label" htmlFor={`name-${eintrag.id}`}>
                  Name
                </label>
                <input className="form-control" id={`name-${eintrag.id}`} name="name" defaultValue={eintrag.name} />
              </div>

              <div className="col-12 col-md-3">
                <label className="form-label" htmlFor={`email-${eintrag.id}`}>
                  E-Mail
                </label>
                <input
                  type="email"
                  className="form-control"
                  id={`email-${eintrag.id}`}
                  name="email"
                  defaultValue={eintrag.email}
                />
              </div>

              <RollenFelder eintrag={eintrag} kunden={kunden} fehler={fehler} />

              <div className="col-12 col-md-3">
                <label className="form-label" htmlFor={`passwort-${eintrag.id}`}>
                  Neues Passwort
                </label>
                <input
                  type="password"
                  className="form-control"
                  id={`passwort-${eintrag.id}`}
                  name="passwort"
                  minLength={PASSWORT_MINDESTLAENGE}
                  autoComplete="new-password"
                />
                <div className="form-text">Leer lassen heißt: unverändert. Ein neues beendet alle Sitzungen.</div>
              </div>

              <div className="col-12">
                <button type="submit" className="btn btn-primary" disabled={laeuft}>
                  {laeuft ? "Wird gespeichert …" : "Speichern"}
                </button>
              </div>
            </form>
          </td>
        </tr>
      ) : null}
    </>
  );
}

export function BenutzerVerwaltung({
  benutzer,
  kunden,
  ichId,
}: {
  benutzer: BenutzerZeile[];
  kunden: { id: string; name: string }[];
  ichId: string;
}) {
  return (
    <>
      <NeuFormular kunden={kunden} />

      <Card titel={`Benutzer (${benutzer.length})`} rahmen="keiner">
        <div className="table-responsive">
          <table className="table align-middle">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Rolle</th>
                <th scope="col">Anmeldung</th>
                <th scope="col">Zuletzt angemeldet</th>
                <th scope="col">Zustand</th>
                <th scope="col" className="text-end">
                  Aktionen
                </th>
              </tr>
            </thead>
            <tbody>
              {benutzer.map((eintrag) => (
                <Zeile key={eintrag.id} eintrag={eintrag} kunden={kunden} ichSelbst={eintrag.id === ichId} />
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
