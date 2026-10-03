"use client";

import { useActionState, useState } from "react";
import { kundenrechnungSpeichern, proxmoxRechnungSpeichern } from "@/server/actions/rechnungen";
import type { AktionsErgebnis } from "@/server/actions/kunden";
import { formatEuro } from "@/lib/format";

const LEER: AktionsErgebnis = {};

function isoDatum(wert: string | null | undefined) {
  return wert ? wert.slice(0, 10) : "";
}

function Meldung({ ergebnis }: { ergebnis: AktionsErgebnis }) {
  if (ergebnis.fehler) return <div className="alert alert-danger py-2">{ergebnis.fehler}</div>;
  if (ergebnis.erfolg) return <div className="alert alert-success py-2">{ergebnis.erfolg}</div>;
  return null;
}

export interface ProxmoxWerte {
  nummer: string | null;
  datum: string | null;
  faelligAm: string | null;
  nettoBetrag: number | null;
  ustSatz: number;
  rabatt: number | null;
  zahlungsart: string | null;
  bezahlt: boolean;
  bezahltAm: string | null;
  anhangId: string | null;
  anhangName: string | null;
}

/** Proxmox-Rechnung (Einkauf). Gleiche Rechnungsnummer heißt: Position an derselben Rechnung. */
export function ProxmoxRechnungFormular({
  laufzeitId,
  hostId,
  werte,
}: {
  laufzeitId: string;
  hostId: string;
  werte: ProxmoxWerte;
}) {
  const [ergebnis, aktion, laeuft] = useActionState(proxmoxRechnungSpeichern, LEER);

  // Listenpreis und Rabatt im Zustand, damit der tatsächlich gezahlte Betrag sofort danebensteht.
  const [netto, setNetto] = useState(werte.nettoBetrag === null ? "" : String(werte.nettoBetrag));
  const [rabatt, setRabatt] = useState(werte.rabatt === null ? "" : String(werte.rabatt));
  const zahl = (wert: string) => Number(wert.replace(",", ".")) || 0;
  const nettoZahl = zahl(netto);
  const rabattZahl = zahl(rabatt);

  return (
    <form action={aktion}>
      <input type="hidden" name="laufzeitId" value={laufzeitId} />
      <input type="hidden" name="hostId" value={hostId} />
      <Meldung ergebnis={ergebnis} />

      <div className="row g-3">
        <div className="col-md-6">
          <label className="form-label" htmlFor="px-nummer">
            Rechnungsnummer *
          </label>
          <input
            id="px-nummer"
            name="nummer"
            className="form-control pl-mono"
            defaultValue={werte.nummer ?? ""}
            placeholder="PX-2026-14790"
            required
          />
          <div className="form-text">
            Eine bereits vorhandene Nummer ergänzt die Sammelrechnung um diese Laufzeit.
          </div>
        </div>
        <div className="col-md-3">
          <label className="form-label" htmlFor="px-datum">
            Rechnungsdatum *
          </label>
          <input
            id="px-datum"
            name="datum"
            type="date"
            className="form-control"
            defaultValue={isoDatum(werte.datum)}
            required
          />
        </div>
        <div className="col-md-3">
          <label className="form-label" htmlFor="px-faellig">
            Fällig am
          </label>
          <input
            id="px-faellig"
            name="faelligAm"
            type="date"
            className="form-control"
            defaultValue={isoDatum(werte.faelligAm)}
          />
        </div>

        <div className="col-md-3">
          <label className="form-label" htmlFor="px-netto">
            Listenpreis netto (€) *
          </label>
          <input
            id="px-netto"
            name="nettoBetrag"
            className="form-control"
            inputMode="decimal"
            value={netto}
            onChange={(e) => setNetto(e.target.value)}
            required
          />
          <div className="form-text">Betrag dieser einen Laufzeit, wie er auf der Rechnung steht.</div>
        </div>
        <div className="col-md-2">
          <label className="form-label" htmlFor="px-ust">
            USt (%)
          </label>
          <input
            id="px-ust"
            name="ustSatz"
            className="form-control"
            inputMode="decimal"
            defaultValue={werte.ustSatz}
          />
        </div>
        <div className="col-md-3">
          <label className="form-label" htmlFor="px-rabatt">
            Rabatt (€)
          </label>
          <input
            id="px-rabatt"
            name="rabatt"
            className="form-control"
            inputMode="decimal"
            value={rabatt}
            onChange={(e) => setRabatt(e.target.value)}
          />
          <div className="form-text">
            {rabattZahl > 0 ? (
              <>
                Gerechnet wird mit <strong>{formatEuro(nettoZahl - rabattZahl)}</strong>.
              </>
            ) : (
              "Proxmox weist ihn je Key als eigene Zeile aus („Client Discount“)."
            )}
          </div>
        </div>
        <div className="col-md-4">
          <label className="form-label" htmlFor="px-zahlungsart">
            Zahlungsart
          </label>
          <input
            id="px-zahlungsart"
            name="zahlungsart"
            className="form-control"
            defaultValue={werte.zahlungsart ?? ""}
            placeholder="Überweisung"
          />
        </div>

        <div className="col-md-4 d-flex align-items-end">
          <div className="form-check">
            <input
              className="form-check-input"
              type="checkbox"
              id="px-bezahlt"
              name="bezahlt"
              defaultChecked={werte.bezahlt}
            />
            <label className="form-check-label" htmlFor="px-bezahlt">
              bezahlt
            </label>
          </div>
        </div>
        <div className="col-md-4">
          <label className="form-label" htmlFor="px-bezahltAm">
            Bezahlt am
          </label>
          <input
            id="px-bezahltAm"
            name="bezahltAm"
            type="date"
            className="form-control"
            defaultValue={isoDatum(werte.bezahltAm)}
          />
        </div>
        <div className="col-md-4">
          <label className="form-label" htmlFor="px-pdf">
            PDF (max. 10 MB)
          </label>
          <input id="px-pdf" name="pdf" type="file" accept="application/pdf" className="form-control" />
          {werte.anhangId ? (
            <div className="form-text">
              Hinterlegt:{" "}
              <a href={`/anhang/${werte.anhangId}`} target="_blank" rel="noreferrer">
                {werte.anhangName ?? "PDF ansehen"}
              </a>
            </div>
          ) : null}
        </div>
      </div>

      <button type="submit" className="btn btn-primary mt-3 pl-touch-target" disabled={laeuft}>
        {laeuft ? "Speichert …" : "Proxmox-Rechnung speichern"}
      </button>
    </form>
  );
}

