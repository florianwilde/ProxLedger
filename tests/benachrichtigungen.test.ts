import { createHmac } from "node:crypto";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { verschluesseln } from "@/lib/geheimnisse";
import { konfigurationLesen, perWebhookSenden, VersandFehler } from "@/server/notifications/kanaele";
import { alertNachricht, zusammenfassungNachricht } from "@/server/notifications/nachrichten";
import { neueAlertsMelden, zusammenfassungSenden } from "@/server/notifications/versand";
import { datenbankLeeren, datenbankVerfuegbar, testPrisma } from "./helpers/db";

const APP_URL = "https://proxledger.example.de";

describe("Nachrichten", () => {
  it("baut eine Warnungs-Nachricht mit Betreff, Text und Daten", () => {
    const nachricht = alertNachricht(
      {
        id: "a1",
        regel: "subscription-laeuft-ab",
        schwere: "GEFAHR",
        titel: "Subscription läuft in 7 Tagen ab",
        beschreibung: "pve-01 · Brandl GmbH",
        hostId: "h1",
      },
      APP_URL,
    );

    expect(nachricht.betreff).toBe("[ProxLedger] Gefahr: Subscription läuft in 7 Tagen ab");
    expect(nachricht.text).toContain("pve-01 · Brandl GmbH");
    expect(nachricht.text).toContain(`${APP_URL}/warnungen`);
    expect(nachricht.html).toContain("ProxLedger");
    expect(nachricht.daten).toMatchObject({ art: "warnung", alertId: "a1", schwere: "GEFAHR" });
  });

  it("baut eine Zusammenfassung mit Kennzahlen", () => {
    const nachricht = zusammenfassungNachricht(
      {
        zeitraum: "taeglich",
        offeneAlerts: [
          {
            id: "a1",
            regel: "keine-meldung",
            schwere: "WARNUNG",
            titel: "Host meldet sich nicht",
            beschreibung: "pve-02",
            hostId: "h2",
          },
        ],
        neueAlerts: [],
        baldAblaufend: [{ hostname: "pve-01", kunde: "Brandl GmbH", datum: new Date("2026-09-24"), tage: 7 }],
        offeneRechnungspunkte: 3,
        hostsOhneMeldung: 1,
      },
      APP_URL,
    );

    expect(nachricht.betreff).toBe("[ProxLedger] Tagesübersicht: 1 offene Warnungen");
    expect(nachricht.text).toContain("Offene Rechnungspunkte: 3");
    expect(nachricht.text).toContain("pve-01 (Brandl GmbH) – 24.09.2026, in 7 Tagen");
    expect(nachricht.daten).toMatchObject({ art: "zusammenfassung", zeitraum: "taeglich" });
  });
});

describe("Webhook", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("schickt JSON und signiert es mit dem Geheimnis", async () => {
    const aufrufe: { url: string; optionen: RequestInit }[] = [];
    vi.stubGlobal("fetch", async (url: string, optionen: RequestInit) => {
      aufrufe.push({ url, optionen });
      return new Response("ok", { status: 200 });
    });

    const nachricht = alertNachricht(
      {
        id: "a1",
        regel: "status-nicht-aktiv",
        schwere: "GEFAHR",
        titel: "Subscription abgelaufen",
        beschreibung: "pve-01",
        hostId: "h1",
      },
      APP_URL,
    );

    await perWebhookSenden({ url: "https://hook.example.de/x", geheimnis: "s3cret" }, nachricht);

    expect(aufrufe).toHaveLength(1);
    const kopfzeilen = aufrufe[0].optionen.headers as Record<string, string>;
    const koerper = aufrufe[0].optionen.body as string;

    expect(kopfzeilen["Content-Type"]).toBe("application/json");
    expect(JSON.parse(koerper)).toMatchObject({ art: "warnung", regel: "status-nicht-aktiv" });
    expect(kopfzeilen["X-ProxLedger-Signatur"]).toBe(
      `sha256=${createHmac("sha256", "s3cret").update(koerper).digest("hex")}`,
    );
  });

  it("signiert ohne Geheimnis nicht", async () => {
    const aufrufe: RequestInit[] = [];
    vi.stubGlobal("fetch", async (_url: string, optionen: RequestInit) => {
      aufrufe.push(optionen);
      return new Response("ok", { status: 200 });
    });

    await perWebhookSenden(
      { url: "https://hook.example.de/x" },
      { betreff: "t", text: "t", html: "t", daten: {} },
    );

    expect((aufrufe[0].headers as Record<string, string>)["X-ProxLedger-Signatur"]).toBeUndefined();
  });

  it("meldet einen Fehlerstatus des Empfängers", async () => {
    vi.stubGlobal("fetch", async () => new Response("nope", { status: 500 }));

    await expect(
      perWebhookSenden(
        { url: "https://hook.example.de/x" },
        { betreff: "t", text: "t", html: "t", daten: {} },
      ),
    ).rejects.toThrow(VersandFehler);
  });
});

