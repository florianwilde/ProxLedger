import { describe, expect, it } from "vitest";
import { domaeneErlaubt, einstellungenSchema, onCalendar, VORGABEN } from "@/server/einstellungen";

describe("Einstellungen", () => {
  it("füllt fehlende Werte mit den Vorgaben", () => {
    const werte = einstellungenSchema.parse({});
    expect(werte.steuersatz).toBe(19);
    expect(werte.sitzungsdauerStunden).toBe(12);
    expect(werte.agentRhythmus).toBe("taeglich");
    expect(werte.oidcKontenAnlegen).toBe(true);
  });

  it("übernimmt gesetzte Werte und lässt den Rest auf Vorgabe", () => {
    const werte = einstellungenSchema.parse({ steuersatz: 7.7, waehrung: "CHF" });
    expect(werte.steuersatz).toBe(7.7);
    expect(werte.waehrung).toBe("CHF");
    expect(werte.zahlungszielTage).toBe(VORGABEN.zahlungszielTage);
  });

  it("weist unsinnige Werte ab", () => {
    expect(einstellungenSchema.safeParse({ steuersatz: 250 }).success).toBe(false);
    expect(einstellungenSchema.safeParse({ sitzungsdauerStunden: 0 }).success).toBe(false);
    expect(einstellungenSchema.safeParse({ dashboardUrl: "kein-url" }).success).toBe(false);
    expect(einstellungenSchema.safeParse({ anmeldeversuche: 1 }).success).toBe(false);
  });

  it("legt neue OIDC-Konten nicht als Administrator an", () => {
    // Die Vorgabe ist sicherheitsrelevant: Wer sich beim Anbieter anmelden kann, soll nicht
    // automatisch alles dürfen.
    expect(einstellungenSchema.parse({}).oidcStandardRolle).toBe("TECHNIKER");
  });

  it("lässt eine leere Dashboard-Adresse zu (dann gilt die Umgebung)", () => {
    expect(einstellungenSchema.parse({ dashboardUrl: "" }).dashboardUrl).toBe("");
  });

  it("übersetzt den Rhythmus nach systemd", () => {
    expect(onCalendar("taeglich")).toBe("daily");
    expect(onCalendar("stuendlich")).toBe("hourly");
    expect(onCalendar("zwoelfstuendlich")).toBe("0/12:00:00");
  });
});

describe("Erlaubte OIDC-Domänen", () => {
  it("lässt ohne Angabe jede Domäne zu", () => {
    expect(domaeneErlaubt("wer@auch-immer.de", "")).toBe(true);
  });

  it("lässt nur die genannten Domänen zu", () => {
    expect(domaeneErlaubt("fw@wilde-server.de", "wilde-server.de")).toBe(true);
    expect(domaeneErlaubt("fremd@example.com", "wilde-server.de")).toBe(false);
  });

  it("versteht mehrere Domänen, Leerzeichen und führendes @", () => {
    const liste = " @wilde-server.de, kunde.de ";
    expect(domaeneErlaubt("a@kunde.de", liste)).toBe(true);
    expect(domaeneErlaubt("b@WILDE-SERVER.DE", liste)).toBe(true);
    expect(domaeneErlaubt("c@fremd.de", liste)).toBe(false);
  });

  it("weist eine Adresse ohne Domäne ab", () => {
    expect(domaeneErlaubt("kaputt", "kunde.de")).toBe(false);
  });
});
