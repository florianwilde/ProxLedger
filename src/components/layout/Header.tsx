"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import type { SuchEintrag } from "@/mock/suchindex";
import type { Alert } from "@/mock/types";
import { SearchDialog } from "./SearchDialog";

const SCHWERE_ICON: Record<Alert["schwere"], string> = {
  gefahr: "bi-exclamation-octagon-fill pl-text-danger",
  warnung: "bi-exclamation-triangle-fill pl-text-warning",
  info: "bi-info-circle-fill text-body-secondary",
};

/** Farbschema aus dem <html>-Attribut lesen, damit Server und Client übereinstimmen. */
function themaIstDunkel() {
  return document.documentElement.dataset.bsTheme === "dark";
}

function themaAbonnieren(aenderung: () => void) {
  const beobachter = new MutationObserver(aenderung);
  beobachter.observe(document.documentElement, { attributes: true, attributeFilter: ["data-bs-theme"] });
  return () => beobachter.disconnect();
}

export function Header({
  alerts,
  suchEintraege,
  benutzer,
}: {
  alerts: Alert[];
  suchEintraege: SuchEintrag[];
  benutzer: string;
}) {
  const [sucheOffen, setSucheOffen] = useState(false);
  const [glockeOffen, setGlockeOffen] = useState(false);
  const [benutzerOffen, setBenutzerOffen] = useState(false);
  const dunkel = useSyncExternalStore(themaAbonnieren, themaIstDunkel, () => false);

  useEffect(() => {
    function tasten(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSucheOffen(true);
      }
    }
    window.addEventListener("keydown", tasten);
    return () => window.removeEventListener("keydown", tasten);
  }, []);

  /** Sidebar umschalten: auf schmalen Bildschirmen als Overlay, sonst eingeklappt. */
  const sidebarUmschalten = useCallback(() => {
    const body = document.body;
    if (window.innerWidth < 992) {
      body.classList.toggle("sidebar-open");
      body.classList.remove("sidebar-collapse");
    } else {
      body.classList.toggle("sidebar-collapse");
      body.classList.remove("sidebar-open");
    }
  }, []);

  function themaUmschalten() {
    const neu = dunkel ? "light" : "dark";
    document.documentElement.dataset.bsTheme = neu;
    try {
      localStorage.setItem("pl-theme", neu);
    } catch {
      // Speicherzugriff kann blockiert sein; das Thema gilt dann nur für diese Sitzung.
    }
  }

  function vollbild() {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void document.documentElement.requestFullscreen();
    }
  }

  return (
    <nav className="app-header navbar navbar-expand bg-body shadow-sm">
      <div className="container-fluid">
        <ul className="navbar-nav">
          <li className="nav-item">
            <button
              type="button"
              className="nav-link btn btn-link pl-touch-target"
              onClick={sidebarUmschalten}
              aria-label="Menü ein- oder ausklappen"
            >
              <i className="bi bi-list fs-5" aria-hidden="true" />
            </button>
          </li>
          <li className="nav-item d-none d-md-block">
            <Link href="/" className="nav-link">
              Start
            </Link>
          </li>
          <li className="nav-item d-none d-md-block">
            <Link href="/einstellungen/tokens" className="nav-link">
              Agent installieren
            </Link>
          </li>
        </ul>

        <ul className="navbar-nav ms-auto align-items-center">
          <li className="nav-item">
            <button
              type="button"
              className="nav-link btn btn-link pl-touch-target"
              onClick={() => setSucheOffen(true)}
              aria-label="Globale Suche öffnen (Strg+K)"
              title="Suche (Strg+K)"
            >
              <i className="bi bi-search" aria-hidden="true" />
            </button>
          </li>

          <li className="nav-item dropdown">
            <button
              type="button"
              className="nav-link btn btn-link position-relative pl-touch-target"
              onClick={() => {
                setGlockeOffen((o) => !o);
                setBenutzerOffen(false);
              }}
              aria-label={`${alerts.length} offene Warnungen anzeigen`}
              aria-expanded={glockeOffen}
            >
              <i className="bi bi-bell-fill" aria-hidden="true" />
              {alerts.length > 0 ? (
                <span className="badge pl-bg-danger position-absolute top-0 start-100 translate-middle rounded-pill">
                  {alerts.length}
                </span>
              ) : null}
            </button>
            <div
              className={`dropdown-menu dropdown-menu-end shadow ${glockeOffen ? "show" : ""}`}
              style={{ width: "22rem" }}
            >
              <span className="dropdown-header">{alerts.length} offene Warnungen</span>
              <div className="dropdown-divider" />
              {alerts.slice(0, 6).map((alert) => (
                <Link
                  key={alert.id}
                  href={alert.hostId ? `/hosts/${alert.hostId}` : "/hosts"}
                  className="dropdown-item d-flex gap-2 py-2"
                  onClick={() => setGlockeOffen(false)}
                >
                  <i className={`bi ${SCHWERE_ICON[alert.schwere]} mt-1`} aria-hidden="true" />
                  <span className="text-wrap">
                    <span className="d-block fw-semibold">{alert.titel}</span>
                    <span className="d-block small text-body-secondary">{alert.beschreibung}</span>
                  </span>
                </Link>
              ))}
              <div className="dropdown-divider" />
              <Link href="/hosts" className="dropdown-item text-center" onClick={() => setGlockeOffen(false)}>
                Alle Warnungen ansehen
              </Link>
            </div>
          </li>

          <li className="nav-item">
            <button
              type="button"
              className="nav-link btn btn-link pl-touch-target"
              onClick={themaUmschalten}
              aria-label={dunkel ? "Helles Design verwenden" : "Dunkles Design verwenden"}
              title={dunkel ? "Helles Design" : "Dunkles Design"}
            >
              <i className={`bi ${dunkel ? "bi-sun" : "bi-moon-stars"}`} aria-hidden="true" />
            </button>
          </li>

          <li className="nav-item d-none d-md-block">
            <button
              type="button"
              className="nav-link btn btn-link pl-touch-target"
              onClick={vollbild}
              aria-label="Vollbild umschalten"
            >
              <i className="bi bi-arrows-fullscreen" aria-hidden="true" />
            </button>
          </li>

          <li className="nav-item dropdown">
            <button
              type="button"
              className="nav-link btn btn-link d-flex align-items-center gap-2 pl-touch-target"
              onClick={() => {
                setBenutzerOffen((o) => !o);
                setGlockeOffen(false);
              }}
              aria-expanded={benutzerOffen}
            >
              <i className="bi bi-person-circle" aria-hidden="true" />
              <span className="d-none d-sm-inline">{benutzer}</span>
            </button>
            <div className={`dropdown-menu dropdown-menu-end shadow ${benutzerOffen ? "show" : ""}`}>
              <span className="dropdown-header">Angemeldet als {benutzer}</span>
              <div className="dropdown-divider" />
              <Link href="/einstellungen/system" className="dropdown-item">
                Einstellungen
              </Link>
              <span className="dropdown-item text-body-secondary">Abmelden (ab #013)</span>
            </div>
          </li>
        </ul>
      </div>

      {sucheOffen ? (
        <SearchDialog eintraege={suchEintraege} onSchliessen={() => setSucheOffen(false)} />
      ) : null}
    </nav>
  );
}
