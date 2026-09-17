import { describe, expect, it } from "vitest";
import { RateLimit } from "@/lib/ratelimit";
import { erzeugeToken, hashGleich, hashToken, tokenAusHeader } from "@/lib/tokens";
import { datumAusProxmox, statusAusProxmox } from "@/server/agent/schema";

describe("Tokens", () => {
  it("erzeugt eindeutige Tokens mit erkennbarem Präfix", () => {
    const a = erzeugeToken("host");
    const b = erzeugeToken("host");

    expect(a.klartext.startsWith("plx_h_")).toBe(true);
    expect(erzeugeToken("enrollment").klartext.startsWith("plx_e_")).toBe(true);
    expect(a.klartext).not.toBe(b.klartext);
    expect(a.praefix.length).toBe("plx_h_".length + 6);
  });

  it("hasht deterministisch und vergleicht ohne Zeitunterschiede", () => {
    const token = erzeugeToken("host");
    expect(hashToken(token.klartext)).toBe(token.hash);
    expect(hashToken(` ${token.klartext} `)).toBe(token.hash);
    expect(hashGleich(token.hash, token.hash)).toBe(true);
    expect(hashGleich(token.hash, hashToken("etwas anderes"))).toBe(false);
  });

  it("liest den Bearer-Token aus dem Header", () => {
    expect(tokenAusHeader("Bearer plx_h_abc")).toBe("plx_h_abc");
    expect(tokenAusHeader("bearer   plx_h_abc  ")).toBe("plx_h_abc");
    expect(tokenAusHeader("Basic abc")).toBeNull();
    expect(tokenAusHeader(null)).toBeNull();
  });
});

describe("Datums- und Statusumwandlung", () => {
  it("versteht die Formate von Proxmox", () => {
    expect(datumAusProxmox("2026-09-24")?.toISOString()).toBe("2026-09-24T00:00:00.000Z");
    expect(datumAusProxmox(1789610400)?.toISOString()).toBe("2026-09-17T02:00:00.000Z");
    expect(datumAusProxmox("1789610400")?.toISOString()).toBe("2026-09-17T02:00:00.000Z");
    expect(datumAusProxmox("2026-09-17T03:41:00Z")?.toISOString()).toBe("2026-09-17T03:41:00.000Z");
  });

  it("liefert null statt eines Fehlers bei unbrauchbaren Werten", () => {
    expect(datumAusProxmox(null)).toBeNull();
    expect(datumAusProxmox("")).toBeNull();
    expect(datumAusProxmox("kein datum")).toBeNull();
    expect(datumAusProxmox(undefined)).toBeNull();
  });

  it("bildet Proxmox-Status ab und fällt sonst auf UNKNOWN zurück", () => {
    expect(statusAusProxmox("active")).toBe("ACTIVE");
    expect(statusAusProxmox("NotFound")).toBe("NOTFOUND");
    expect(statusAusProxmox("expired")).toBe("EXPIRED");
    expect(statusAusProxmox("etwas neues")).toBe("UNKNOWN");
    expect(statusAusProxmox(null)).toBe("UNKNOWN");
  });
});

describe("Rate-Limit", () => {
  it("lässt die Kapazität zu und bremst danach", () => {
    const limit = new RateLimit(3, 1);
    const jetzt = Date.now();

    expect(limit.pruefe("a", jetzt).erlaubt).toBe(true);
    expect(limit.pruefe("a", jetzt).erlaubt).toBe(true);
    expect(limit.pruefe("a", jetzt).erlaubt).toBe(true);

    const abgelehnt = limit.pruefe("a", jetzt);
    expect(abgelehnt.erlaubt).toBe(false);
    expect(abgelehnt.wiederholenNach).toBeGreaterThan(0);

    // Anderer Schlüssel hat einen eigenen Eimer.
    expect(limit.pruefe("b", jetzt).erlaubt).toBe(true);
    // Nach einer Sekunde ist wieder ein Token verfügbar.
    expect(limit.pruefe("a", jetzt + 1000).erlaubt).toBe(true);
  });
});
