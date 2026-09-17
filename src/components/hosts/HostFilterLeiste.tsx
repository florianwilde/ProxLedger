"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Filterleiste der Host-Tabelle. Alle Filter stehen in der Adresse, damit sich eine
 * gefilterte Liste teilen lässt und der Zurück-Knopf funktioniert.
 */
export function HostFilterLeiste({
  kunden,
  werte,
}: {
  kunden: { id: string; name: string }[];
  werte: Record<string, string | undefined>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const parameter = useSearchParams();

  function setzen(schluessel: string, wert: string) {
    const neu = new URLSearchParams(parameter.toString());
    if (wert) neu.set(schluessel, wert);
    else neu.delete(schluessel);
    neu.delete("seite");
    router.push(`${pathname}?${neu.toString()}`);
  }

  const aktiveFilter = ["kunde", "status", "produkt", "ablauf", "rechnung", "q"].filter(
    (schluessel) => werte[schluessel],
  ).length;

  return (
    <form
      className="row g-2 p-3 border-bottom"
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        const eingabe = new FormData(e.currentTarget).get("q")?.toString() ?? "";
        setzen("q", eingabe);
      }}
    >
      <div className="col-md-4">
        <label className="visually-hidden" htmlFor="q">
          Suche
        </label>
        <div className="input-group">
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={werte.q ?? ""}
            className="form-control"
            placeholder="Hostname, Key, Server-ID, IP oder Rechnungsnummer …"
          />
          <button type="submit" className="btn btn-primary" aria-label="Suchen">
            <i className="bi bi-search" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="col-6 col-md-2">
        <select
          className="form-select"
          aria-label="Kunde"
          value={werte.kunde ?? ""}
          onChange={(e) => setzen("kunde", e.target.value)}
        >
          <option value="">Alle Kunden</option>
          <option value="ohne">Nicht zugeordnet</option>
          {kunden.map((kunde) => (
            <option key={kunde.id} value={kunde.id}>
              {kunde.name}
            </option>
          ))}
        </select>
      </div>

      <div className="col-6 col-md-2">
        <select
          className="form-select"
          aria-label="Status"
          value={werte.status ?? ""}
          onChange={(e) => setzen("status", e.target.value)}
        >
          <option value="">Alle Status</option>
          <option value="ACTIVE">Aktiv</option>
          <option value="EXPIRED">Abgelaufen</option>
          <option value="NOTFOUND">Keine Subscription</option>
          <option value="INVALID">Ungültig</option>
          <option value="SUSPENDED">Ausgesetzt</option>
          <option value="UNKNOWN">Unbekannt</option>
          <option value="keine-meldung">Meldet sich nicht</option>
        </select>
      </div>

      <div className="col-6 col-md-2">
        <select
          className="form-select"
          aria-label="Produkt"
          value={werte.produkt ?? ""}
          onChange={(e) => setzen("produkt", e.target.value)}
        >
          <option value="">Alle Produkte</option>
          <option value="PVE">Proxmox VE</option>
          <option value="PBS">Backup Server</option>
          <option value="PMG">Mail Gateway</option>
        </select>
      </div>

      <div className="col-6 col-md-2">
        <select
          className="form-select"
          aria-label="Ablauf"
          value={werte.ablauf ?? ""}
          onChange={(e) => setzen("ablauf", e.target.value)}
        >
          <option value="">Jeder Ablauf</option>
          <option value="14">Läuft in 14 Tagen ab</option>
          <option value="30">Läuft in 30 Tagen ab</option>
          <option value="abgelaufen">Abgelaufen</option>
        </select>
      </div>

      <div className="col-12 d-flex align-items-center gap-3">
        <div className="form-check">
          <input
            className="form-check-input"
            type="checkbox"
            id="rechnung"
            checked={werte.rechnung === "offen"}
            onChange={(e) => setzen("rechnung", e.target.checked ? "offen" : "")}
          />
          <label className="form-check-label small" htmlFor="rechnung">
            nur mit offenen Rechnungspunkten
          </label>
        </div>
        {aktiveFilter > 0 ? (
          <Link href="/hosts" className="small">
            Filter zurücksetzen ({aktiveFilter})
          </Link>
        ) : null}
      </div>
    </form>
  );
}
