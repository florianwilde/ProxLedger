"use client";

import { useActionState } from "react";
import { emailKanalSpeichern, webhookKanalSpeichern } from "@/server/actions/benachrichtigungen";
import type { AktionsErgebnis } from "@/server/actions/kunden";

const LEER: AktionsErgebnis = {};

function Meldung({ ergebnis }: { ergebnis: AktionsErgebnis }) {
  if (ergebnis.fehler) return <div className="alert alert-danger py-2">{ergebnis.fehler}</div>;
  if (ergebnis.erfolg) return <div className="alert alert-success py-2">{ergebnis.erfolg}</div>;
  return null;
}

export interface EmailWerte {
  id: string | null;
  name: string;
  aktiv: boolean;
  host: string;
  port: number;
  benutzer: string;
  absender: string;
  empfaenger: string;
  passwortGesetzt: boolean;
}

export function EmailFormular({ werte }: { werte: EmailWerte }) {
  const [ergebnis, aktion, laeuft] = useActionState(emailKanalSpeichern, LEER);

  return (
    <form action={aktion}>
      {werte.id ? <input type="hidden" name="id" value={werte.id} /> : null}
      <Meldung ergebnis={ergebnis} />

      <div className="row g-3">
        <div className="col-md-4">
          <label className="form-label" htmlFor="smtp-name">
            Bezeichnung
          </label>
          <input id="smtp-name" name="name" className="form-control" defaultValue={werte.name} />
        </div>
        <div className="col-md-5">
          <label className="form-label" htmlFor="smtp-host">
            SMTP-Server *
          </label>
          <input
            id="smtp-host"
            name="host"
            className="form-control"
            defaultValue={werte.host}
            placeholder="smtp.office365.com"
            required
          />
        </div>
        <div className="col-md-3">
          <label className="form-label" htmlFor="smtp-port">
            Port
          </label>
          <input
            id="smtp-port"
            name="port"
            type="number"
            className="form-control"
            defaultValue={werte.port}
          />
          <div className="form-text">587 = STARTTLS (Microsoft 365), 465 = SMTPS</div>
        </div>

        <div className="col-md-4">
          <label className="form-label" htmlFor="smtp-benutzer">
            Benutzer
          </label>
          <input
            id="smtp-benutzer"
            name="benutzer"
            className="form-control"
            defaultValue={werte.benutzer}
            autoComplete="username"
          />
        </div>
        <div className="col-md-4">
          <label className="form-label" htmlFor="smtp-passwort">
            Passwort
          </label>
          <input
            id="smtp-passwort"
            name="passwort"
            type="password"
            className="form-control"
            autoComplete="new-password"
            placeholder={werte.passwortGesetzt ? "gespeichert – leer lassen zum Beibehalten" : ""}
          />
        </div>
        <div className="col-md-4">
          <label className="form-label" htmlFor="smtp-absender">
            Absender
          </label>
          <input
            id="smtp-absender"
            name="absender"
            className="form-control"
            defaultValue={werte.absender}
            placeholder="proxledger@example.de"
          />
        </div>

        <div className="col-md-9">
          <label className="form-label" htmlFor="smtp-empfaenger">
            Empfänger *
          </label>
          <input
            id="smtp-empfaenger"
            name="empfaenger"
            className="form-control"
            defaultValue={werte.empfaenger}
            placeholder="florian@example.de, team@example.de"
            required
          />
          <div className="form-text">Mehrere Adressen mit Komma trennen.</div>
        </div>
        <div className="col-md-3 d-flex align-items-center">
          <div className="form-check mt-4">
            <input
              className="form-check-input"
              type="checkbox"
              id="smtp-aktiv"
              name="aktiv"
              defaultChecked={werte.aktiv}
            />
            <label className="form-check-label" htmlFor="smtp-aktiv">
              aktiv
            </label>
          </div>
        </div>
      </div>

      <button type="submit" className="btn btn-primary mt-3 pl-touch-target" disabled={laeuft}>
        {laeuft ? "Speichert …" : "E-Mail-Versand speichern"}
      </button>
    </form>
  );
}

export interface WebhookWerte {
  id: string | null;
  name: string;
  aktiv: boolean;
  url: string;
  geheimnisGesetzt: boolean;
}

export function WebhookFormular({ werte }: { werte: WebhookWerte }) {
  const [ergebnis, aktion, laeuft] = useActionState(webhookKanalSpeichern, LEER);

  return (
    <form action={aktion}>
      {werte.id ? <input type="hidden" name="id" value={werte.id} /> : null}
      <Meldung ergebnis={ergebnis} />

      <div className="row g-3">
        <div className="col-md-4">
          <label className="form-label" htmlFor="hook-name">
            Bezeichnung
          </label>
          <input id="hook-name" name="name" className="form-control" defaultValue={werte.name} />
        </div>
        <div className="col-md-8">
          <label className="form-label" htmlFor="hook-url">
            Adresse *
          </label>
          <input
            id="hook-url"
            name="url"
            className="form-control"
            defaultValue={werte.url}
            placeholder="https://matrix.example.de/hook/abc"
            required
          />
        </div>
        <div className="col-md-9">
          <label className="form-label" htmlFor="hook-geheimnis">
            Geheimnis für die Signatur
          </label>
          <input
            id="hook-geheimnis"
            name="geheimnis"
            type="password"
            className="form-control"
            autoComplete="new-password"
            placeholder={werte.geheimnisGesetzt ? "gespeichert – leer lassen zum Beibehalten" : "optional"}
          />
          <div className="form-text">
            Wird als <span className="pl-mono">X-ProxLedger-Signatur: sha256=…</span> mitgeschickt.
          </div>
        </div>
        <div className="col-md-3 d-flex align-items-center">
          <div className="form-check mt-4">
            <input
              className="form-check-input"
              type="checkbox"
              id="hook-aktiv"
              name="aktiv"
              defaultChecked={werte.aktiv}
            />
            <label className="form-check-label" htmlFor="hook-aktiv">
              aktiv
            </label>
          </div>
        </div>
      </div>

      <button type="submit" className="btn btn-primary mt-3 pl-touch-target" disabled={laeuft}>
        {laeuft ? "Speichert …" : "Webhook speichern"}
      </button>
    </form>
  );
}