export interface KundenWerte {
  erstellt: boolean;
  nummer: string | null;
  datum: string | null;
  nettoBetrag: number | null;
  ustSatz: number;
  bezahlt: boolean;
  bezahltAm: string | null;
  anhangId: string | null;
  anhangName: string | null;
}

/** Kundenrechnung (Verkauf). */
export function KundenrechnungFormular({
  laufzeitId,
  hostId,
  werte,
  kundeVorhanden,
}: {
  laufzeitId: string;
  hostId: string;
  werte: KundenWerte;
  kundeVorhanden: boolean;
}) {
  const [ergebnis, aktion, laeuft] = useActionState(kundenrechnungSpeichern, LEER);

  if (!kundeVorhanden) {
    return (
      <p className="mb-0 text-body-secondary">
        Dieser Host ist keinem Kunden zugewiesen. Ohne Kunde lässt sich keine Kundenrechnung erfassen.
      </p>
    );
  }

  return (
    <form action={aktion}>
      <input type="hidden" name="laufzeitId" value={laufzeitId} />
      <input type="hidden" name="hostId" value={hostId} />
      <Meldung ergebnis={ergebnis} />

      <div className="row g-3">
        <div className="col-md-4 d-flex align-items-end">
          <div className="form-check">
            <input
              className="form-check-input"
              type="checkbox"
              id="kr-erstellt"
              name="erstellt"
              defaultChecked={werte.erstellt}
            />
            <label className="form-check-label" htmlFor="kr-erstellt">
              Rechnung ist erstellt
            </label>
          </div>
        </div>
        <div className="col-md-4">
          <label className="form-label" htmlFor="kr-nummer">
            Rechnungsnummer
          </label>
          <input
            id="kr-nummer"
            name="nummer"
            className="form-control pl-mono"
            defaultValue={werte.nummer ?? ""}
            placeholder="RE-2026-0412"
          />
          <div className="form-text">Gleiche Nummer = eine Rechnung über mehrere Laufzeiten.</div>
        </div>
        <div className="col-md-4">
          <label className="form-label" htmlFor="kr-datum">
            Rechnungsdatum
          </label>
          <input
            id="kr-datum"
            name="datum"
            type="date"
            className="form-control"
            defaultValue={isoDatum(werte.datum)}
          />
        </div>

        <div className="col-md-4">
          <label className="form-label" htmlFor="kr-netto">
            Netto (€)
          </label>
          <input
            id="kr-netto"
            name="nettoBetrag"
            className="form-control"
            inputMode="decimal"
            defaultValue={werte.nettoBetrag ?? ""}
          />
        </div>
        <div className="col-md-2">
          <label className="form-label" htmlFor="kr-ust">
            USt (%)
          </label>
          <input
            id="kr-ust"
            name="ustSatz"
            className="form-control"
            inputMode="decimal"
            defaultValue={werte.ustSatz}
          />
        </div>
        <div className="col-md-3 d-flex align-items-end">
          <div className="form-check">
            <input
              className="form-check-input"
              type="checkbox"
              id="kr-bezahlt"
              name="bezahlt"
              defaultChecked={werte.bezahlt}
            />
            <label className="form-check-label" htmlFor="kr-bezahlt">
              vom Kunden bezahlt
            </label>
          </div>
        </div>
        <div className="col-md-3">
          <label className="form-label" htmlFor="kr-bezahltAm">
            Bezahlt am
          </label>
          <input
            id="kr-bezahltAm"
            name="bezahltAm"
            type="date"
            className="form-control"
            defaultValue={isoDatum(werte.bezahltAm)}
          />
        </div>
        <div className="col-md-6">
          <label className="form-label" htmlFor="kr-pdf">
            PDF (max. 10 MB)
          </label>
          <input id="kr-pdf" name="pdf" type="file" accept="application/pdf" className="form-control" />
          {werte.anhangId ? (
            <div className="form-text">
              Hinterlegt:{" "}
              <a href={`/anhang/${werte.anhangId}`} target="_blank" rel="noreferrer">
                {werte.anhangName ?? "PDF ansehen"}
              </a>
            </div>
          ) : null}
        </div>
      </div>

      <button type="submit" className="btn btn-primary mt-3 pl-touch-target" disabled={laeuft}>
        {laeuft ? "Speichert …" : "Kundenrechnung speichern"}
      </button>
    </form>
  );
}
