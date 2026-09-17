"use client";

import { useState, type ReactNode } from "react";

export interface Tab {
  id: string;
  titel: string;
  icon?: string;
  inhalt: ReactNode;
}

/** Karten-Tabs im AdminLTE-Stil, ohne Bootstrap-JavaScript. */
export function Tabs({ tabs }: { tabs: Tab[] }) {
  const [aktiv, setAktiv] = useState(tabs[0]?.id);

  return (
    <div className="card shadow-sm mb-4">
      <div className="card-header p-0 border-bottom-0">
        <ul className="nav nav-tabs" role="tablist">
          {tabs.map((tab) => (
            <li className="nav-item" key={tab.id} role="presentation">
              <button
                type="button"
                role="tab"
                aria-selected={aktiv === tab.id}
                className={`nav-link pl-touch-target ${aktiv === tab.id ? "active" : ""}`}
                onClick={() => setAktiv(tab.id)}
              >
                {tab.icon ? <i className={`bi ${tab.icon} me-1`} aria-hidden="true" /> : null}
                {tab.titel}
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="card-body">
        {tabs.map((tab) => (
          <div key={tab.id} role="tabpanel" hidden={aktiv !== tab.id}>
            {aktiv === tab.id ? tab.inhalt : null}
          </div>
        ))}
      </div>
    </div>
  );
}
