"use client";

import { useActionState } from "react";
import { Card } from "@/components/ui/Card";
import { type AktionsErgebnis, einstellungenSpeichernAktion } from "@/server/actions/einstellungen";
import type { Einstellungen } from "@/server/einstellungen";

const LEER: AktionsErgebnis = {};

function Feld({
  name,
  beschriftung,
  hinweis,
  fehler,
  children,
}: {
  name: string;
  beschriftung: string;
  hinweis?: string;
  fehler?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-3">
      <label className="form-label" htmlFor={name}>
        {beschriftung}
      </label>
      {children}
      {hinweis ? <div className="form-text">{hinweis}</div> : null}
      {fehler ? <div className="invalid-feedback d-block">{fehler}</div> : null}
    </div>
  );
}

export function SystemFormular({ werte, appUrl }: { werte: Einstellungen; appUrl: string }) {
  const [ergebnis, aktion, laeuft] = useActionState(einstellungenSpeichernAktion, LEER);
  const fehler = ergebnis.felder ?? {};

  return (
    <form action={aktion}>
      {ergebnis.fehler ? <div className="alert alert-danger">{ergebnis.fehler}</div> : null}
      {ergebnis.erfolg ? <div className="alert alert-success">{ergebnis.erfolg}</div> : null}

      <div className="row g-4">
        <div className="col-12 col-xl-6">
          <Card titel="Adresse und Agent" rahmen="primary">
            <Feld
              name="dashboardUrl"
              beschriftung="Adresse des Dashboards"
              hinweis={`Steht im Installations-Einzeiler und in Benachrichtigungen. Leer lassen heißt: aus der Umgebung (${appUrl || "nicht gesetzt"}).`}
              fehler={fehler.dashboardUrl}
            >
              <input
                type="url"
                className="form-control"
                id="dashboardUrl"
                name="dashboardUrl"
                defaultValue={werte.dashboardUrl}
                placeholder="https://proxledger.example.de"
              />
            </Feld>

            <Feld
              name="agentRhythmus"
              beschriftung="Wie oft meldet ein Host?"
              hinweis="Gilt für neu installierte Agents; bestehende übernehmen es bei der nächsten Installation."
            >
              <select className="form-select" id="agentRhythmus" name="agentRhythmus" defaultValue={werte.agentRhythmus}>
                <option value="taeglich">täglich</option>
                <option value="zwoelfstuendlich">alle 12 Stunden</option>
                <option value="stuendlich">stündlich</option>
              </select>
            </Feld>

            <Feld
              name="agentStreuungStunden"
              beschriftung="Zufällige Verzögerung (Stunden)"
              hinweis="Verteilt die Meldungen, damit nicht alle Hosts gleichzeitig anklopfen."
              fehler={fehler.agentStreuungStunden}
            >
              <input
                type="number"
                min={0}
                max={12}
                className="form-control"
                id="agentStreuungStunden"
                name="agentStreuungStunden"
                defaultValue={werte.agentStreuungStunden}
              />
            </Feld>

            <div className="form-check">
              <input
                type="checkbox"
                className="form-check-input pl-touch-target"
                id="agentAutoUpdate"
                name="agentAutoUpdate"
                value="an"
                defaultChecked={werte.agentAutoUpdate}
              />
              <label className="form-check-label" htmlFor="agentAutoUpdate">
                Agents dürfen sich selbst aktualisieren
              </label>
              <div className="form-text">
                Der Agent lädt bei einer neueren Fassung das Skript vom Dashboard nach.
              </div>
            </div>
          </Card>
        </div>

        <div className="col-12 col-xl-6">
          <Card titel="Kaufmännisches" rahmen="info">
            <Feld name="waehrung" beschriftung="Währung">
              <select className="form-select" id="waehrung" name="waehrung" defaultValue={werte.waehrung}>
                <option value="EUR">Euro (€)</option>
                <option value="CHF">Schweizer Franken (CHF)</option>
              </select>
            </Feld>

            <Feld
              name="steuersatz"
              beschriftung="Steuersatz Verkauf in Prozent"
              hinweis="Vorgabe für neue Kundenrechnungen."
              fehler={fehler.steuersatz}
            >
              <input
                type="number"
                step="0.1"
                min={0}
                max={100}
                className="form-control"
                id="steuersatz"
                name="steuersatz"
                defaultValue={werte.steuersatz}
              />
            </Feld>

            <Feld
              name="steuersatzEinkauf"
              beschriftung="Steuersatz Einkauf in Prozent"
              hinweis="Für die Proxmox-Rechnungen. 0 bei Reverse Charge – der Normalfall mit USt-IdNr."
              fehler={fehler.steuersatzEinkauf}
            >
              <input
                type="number"
                step="0.1"
                min={0}
                max={100}
                className="form-control"
                id="steuersatzEinkauf"
                name="steuersatzEinkauf"
                defaultValue={werte.steuersatzEinkauf}
              />
            </Feld>

            <Feld
              name="zahlungszielTage"
              beschriftung="Zahlungsziel in Tagen"
              hinweis="Setzt das Fälligkeitsdatum neuer Rechnungen vor."
              fehler={fehler.zahlungszielTage}
            >
              <input
                type="number"
                min={0}
                max={120}
                className="form-control"
                id="zahlungszielTage"
                name="zahlungszielTage"
                defaultValue={werte.zahlungszielTage}
              />
            </Feld>

            <Feld
              name="margeProzent"
              beschriftung="Aufschlag in Prozent"
              hinweis="Vorschlag für den Verkaufspreis, ausgehend vom Einkaufspreis bei Proxmox."
              fehler={fehler.margeProzent}
            >
              <input
                type="number"
                step="0.5"
                min={0}
                max={500}
                className="form-control"
                id="margeProzent"
                name="margeProzent"
                defaultValue={werte.margeProzent}
              />
            </Feld>
          </Card>
        </div>

        <div className="col-12 col-xl-6">
          <Card titel="Sicherheit" rahmen="danger">
            <Feld
              name="sitzungsdauerStunden"
              beschriftung="Sitzungsdauer in Stunden"
              hinweis="Nach dieser Zeit ist eine neue Anmeldung nötig."
              fehler={fehler.sitzungsdauerStunden}
            >
              <input
                type="number"
                min={1}
                max={168}
                className="form-control"
                id="sitzungsdauerStunden"
                name="sitzungsdauerStunden"
                defaultValue={werte.sitzungsdauerStunden}
              />
            </Feld>

            <Feld
              name="anmeldeversuche"
              beschriftung="Anmeldeversuche je Viertelstunde"
              fehler={fehler.anmeldeversuche}
            >
              <input
                type="number"
                min={3}
                max={50}
                className="form-control"
                id="anmeldeversuche"
                name="anmeldeversuche"
                defaultValue={werte.anmeldeversuche}
              />
            </Feld>

            <Feld
              name="oidcDomaenen"
              beschriftung="Erlaubte E-Mail-Domänen für OIDC"
              hinweis="Mehrere durch Komma trennen, etwa „wilde-server.de, kunde.de“. Leer heißt: alle."
            >
              <input
                type="text"
                className="form-control"
                id="oidcDomaenen"
                name="oidcDomaenen"
                defaultValue={werte.oidcDomaenen}
                placeholder="firma.de"
              />
            </Feld>

            <div className="form-check mb-3">
              <input
                type="checkbox"
                className="form-check-input pl-touch-target"
                id="oidcKontenAnlegen"
                name="oidcKontenAnlegen"
                value="an"
                defaultChecked={werte.oidcKontenAnlegen}
              />
              <label className="form-check-label" htmlFor="oidcKontenAnlegen">
                Unbekannte OIDC-Anmeldungen legen ein Konto an
              </label>
              <div className="form-text">
                Aus heißt: Nur wer hier schon ein Konto hat, kommt herein – auch wenn die Anmeldung
                beim Identitätsanbieter klappt.
              </div>
            </div>

            <Feld
              name="oidcStandardRolle"
              beschriftung="Rolle für neue OIDC-Konten"
              hinweis="Gilt nur für Konten, die bei der ersten Anmeldung automatisch entstehen."
            >
              <select
                className="form-select"
                id="oidcStandardRolle"
                name="oidcStandardRolle"
                defaultValue={werte.oidcStandardRolle}
              >
                <option value="TECHNIKER">Techniker</option>
                <option value="KUNDE">Kunde</option>
                <option value="ADMIN">Administrator</option>
              </select>
            </Feld>

            <Feld
              name="aufbewahrungReportsTage"
              beschriftung="Reports aufbewahren (Tage)"
              hinweis="0 heißt: unbegrenzt. Der aktuelle Stand jedes Hosts bleibt immer erhalten."
              fehler={fehler.aufbewahrungReportsTage}
            >
              <input
                type="number"
                min={0}
                max={3650}
                className="form-control"
                id="aufbewahrungReportsTage"
                name="aufbewahrungReportsTage"
                defaultValue={werte.aufbewahrungReportsTage}
              />
            </Feld>

            <Feld
              name="aufbewahrungAuditTage"
              beschriftung="Protokoll aufbewahren (Tage)"
              hinweis="0 heißt: unbegrenzt."
              fehler={fehler.aufbewahrungAuditTage}
            >
              <input
                type="number"
                min={0}
                max={3650}
                className="form-control"
                id="aufbewahrungAuditTage"
                name="aufbewahrungAuditTage"
                defaultValue={werte.aufbewahrungAuditTage}
              />
            </Feld>
          </Card>
        </div>

        <div className="col-12 col-xl-6">
          <Card titel="Firma und Darstellung" rahmen="keiner">
            <Feld
              name="firmaName"
              beschriftung="Firmenname"
              hinweis="Erscheint im Kopf der erzeugten PDF-Rechnungen."
            >
              <input
                type="text"
                className="form-control"
                id="firmaName"
                name="firmaName"
                defaultValue={werte.firmaName}
              />
            </Feld>

            <Feld name="firmaAnschrift" beschriftung="Anschrift">
              <textarea
                className="form-control"
                id="firmaAnschrift"
                name="firmaAnschrift"
                rows={3}
                defaultValue={werte.firmaAnschrift}
              />
            </Feld>

            <Feld name="firmaEmail" beschriftung="E-Mail-Adresse" fehler={fehler.firmaEmail}>
              <input
                type="email"
                className="form-control"
                id="firmaEmail"
                name="firmaEmail"
                defaultValue={werte.firmaEmail}
              />
            </Feld>

            <Feld
              name="zeitzone"
              beschriftung="Zeitzone"
              hinweis="Gilt für PDF, CSV-Ausgaben und Benachrichtigungen."
              fehler={fehler.zeitzone}
            >
              <input
                type="text"
                className="form-control"
                id="zeitzone"
                name="zeitzone"
                defaultValue={werte.zeitzone}
                placeholder="Europe/Berlin"
              />
            </Feld>
          </Card>
        </div>
      </div>

      <div className="mb-4">
        <button type="submit" className="btn btn-primary" disabled={laeuft}>
          {laeuft ? "Wird gespeichert …" : "Einstellungen speichern"}
        </button>
      </div>
    </form>
  );
}