describe.runIf(datenbankVerfuegbar)("Versand", () => {
  beforeEach(async () => {
    await datenbankLeeren();
    vi.stubGlobal("fetch", async () => new Response("ok", { status: 200 }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    await testPrisma.$disconnect();
  });

  async function webhookKanal() {
    return testPrisma.benachrichtigungskanal.create({
      data: {
        typ: "WEBHOOK",
        name: "Test-Hook",
        aktiv: true,
        konfiguration: { url: "https://hook.example.de/x" },
      },
    });
  }

  async function alert(fingerprint = "status-nicht-aktiv:h1") {
    return testPrisma.alert.create({
      data: {
        fingerprint,
        regel: "status-nicht-aktiv",
        schwere: "GEFAHR",
        titel: "Subscription abgelaufen",
        beschreibung: "pve-01",
      },
    });
  }

  it("verschickt eine Warnung und protokolliert den Versand", async () => {
    await webhookKanal();
    const eintrag = await alert();

    const ergebnis = await neueAlertsMelden([eintrag.fingerprint]);

    expect(ergebnis.gesendet).toBe(1);
    const protokoll = await testPrisma.benachrichtigung.findMany();
    expect(protokoll).toHaveLength(1);
    expect(protokoll[0].status).toBe("GESENDET");
    expect(protokoll[0].alertId).toBe(eintrag.id);
  });

  it("meldet denselben offenen Alert kein zweites Mal", async () => {
    await webhookKanal();
    const eintrag = await alert();

    await neueAlertsMelden([eintrag.fingerprint]);
    const zweiter = await neueAlertsMelden([eintrag.fingerprint]);

    expect(zweiter.gesendet).toBe(0);
    expect(zweiter.uebersprungen).toBe(1);
    expect(await testPrisma.benachrichtigung.count({ where: { status: "GESENDET" } })).toBe(1);
  });

  it("verschickt nichts, solange kein Kanal eingerichtet ist", async () => {
    const eintrag = await alert();
    const ergebnis = await neueAlertsMelden([eintrag.fingerprint]);

    expect(ergebnis.gesendet).toBe(0);
    expect(await testPrisma.benachrichtigung.count()).toBe(0);
  });

  it("protokolliert einen fehlgeschlagenen Versand mit Grund", async () => {
    await webhookKanal();
    const eintrag = await alert();
    vi.stubGlobal("fetch", async () => new Response("kaputt", { status: 503 }));

    const ergebnis = await neueAlertsMelden([eintrag.fingerprint]);

    expect(ergebnis.fehlgeschlagen).toBe(1);
    const protokoll = await testPrisma.benachrichtigung.findFirstOrThrow();
    expect(protokoll.status).toBe("FEHLGESCHLAGEN");
    expect(protokoll.fehler).toContain("503");
  });

  it("versucht einen fehlgeschlagenen Versand beim nächsten Lauf erneut", async () => {
    await webhookKanal();
    const eintrag = await alert();

    vi.stubGlobal("fetch", async () => new Response("kaputt", { status: 503 }));
    await neueAlertsMelden([eintrag.fingerprint]);

    vi.stubGlobal("fetch", async () => new Response("ok", { status: 200 }));
    const zweiter = await neueAlertsMelden([eintrag.fingerprint]);

    expect(zweiter.gesendet).toBe(1);
  });

  it("nutzt ein verschlüsselt gespeichertes Webhook-Geheimnis für die Signatur", async () => {
    process.env.APP_SECRET = "test-geheimnis-mit-mindestens-32-zeichen!!";

    const aufrufe: RequestInit[] = [];
    vi.stubGlobal("fetch", async (_url: string, optionen: RequestInit) => {
      aufrufe.push(optionen);
      return new Response("ok", { status: 200 });
    });

    await testPrisma.benachrichtigungskanal.create({
      data: {
        typ: "WEBHOOK",
        name: "Signierter Hook",
        aktiv: true,
        konfiguration: { url: "https://hook.example.de/x", geheimnis: verschluesseln("s3cret") },
      },
    });
    const eintrag = await alert();

    await neueAlertsMelden([eintrag.fingerprint]);

    const kopfzeilen = aufrufe[0].headers as Record<string, string>;
    const koerper = aufrufe[0].body as string;
    expect(kopfzeilen["X-ProxLedger-Signatur"]).toBe(
      `sha256=${createHmac("sha256", "s3cret").update(koerper).digest("hex")}`,
    );

    // In der Datenbank steht kein Klartext.
    const gespeichert = await testPrisma.benachrichtigungskanal.findFirstOrThrow();
    expect(JSON.stringify(gespeichert.konfiguration)).not.toContain("s3cret");
  });

  it("liest Zugangsdaten aus der Zeit vor der Verschlüsselung weiter", () => {
    const konfiguration = konfigurationLesen("EMAIL", {
      host: "smtp.example.de",
      port: 587,
      secure: false,
      benutzer: "post",
      passwort: "alt-im-klartext",
      absender: "post@example.de",
      empfaenger: ["florian@example.de"],
    });

    expect((konfiguration as { passwort: string }).passwort).toBe("alt-im-klartext");
  });

  it("verschickt die Zusammenfassung mit den aktuellen Zahlen", async () => {
    await webhookKanal();
    await alert();

    const ergebnis = await zusammenfassungSenden("taeglich", new Date("2026-09-17T07:00:00Z"));

    expect(ergebnis.gesendet).toBe(1);
    const protokoll = await testPrisma.benachrichtigung.findFirstOrThrow();
    expect(protokoll.betreff).toContain("Tagesübersicht");
    // Die Zusammenfassung hängt an keinem einzelnen Alert.
    expect(protokoll.alertId).toBeNull();
  });
});
