"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { LogoMitSchriftzug } from "@/components/Logo";

interface MenuEintrag {
  href: string;
  titel: string;
  icon: string;
  badge?: { text: string; klasse: string };
}

export function Sidebar({
  hostsAnzahl,
  offeneRechnungspunkte,
  benutzer,
}: {
  hostsAnzahl: number;
  offeneRechnungspunkte: number;
  benutzer: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [suche, setSuche] = useState("");

  const haupt: MenuEintrag[] = [
    { href: "/", titel: "Dashboard", icon: "bi-speedometer2" },
    {
      href: "/hosts",
      titel: "Hosts",
      icon: "bi-hdd-stack",
      badge: { text: String(hostsAnzahl), klasse: "pl-bg-info" },
    },
    { href: "/kunden", titel: "Kunden", icon: "bi-people" },
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
  ];

  const einstellungen: MenuEintrag[] = [
    { href: "/einstellungen/tokens", titel: "Agent-Tokens", icon: "bi-key" },
    { href: "/einstellungen/benachrichtigungen", titel: "Benachrichtigungen", icon: "bi-bell" },
    { href: "/einstellungen/system", titel: "System", icon: "bi-sliders" },
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
    <aside className="app-sidebar shadow" data-bs-theme="dark">
      <div className="sidebar-brand">
        <Link href="/" className="brand-link">
          <LogoMitSchriftzug variante="sidebar" groesse={34} />
        </Link>
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
  );
}
