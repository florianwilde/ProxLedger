"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge } from "./Badges";
import type { Farbton } from "./SmallBox";

export interface Aufgabe {
  id: string;
  titel: string;
  detail: string;
  dringlichkeit: "gefahr" | "warnung" | "info";
  badgeText: string;
  href: string;
}

const BADGE_FARBE: Record<Aufgabe["dringlichkeit"], Farbton> = {
  gefahr: "danger",
  warnung: "warning",
  info: "info",
};

/**
 * Aufgabenliste im AdminLTE-Todo-Stil. Im Prototyp merkt sich das Abhaken den Zustand nur lokal;
 * ab #008 setzt es den Rechnungsstatus in der Datenbank.
 */
export function TodoList({ aufgaben }: { aufgaben: Aufgabe[] }) {
  const [erledigt, setErledigt] = useState<string[]>([]);

  function umschalten(id: string) {
    setErledigt((alt) => (alt.includes(id) ? alt.filter((x) => x !== id) : [...alt, id]));
  }

  if (aufgaben.length === 0) {
    return <p className="text-body-secondary mb-0">Nichts zu tun – alle Punkte erledigt.</p>;
  }

  return (
    <ul className="pl-todo-list">
      {aufgaben.map((aufgabe) => {
        const istErledigt = erledigt.includes(aufgabe.id);
        return (
          <li
            key={aufgabe.id}
            className={`pl-todo-${aufgabe.dringlichkeit} ${istErledigt ? "pl-todo-erledigt" : ""}`}
          >
            <input
              type="checkbox"
              className="form-check-input mt-1 pl-touch-target"
              checked={istErledigt}
              onChange={() => umschalten(aufgabe.id)}
              aria-label={`${aufgabe.titel} erledigt`}
            />
            <div className="flex-grow-1 pl-todo-text">
              <Link href={aufgabe.href} className="fw-semibold text-decoration-none">
                {aufgabe.titel}
              </Link>
              <div className="small text-body-secondary">{aufgabe.detail}</div>
            </div>
            <Badge farbe={BADGE_FARBE[aufgabe.dringlichkeit]}>{aufgabe.badgeText}</Badge>
          </li>
        );
      })}
    </ul>
  );
}
