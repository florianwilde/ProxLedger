"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { statusUmschalten } from "@/server/actions/rechnungen";
import { Badge } from "./Badges";
import type { Farbton } from "./SmallBox";

export interface Aufgabe {
  id: string;
  titel: string;
  detail: string;
  dringlichkeit: "gefahr" | "warnung" | "info";
  badgeText: string;
  href: string;
  /** Gesetzt, wenn das Abhaken direkt einen Rechnungsstatus setzt. */
  aktion?: {
    laufzeitId: string;
    hostId: string;
    feld: "einkaufBezahlt" | "verkaufErstellt";
  };
}

const BADGE_FARBE: Record<Aufgabe["dringlichkeit"], Farbton> = {
  gefahr: "danger",
  warnung: "warning",
  info: "info",
};

/**
 * Aufgabenliste im AdminLTE-Todo-Stil. Aufgaben mit `aktion` setzen beim Abhaken den
 * Rechnungsstatus in der Datenbank; die übrigen sind Merkposten und verschwinden erst,
 * wenn die Ursache behoben ist (z. B. ein Host einem Kunden zugewiesen wurde).
 */
export function TodoList({ aufgaben }: { aufgaben: Aufgabe[] }) {
  const [oertlichErledigt, setOertlichErledigt] = useState<string[]>([]);
  const [laeuft, starte] = useTransition();

  function umschalten(aufgabe: Aufgabe) {
    if (!aufgabe.aktion) {
      setOertlichErledigt((alt) =>
        alt.includes(aufgabe.id) ? alt.filter((x) => x !== aufgabe.id) : [...alt, aufgabe.id],
      );
      return;
    }

    const daten = new FormData();
    daten.set("laufzeitId", aufgabe.aktion.laufzeitId);
    daten.set("hostId", aufgabe.aktion.hostId);
    daten.set("feld", aufgabe.aktion.feld);
    daten.set("wert", "true");
    starte(async () => {
      await statusUmschalten(daten);
    });
  }

  if (aufgaben.length === 0) {
    return <p className="text-body-secondary mb-0">Nichts zu tun – alle Punkte erledigt.</p>;
  }

  return (
    <ul className="pl-todo-list">
      {aufgaben.map((aufgabe) => {
        const istErledigt = oertlichErledigt.includes(aufgabe.id);
        return (
          <li
            key={aufgabe.id}
            className={`pl-todo-${aufgabe.dringlichkeit} ${istErledigt ? "pl-todo-erledigt" : ""}`}
          >
            <input
              type="checkbox"
              className="form-check-input mt-1 pl-touch-target"
              checked={istErledigt}
              disabled={laeuft}
              onChange={() => umschalten(aufgabe)}
              aria-label={
                aufgabe.aktion ? `${aufgabe.titel} als erledigt eintragen` : `${aufgabe.titel} abhaken`
              }
              title={aufgabe.aktion ? "Setzt den Rechnungsstatus" : "Nur zur eigenen Übersicht"}
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
