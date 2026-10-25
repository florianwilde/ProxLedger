import { describe, expect, it } from "vitest";
import { changelogZerlegen } from "../scripts/gitea-releases";

/** Zerlegung des CHANGELOG in Release-Abschnitte (#046). */

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
