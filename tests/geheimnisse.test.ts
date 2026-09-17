import { beforeEach, describe, expect, it } from "vitest";
import { entschluesseln, GeheimnisFehler, istVerschluesselt, verschluesseln } from "@/lib/geheimnisse";

const SCHLUESSEL = "test-geheimnis-mit-mindestens-32-zeichen!!";

describe("Geheimnisse", () => {
  beforeEach(() => {
    process.env.APP_SECRET = SCHLUESSEL;
  });

  it("verschlüsselt und entschlüsselt einen Wert", () => {
    const klartext = "sehr-geheimes-smtp-passwort";
    const chiffrat = verschluesseln(klartext);

    expect(chiffrat).not.toContain(klartext);
    expect(istVerschluesselt(chiffrat)).toBe(true);
    expect(entschluesseln(chiffrat)).toBe(klartext);
  });

  it("erzeugt bei gleichem Klartext unterschiedliche Chiffrate", () => {
    // Ein zufälliger Nonce verhindert, dass gleiche Passwörter erkennbar sind.
    expect(verschluesseln("gleich")).not.toBe(verschluesseln("gleich"));
  });

  it("lässt Klartext aus der Zeit vor der Verschlüsselung unverändert durch", () => {
    expect(istVerschluesselt("altes-passwort")).toBe(false);
    expect(entschluesseln("altes-passwort")).toBe("altes-passwort");
  });

  it("behandelt leere Werte", () => {
    expect(verschluesseln("")).toBe("");
    expect(entschluesseln("")).toBe("");
  });

  it("meldet einen geänderten Schlüssel verständlich", () => {
    const chiffrat = verschluesseln("geheim");
    process.env.APP_SECRET = "ein-voellig-anderes-geheimnis-mit-32-z!";

    expect(() => entschluesseln(chiffrat)).toThrow(GeheimnisFehler);
    expect(() => entschluesseln(chiffrat)).toThrow(/APP_SECRET/);
  });

  it("erkennt Manipulation am Chiffrat", () => {
    const chiffrat = verschluesseln("geheim");
    const [praefix, nonce, authTag, daten] = chiffrat.split(":");
    const veraendert = [praefix, nonce, authTag, `${daten.slice(0, -2)}xy`].join(":");

    expect(() => entschluesseln(veraendert)).toThrow(GeheimnisFehler);
  });

  it("verlangt einen ausreichend langen Schlüssel", () => {
    process.env.APP_SECRET = "kurz";
    expect(() => verschluesseln("geheim")).toThrow(/APP_SECRET/);
  });
});
