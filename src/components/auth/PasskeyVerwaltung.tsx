"use client";

import { startRegistration } from "@simplewebauthn/browser";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { formatDatumZeit } from "@/lib/format";
import { passkeyLoeschen } from "@/server/actions/passkeys";

export interface PasskeyZeile {
  id: string;
  bezeichnung: string;
  erstelltAm: Date;
  zuletztAm: Date | null;
}

export function PasskeyVerwaltung({
  passkeys,
  moeglich,
  adresse,
}: {
  passkeys: PasskeyZeile[];
  moeglich: boolean;
  adresse: string;
}) {
  const router = useRouter();
  const [bezeichnung, setBezeichnung] = useState("");
  const [meldung, setMeldung] = useState<{ art: "fehler" | "erfolg"; text: string } | null>(null);
  const [laeuft, setLaeuft] = useState(false);

  async function registrieren() {
    setLaeuft(true);
    setMeldung(null);

    try {
      const optionen = await fetch("/api/auth/passkey/registrieren").then((antwort) => antwort.json());
      // Hier öffnet der Browser seine eigene Abfrage (Fingerabdruck, Gesicht, PIN oder Sicherheitsschlüssel).
      const antwort = await startRegistration({ optionsJSON: optionen });

      const ergebnis = await fetch("/api/auth/passkey/registrieren", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ antwort, bezeichnung }),
      }).then((a) => a.json());

      if (ergebnis.fehler) {
        setMeldung({ art: "fehler", text: ergebnis.fehler });
      } else {
        setMeldung({ art: "erfolg", text: `„${ergebnis.bezeichnung}“ ist hinterlegt.` });
        setBezeichnung("");
        router.refresh();
      }
    } catch (fehler) {
      // Abbruch durch den Benutzer ist kein Fehler, sieht aber genauso aus – deshalb neutral formulieren.
      setMeldung({
        art: "fehler",
        text:
          fehler instanceof Error && fehler.name === "NotAllowedError"
            ? "Abgebrochen oder abgelehnt."
            : "Der Passkey konnte nicht angelegt werden.",
      });
    } finally {
      setLaeuft(false);
    }
  }

  return (
    <>
      <Card titel="Neuen Passkey anlegen" rahmen="primary">
        {!moeglich ? (
          <div className="alert alert-warning mb-3">
            <strong>Über diese Adresse geht es nicht.</strong> Passkeys verlangen HTTPS; nur{" "}
            <code>localhost</code> ist ausgenommen. Aufgerufen wurde <code>{adresse}</code>. Richten Sie
            einen Reverse Proxy mit Zertifikat ein und tragen Sie die Adresse unter{" "}
            <em>Einstellungen → System</em> ein.
          </div>
        ) : null}

        {meldung ? (
          <div className={`alert ${meldung.art === "fehler" ? "alert-danger" : "alert-success"}`}>
            {meldung.text}
          </div>
        ) : null}

        <div className="row g-3 align-items-end">
          <div className="col-12 col-md-5">
            <label className="form-label" htmlFor="passkey-name">
              Bezeichnung
            </label>
            <input
              className="form-control"
              id="passkey-name"
              value={bezeichnung}
              onChange={(e) => setBezeichnung(e.target.value)}
              placeholder="z. B. Arbeitsrechner oder Telefon"
              disabled={!moeglich}
            />
            <div className="form-text">Hilft später beim Wiedererkennen, wenn mehrere hinterlegt sind.</div>
          </div>
          <div className="col-12 col-md-4">
            <button type="button" className="btn btn-primary" onClick={registrieren} disabled={!moeglich || laeuft}>
              <i className="bi bi-fingerprint me-2" aria-hidden="true" />
              {laeuft ? "Warte auf den Browser …" : "Passkey anlegen"}
            </button>
          </div>
        </div>
      </Card>

      <Card titel={`Hinterlegte Passkeys (${passkeys.length})`} rahmen="keiner">
        {passkeys.length === 0 ? (
          <p className="text-body-secondary mb-0">
            Noch keiner. Ohne Passkey bleibt die Anmeldung per Passwort oder OIDC – beides funktioniert
            weiterhin.
          </p>
        ) : (
          <div className="table-responsive">
            <table className="table align-middle">
              <thead>
                <tr>
                  <th scope="col">Bezeichnung</th>
                  <th scope="col">Angelegt</th>
                  <th scope="col">Zuletzt benutzt</th>
                  <th scope="col" className="text-end">
                    Aktion
                  </th>
                </tr>
              </thead>
              <tbody>
                {passkeys.map((passkey) => (
                  <tr key={passkey.id}>
                    <td className="fw-semibold">{passkey.bezeichnung}</td>
                    <td className="small">{formatDatumZeit(passkey.erstelltAm)}</td>
                    <td className="small">
                      {passkey.zuletztAm ? formatDatumZeit(passkey.zuletztAm) : "noch nie"}
                    </td>
                    <td className="text-end">
                      <form action={passkeyLoeschen}>
                        <input type="hidden" name="id" value={passkey.id} />
                        <button type="submit" className="btn btn-sm btn-outline-danger">
                          Entfernen
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
