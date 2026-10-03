"use client";

import { useSyncExternalStore } from "react";

/**
 * Zustand des Seitenmenüs auf schmalen Bildschirmen (#034).
 *
 * AdminLTE bringt dafür eigenes JavaScript mit, das wir bewusst nicht einbinden – die Klasse
 * `sidebar-open` am `body` allein lässt sich aber nicht wieder loswerden: Kein Hintergrund zum
 * Antippen, kein Schließen beim Navigieren. Deshalb ein eigener, winziger Zustand, auf den
 * Kopfzeile und Menü gemeinsam hören.
 */

const SCHMAL = 992;

let offen = false;
const zuhoerer = new Set<() => void>();

function melden() {
  for (const ruf of zuhoerer) ruf();
}

/** Setzt die Klassen, die das AdminLTE-Stylesheet auswertet. */
function klassenSetzen() {
  const body = document.body;
  body.classList.toggle("sidebar-open", offen);
  // Auf schmalen Bildschirmen liegt das Menü über dem Inhalt; dahinter soll nichts mitscrollen.
  body.style.overflow = offen && window.innerWidth < SCHMAL ? "hidden" : "";
}

export function menuUmschalten() {
  if (window.innerWidth >= SCHMAL) {
    // Breiter Bildschirm: Das Menü bleibt stehen und wird nur schmaler.
    document.body.classList.toggle("sidebar-collapse");
    document.body.classList.remove("sidebar-open");
    return;
  }

  offen = !offen;
  document.body.classList.remove("sidebar-collapse");
  klassenSetzen();
  melden();
}

export function menuSchliessen() {
  if (!offen) return;
  offen = false;
  klassenSetzen();
  melden();
}

function abonnieren(ruf: () => void) {
  zuhoerer.add(ruf);
  return () => {
    zuhoerer.delete(ruf);
  };
}

export function useMenuOffen(): boolean {
  // Auf dem Server ist das Menü nie offen – sonst käme es beim ersten Rendern zu einem Unterschied.
  return useSyncExternalStore(
    abonnieren,
    () => offen,
    () => false,
  );
}
