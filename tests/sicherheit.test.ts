import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { herkunftStimmt } from "@/app/api/auth/anmelden/route";
import { eigeneAdresse } from "@/lib/adresse";
import type { GeleseneSitzung } from "@/lib/sitzung";
import { sitzungBewerten } from "@/server/auth/sitzungspflicht";

const sitzung = (ausgestelltAm: Date): GeleseneSitzung => ({
  benutzerId: "b1",
  email: "admin@example.de",
  name: "Administrator",
  herkunft: "passwort",
  ausgestelltAm,
});

const anfrage = (kopfzeilen: Record<string, string>) =>
  new Request("https://proxledger.example/api/auth/anmelden", { method: "POST", headers: kopfzeilen });

describe("Sitzungsprüfung", () => {
  const jetzt = new Date("2026-09-18T12:00:00Z");
  const aktiv = { aktiv: true, sitzungenUngueltigAb: null };

  it("lässt eine gültige Sitzung eines aktiven Kontos durch", () => {
    expect(sitzungBewerten(sitzung(jetzt), aktiv)).toEqual({ gueltig: true });
  });

  it("weist ab, wenn gar keine Sitzung da ist", () => {
    expect(sitzungBewerten(null, aktiv).gueltig).toBe(false);
  });

  it("weist ein gesperrtes Konto ab, obwohl das Token noch gilt", () => {
    const urteil = sitzungBewerten(sitzung(jetzt), { aktiv: false, sitzungenUngueltigAb: null });
    expect(urteil).toEqual({ gueltig: false, grund: "Dieses Konto ist gesperrt." });
  });

  it("weist ein gelöschtes Konto ab", () => {
    expect(sitzungBewerten(sitzung(jetzt), null).gueltig).toBe(false);
  });

  it("beendet Sitzungen, die vor dem Widerruf ausgestellt wurden", () => {
    const widerruf = new Date("2026-09-18T13:00:00Z");
    const urteil = sitzungBewerten(sitzung(jetzt), { aktiv: true, sitzungenUngueltigAb: widerruf });
    expect(urteil.gueltig).toBe(false);
  });

  it("lässt Sitzungen gelten, die nach dem Widerruf entstanden sind", () => {
    const widerruf = new Date("2026-09-18T11:00:00Z");
    expect(sitzungBewerten(sitzung(jetzt), { aktiv: true, sitzungenUngueltigAb: widerruf })).toEqual({
      gueltig: true,
    });
  });
});

describe("Herkunft der Anmeldung", () => {
  it("lässt das eigene Formular durch", () => {
    expect(herkunftStimmt(anfrage({ origin: "https://proxledger.example", host: "proxledger.example" }))).toBe(true);
  });

  it("weist eine fremde Seite ab", () => {
    expect(herkunftStimmt(anfrage({ origin: "https://boese.example", host: "proxledger.example" }))).toBe(false);
  });

  it("weist einen unbrauchbaren Origin ab", () => {
    expect(herkunftStimmt(anfrage({ origin: "kein-url", host: "proxledger.example" }))).toBe(false);
  });

  it("lässt Anfragen ohne Origin zu (curl, alte Browser)", () => {
    expect(herkunftStimmt(anfrage({ host: "proxledger.example" }))).toBe(true);
  });

  it("erkennt den Host hinter einem Reverse Proxy", () => {
    expect(
      herkunftStimmt(anfrage({ origin: "https://dashboard.kunde.de", "x-forwarded-host": "dashboard.kunde.de" })),
    ).toBe(true);
  });
});

describe("Öffentliche Adresse", () => {
  // APP_URL kommt sonst aus der .env der Entwicklungsumgebung und verfälscht die Rückfallstufen.
  beforeEach(() => {
    vi.stubEnv("APP_URL", "");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  const anfrageMit = (kopfzeilen: Record<string, string>) =>
    new Request("http://0a5963a591df:3000/api/auth/anmelden", { method: "POST", headers: kopfzeilen });

  it("nimmt die eingetragene Adresse, nicht die interne des Containers", () => {
    const adresse = eigeneAdresse(anfrageMit({}), "/hosts", "https://proxledger.example.de");
    expect(adresse.toString()).toBe("https://proxledger.example.de/hosts");
  });

  it("fällt auf die Kopfzeilen des Reverse Proxy zurück", () => {
    const anfrage = anfrageMit({ "x-forwarded-host": "dashboard.kunde.de", "x-forwarded-proto": "https" });
    expect(eigeneAdresse(anfrage, "/").toString()).toBe("https://dashboard.kunde.de/");
  });

  it("nimmt notfalls die Anfrage selbst", () => {
    expect(eigeneAdresse(anfrageMit({}), "/").host).toBe("0a5963a591df:3000");
  });

  it("übergeht eine Lausch-Adresse in der Konfiguration", () => {
    // 0.0.0.0 heißt „alle Schnittstellen“ – als Ziel im Browser ist das unbrauchbar.
    // Genau so stand es nach einer Installation in der .env und führte beim Abmelden ins Leere.
    const anfrage = anfrageMit({ host: "proxledger.firma.de" });
    expect(eigeneAdresse(anfrage, "/login", "http://0.0.0.0:3000").host).toBe("proxledger.firma.de");
  });

  it("übergeht auch eine Lausch-Adresse aus der Umgebung", () => {
    vi.stubEnv("APP_URL", "http://0.0.0.0:3000");
    const anfrage = anfrageMit({ host: "proxledger.firma.de" });
    expect(eigeneAdresse(anfrage, "/login").host).toBe("proxledger.firma.de");
  });

  it("übergeht einen unbrauchbaren Eintrag, statt zu scheitern", () => {
    const anfrage = anfrageMit({ "x-forwarded-host": "dashboard.kunde.de" });
    expect(eigeneAdresse(anfrage, "/", "keine-adresse").host).toBe("dashboard.kunde.de");
  });
});
