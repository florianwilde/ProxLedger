"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

export interface SuchEintrag {
  typ: "Host" | "Kunde" | "Rechnung";
  titel: string;
  untertitel: string;
  href: string;
  /** Alle durchsuchbaren Werte in Kleinschreibung. */
  begriffe: string[];
}

const TYP_FARBE: Record<SuchEintrag["typ"], string> = {
  Host: "pl-bg-info",
  Kunde: "pl-bg-primary",
  Rechnung: "pl-bg-neutral",
};

/**
 * Globale Suche als Dialog, per Strg+K oder über die Kopfleiste.
 * Wird nur gerendert, solange er offen ist – dadurch startet er jedes Mal leer.
 */
export function SearchDialog({
  eintraege,
  onSchliessen,
}: {
  eintraege: SuchEintrag[];
  onSchliessen: () => void;
}) {
  const [begriff, setBegriff] = useState("");
  const [markiert, setMarkiert] = useState(0);
  const router = useRouter();

  const treffer = useMemo(() => {
    const q = begriff.trim().toLowerCase();
    if (q.length < 2) return [];
    return eintraege.filter((e) => e.begriffe.some((b) => b.includes(q))).slice(0, 12);
  }, [begriff, eintraege]);

  function oeffnen(eintrag: SuchEintrag) {
    onSchliessen();
    router.push(eintrag.href);
  }

  function tasten(event: React.KeyboardEvent) {
    if (event.key === "Escape") onSchliessen();
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setMarkiert((i) => Math.min(i + 1, treffer.length - 1));
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setMarkiert((i) => Math.max(i - 1, 0));
    }
    if (event.key === "Enter" && treffer[markiert]) {
      event.preventDefault();
      oeffnen(treffer[markiert]);
    }
  }

  return (
    <>
      <div className="pl-search-backdrop" onClick={onSchliessen} />
      <div className="pl-search-dialog" role="dialog" aria-modal="true" aria-label="Globale Suche">
        <div className="card shadow-lg mb-0">
          <div className="card-body p-2">
            <div className="input-group">
              <span className="input-group-text bg-body">
                <i className="bi bi-search" aria-hidden="true" />
              </span>
              <input
                autoFocus
                type="search"
                className="form-control form-control-lg"
                placeholder="Key, Host, Kunde oder Rechnungsnummer …"
                value={begriff}
                onChange={(e) => {
                  setBegriff(e.target.value);
                  setMarkiert(0);
                }}
                onKeyDown={tasten}
                aria-label="Suchbegriff"
              />
            </div>
          </div>
          {treffer.length > 0 ? (
            <ul className="list-group list-group-flush">
              {treffer.map((eintrag, index) => (
                <li key={`${eintrag.typ}-${eintrag.titel}-${index}`} className="list-group-item p-0">
                  <button
                    type="button"
                    className={`btn btn-link w-100 text-start text-decoration-none d-flex align-items-center gap-2 py-2 ${
                      index === markiert ? "bg-body-secondary" : ""
                    }`}
                    onMouseEnter={() => setMarkiert(index)}
                    onClick={() => oeffnen(eintrag)}
                  >
                    <span className={`badge ${TYP_FARBE[eintrag.typ]}`}>{eintrag.typ}</span>
                    <span className="flex-grow-1">
                      <span className="d-block text-body fw-semibold">{eintrag.titel}</span>
                      <span className="d-block small text-body-secondary">{eintrag.untertitel}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="card-body pt-0 small text-body-secondary">
              Mindestens zwei Zeichen eingeben. Beispiel: <span className="pl-mono">pve1c-a6bd21fcb6</span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
