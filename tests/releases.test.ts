import { describe, expect, it } from "vitest";
import { changelogZerlegen, neuesteFassung, remoteZerlegen } from "../scripts/releases";

/** Zerlegung des CHANGELOG in Release-Abschnitte (#046) und Hilfen für GitHub und Gitea. */

const BEISPIEL = `# Changelog

Alle wesentlichen Änderungen.

## [Unreleased]

- noch nichts

## [1.0.0] – 2026-10-23

Erste stabile Fassung.

### Hinzugefügt
- Dies und das

## [0.27.1] – 2026-10-23

### Sicherheit
- Next.js angehoben
`;

describe("CHANGELOG zerlegen", () => {
  it("findet die Fassungen mit Datum", () => {
    const fassungen = changelogZerlegen(BEISPIEL);
    expect(fassungen.map((f) => f.tag)).toEqual(["v1.0.0", "v0.27.1"]);
    expect(fassungen[0].titel).toBe("1.0.0 – 2026-10-23");
  });

  it("übergeht „Unreleased“ – dazu gibt es kein Tag", () => {
    expect(changelogZerlegen(BEISPIEL).some((f) => f.tag.includes("Unreleased"))).toBe(false);
  });

  it("nimmt den Text bis zur nächsten Überschrift mit", () => {
    const [eins] = changelogZerlegen(BEISPIEL);
    expect(eins.text).toContain("Erste stabile Fassung.");
    expect(eins.text).toContain("### Hinzugefügt");
    expect(eins.text).not.toContain("0.27.1");
  });

  it("schneidet Leerzeilen an den Rändern ab", () => {
    const [eins] = changelogZerlegen(BEISPIEL);
    expect(eins.text.startsWith("Erste")).toBe(true);
    expect(eins.text.endsWith("Dies und das")).toBe(true);
  });

  it("kommt mit einem Changelog ohne Fassungen zurecht", () => {
    expect(changelogZerlegen("# Changelog\n\nNoch nichts veröffentlicht.\n")).toEqual([]);
  });
});

describe("neueste Fassung", () => {
  it("vergleicht Versionsnummern, nicht Zeichenketten", () => {
    const fassungen = ["v0.9.0", "v0.10.0", "v0.27.1"].map((tag) => ({
      tag,
      titel: tag,
      text: "",
      datum: null,
    }));
    expect(neuesteFassung(fassungen)).toBe("v0.27.1");
  });

  it("findet sie unabhängig von der Reihenfolge", () => {
    expect(neuesteFassung(changelogZerlegen(BEISPIEL))).toBe("v1.0.0");
  });

  it("liefert nichts ohne Fassungen", () => {
    expect(neuesteFassung([])).toBeNull();
  });
});

describe("Remote zerlegen", () => {
  it("erkennt ein GitHub-Remote", () => {
    expect(remoteZerlegen("https://github.com/florianwilde/ProxLedger")).toEqual({
      host: "github.com",
      repo: "florianwilde/ProxLedger",
    });
  });

  it("entfernt .git und Zugangsdaten", () => {
    expect(remoteZerlegen("https://nutzer:geheim@git.example.de/fw/ProxLedger.git\n")).toEqual({
      host: "git.example.de",
      repo: "fw/ProxLedger",
    });
  });

  it("lehnt SSH-Adressen ab", () => {
    expect(remoteZerlegen("git@github.com:florianwilde/ProxLedger.git")).toBeNull();
  });
});
