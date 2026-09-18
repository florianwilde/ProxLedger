"use client";

import { startAuthentication } from "@simplewebauthn/browser";
import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Anmeldung per Passkey. Der Knopf erscheint immer; ob ein Passkey vorliegt, weiß erst der Browser –
 * und das darf die Seite auch nicht vorher verraten (sonst ließen sich Konten ausspähen).
 */
export function PasskeyAnmeldung({ ziel }: { ziel: string }) {
  const router = useRouter();
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);

  async function anmelden() {
    setLaeuft(true);
    setFehler(null);

    try {
      const optionen = await fetch("/api/auth/passkey/anmelden").then((antwort) => antwort.json());
      const antwort = await startAuthentication({ optionsJSON: optionen });

      const ergebnis = await fetch("/api/auth/passkey/anmelden", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(antwort),
      }).then((a) => a.json());

      if (ergebnis.erfolg) {
        router.push(ziel.startsWith("/") ? ziel : "/");
        router.refresh();
      } else {
        setFehler(ergebnis.fehler ?? "Anmeldung nicht möglich.");
      }
    } catch (fehler) {
      setFehler(
        fehler instanceof Error && fehler.name === "NotAllowedError"
          ? "Abgebrochen."
          : "Mit diesem Gerät geht es nicht. Passkeys brauchen HTTPS.",
      );
    } finally {
      setLaeuft(false);
    }
  }

  return (
    <>
      {fehler ? (
        <div className="alert alert-danger py-2" role="alert">
          {fehler}
        </div>
      ) : null}

      <button
        type="button"
        className="btn btn-outline-primary w-100 pl-touch-target mb-3"
        onClick={anmelden}
        disabled={laeuft}
      >
        <i className="bi bi-fingerprint me-1" aria-hidden="true" />
        {laeuft ? "Warte auf den Browser …" : "Mit Passkey anmelden"}
      </button>
    </>
  );
}
