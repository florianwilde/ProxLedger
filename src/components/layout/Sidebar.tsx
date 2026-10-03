"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LogoMitSchriftzug } from "@/components/Logo";
import type { Rolle } from "@/generated/prisma/enums";
import { darf } from "@/server/auth/rollen";
import { menuSchliessen, useMenuOffen } from "./menuZustand";

interface MenuEintrag {
  href: string;
  titel: string;
  icon: string;
  badge?: { text: string; klasse: string };
}

export function Sidebar({
  hostsAnzahl,
  offeneRechnungspunkte,
  offeneWarnungen,
  benutzer,
  rolle,
}: {
  hostsAnzahl: number;
  offeneRechnungspunkte: number;
  offeneWarnungen: number;
  benutzer: string;
  rolle: Rolle;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [suche, setSuche] = useState("");
  const menuOffen = useMenuOffen();

  // Nach dem Navigieren hat das Menü seinen Zweck erfüllt – auf dem Handy verdeckt es sonst alles.
  useEffect(() => {
    menuSchliessen();
  }, [pathname]);

  // Escape schließt, wie bei jedem anderen Overlay auch.
  useEffect(() => {
    function taste(ereignis: KeyboardEvent) {
      if (ereignis.key === "Escape") menuSchliessen();
    }
    window.addEventListener("keydown", taste);
    return () => window.removeEventListener("keydown", taste);
  }, []);

  const haupt: MenuEintrag[] = [
    { href: "/", titel: "Dashboard", icon: "bi-speedometer2" },
    {
      href: "/hosts",
      titel: "Hosts",
      icon: "bi-hdd-stack",
      badge: { text: String(hostsAnzahl), klasse: "pl-bg-info" },
    },
    ...(rolle === "KUNDE" ? [] : [{ href: "/kunden", titel: "Kunden", icon: "bi-people" }]),
    {
      href: "/rechnungen",
      titel: "Rechnungen",
      icon: "bi-receipt",
      badge:
        offeneRechnungspunkte > 0
          ? { text: String(offeneRechnungspunkte), klasse: "pl-bg-danger" }
          : undefined,
    },
    { href: "/jahresbahn", titel: "Jahresbahn", icon: "bi-calendar3-range" },
    {
      href: "/warnungen",
      titel: "Warnungen",
      icon: "bi-bell",
      badge: offeneWarnungen > 0 ? { text: String(offeneWarnungen), klasse: "pl-bg-warning" } : undefined,
    },
  ];

  // Das Menü zeigt nur, was die Rolle auch darf. Der Schutz liegt trotzdem in den Seiten
  // und Aktionen selbst – ein ausgeblendeter Eintrag ist keine Zugriffskontrolle (#027).
  const einstellungen: MenuEintrag[] = [
    ...(darf(rolle, "betrieb")
      ? [
          { href: "/einstellungen/tokens", titel: "Agent-Tokens", icon: "bi-key" },
          { href: "/einstellungen/warnregeln", titel: "Warnregeln", icon: "bi-shield-exclamation" },
          { href: "/einstellungen/benachrichtigungen", titel: "Benachrichtigungen", icon: "bi-bell" },
        ]
      : []),
    ...(darf(rolle, "verwaltung")
      ? [
          { href: "/einstellungen/benutzer", titel: "Benutzer", icon: "bi-person-gear" },
          { href: "/einstellungen/audit", titel: "Protokoll", icon: "bi-list-check" },
          { href: "/einstellungen/system", titel: "System", icon: "bi-sliders" },
        ]
      : []),
    { href: "/einstellungen/passkeys", titel: "Meine Passkeys", icon: "bi-fingerprint" },
  ];

  function istAktiv(href: string) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  function sucheAbsenden(event: React.FormEvent) {
    event.preventDefault();
    if (suche.trim().length > 0) {
      router.push(`/hosts?q=${encodeURIComponent(suche.trim())}`);
    }
  }

  function eintrag(item: MenuEintrag) {
    return (
      <li className="nav-item" key={item.href}>
        <Link href={item.href} className={`nav-link pl-touch-target ${istAktiv(item.href) ? "active" : ""}`}>
          <i className={`nav-icon bi ${item.icon}`} aria-hidden="true" />
          <p className="ms-2 mb-0 flex-grow-1">{item.titel}</p>
          {item.badge ? (
            <span className={`nav-badge badge ${item.badge.klasse}`}>{item.badge.text}</span>
          ) : null}
        </Link>
      </li>
    );
  }

  return (
    <>
      {/* Fläche hinter dem Menü: antippen schließt. Ohne sie bleibt das Menü auf dem Handy stehen. */}
      {menuOffen ? (
        <button
          type="button"
          className="pl-menu-hintergrund d-lg-none"
          aria-label="Menü schließen"
          onClick={menuSchliessen}
        />
      ) : null}

      <aside className="app-sidebar shadow" data-bs-theme="dark">
      <div className="sidebar-brand d-flex align-items-center justify-content-between">
        <Link href="/" className="brand-link">
          <LogoMitSchriftzug variante="sidebar" groesse={34} />
        </Link>
        <button
          type="button"
          className="btn btn-link text-white d-lg-none pl-touch-target me-2"
          aria-label="Menü schließen"
          onClick={menuSchliessen}
        >
          <i className="bi bi-x-lg" aria-hidden="true" />
        </button>
      </div>

      <div className="pl-sidebar-user">
        <span className="pl-sidebar-user-avatar" aria-hidden="true">
          {benutzer.slice(0, 1)}
        </span>
        <span>
          <span className="d-block small text-white">{benutzer}</span>
          <span className="d-block small opacity-75">Administrator</span>
        </span>
      </div>

      <form className="pl-sidebar-search" role="search" onSubmit={sucheAbsenden}>
        <div className="input-group input-group-sm">
          <input
            type="search"
            className="form-control"
            placeholder="Suchen …"
            aria-label="Hosts, Kunden oder Rechnungen suchen"
            value={suche}
            onChange={(e) => setSuche(e.target.value)}
          />
          <button className="btn btn-primary" type="submit" aria-label="Suchen">
            <i className="bi bi-search" aria-hidden="true" />
          </button>
        </div>
      </form>

      <div className="sidebar-wrapper">
        <nav className="mt-2">
          <ul className="nav sidebar-menu flex-column" role="menu">
            {haupt.map(eintrag)}
            <li className="nav-header">Einstellungen</li>
            {einstellungen.map(eintrag)}
          </ul>
        </nav>
      </div>
      </aside>
    </>
  );
}
