import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { hash } from "@node-rs/argon2";
import { cookieOptionen, sitzungErzeugen, sitzungLesen } from "@/lib/sitzung";
import { AnmeldeFehler, anmeldeRateLimit, mitOidcAnmelden, mitPasswortAnmelden } from "@/server/auth/benutzer";
import { datenbankLeeren, datenbankVerfuegbar, testPrisma } from "./helpers/db";

const GEHEIMNIS = "test-geheimnis-mit-mindestens-32-zeichen!!";

describe("Sitzungen", () => {
  beforeEach(() => {
    process.env.APP_SECRET = GEHEIMNIS;
  });

  it("erzeugt ein Token und liest es wieder", async () => {
    const token = await sitzungErzeugen({
      benutzerId: "b1",
      email: "admin@example.de",
      name: "Florian",
      herkunft: "passwort",
    });

    const sitzung = await sitzungLesen(token);
    expect(sitzung).toEqual({
      benutzerId: "b1",
      email: "admin@example.de",
      name: "Florian",
      herkunft: "passwort",
    });
  });

  it("weist ein verändertes oder fremd signiertes Token ab", async () => {
    const token = await sitzungErzeugen({
      benutzerId: "b1",
      email: "admin@example.de",
      name: "Florian",
      herkunft: "passwort",
    });

    expect(await sitzungLesen(`${token}x`)).toBeNull();

    process.env.APP_SECRET = "ein-ganz-anderes-geheimnis-mit-32-zeichen!";
    expect(await sitzungLesen(token)).toBeNull();
  });

  it("gibt bei fehlendem Token null zurück", async () => {
    expect(await sitzungLesen(undefined)).toBeNull();
    expect(await sitzungLesen("")).toBeNull();
  });

  it("verlangt einen ausreichend langen Schlüssel", async () => {
    process.env.APP_SECRET = "zu-kurz";
    await expect(
      sitzungErzeugen({ benutzerId: "b1", email: "a@b.de", name: "A", herkunft: "passwort" }),
    ).rejects.toThrow(/APP_SECRET/);
  });

  it("setzt das Cookie nur über HTTPS, wenn produktiv gebaut wurde", () => {
    expect(cookieOptionen().httpOnly).toBe(true);
    expect(cookieOptionen().sameSite).toBe("lax");
  });
});

describe.runIf(datenbankVerfuegbar)("Anmeldung", () => {
  beforeEach(async () => {
    await datenbankLeeren();
    anmeldeRateLimit.zuruecksetzen();
    process.env.APP_SECRET = GEHEIMNIS;
  });

  afterAll(async () => {
    await testPrisma.$disconnect();
  });

  async function admin(passwort = "geheim1234") {
    return testPrisma.benutzer.create({
      data: {
        email: "admin@example.de",
        name: "Florian",
        passwortHash: await hash(passwort),
      },
    });
  }

  it("meldet mit richtigem Passwort an und vermerkt den Zeitpunkt", async () => {
    const benutzer = await admin();
    const angemeldet = await mitPasswortAnmelden("admin@example.de", "geheim1234", "1.2.3.4");

    expect(angemeldet.id).toBe(benutzer.id);
    const danach = await testPrisma.benutzer.findUniqueOrThrow({ where: { id: benutzer.id } });
    expect(danach.letzterLoginAm).not.toBeNull();

    const protokoll = await testPrisma.auditEintrag.findFirst({ where: { aktion: "anmeldung.erfolgreich" } });
    expect(protokoll).not.toBeNull();
  });

  it("lehnt falsches Passwort ab und protokolliert den Versuch", async () => {
    await admin();
    await expect(mitPasswortAnmelden("admin@example.de", "falsch", "1.2.3.4")).rejects.toThrow(AnmeldeFehler);

    const protokoll = await testPrisma.auditEintrag.findFirst({ where: { aktion: "anmeldung.fehlgeschlagen" } });
    expect(protokoll).not.toBeNull();
  });

  it("nennt bei unbekannter Adresse denselben Grund wie bei falschem Passwort", async () => {
    await admin();
    const unbekannt = await mitPasswortAnmelden("niemand@example.de", "x", "1.2.3.4").catch((f) => f);
    const falsch = await mitPasswortAnmelden("admin@example.de", "falsch", "1.2.3.4").catch((f) => f);

    expect(unbekannt.message).toBe(falsch.message);
  });

  it("lehnt deaktivierte Konten ab", async () => {
    const benutzer = await admin();
    await testPrisma.benutzer.update({ where: { id: benutzer.id }, data: { aktiv: false } });

    await expect(mitPasswortAnmelden("admin@example.de", "geheim1234", "1.2.3.4")).rejects.toThrow(
      AnmeldeFehler,
    );
  });

  it("bremst nach fünf Fehlversuchen", async () => {
    await admin();
    for (let i = 0; i < 5; i++) {
      await mitPasswortAnmelden("admin@example.de", "falsch", "9.9.9.9").catch(() => undefined);
    }

    await expect(mitPasswortAnmelden("admin@example.de", "geheim1234", "9.9.9.9")).rejects.toThrow(
      /Zu viele Versuche/,
    );
  });

  it("verknüpft eine OIDC-Anmeldung mit dem vorhandenen Konto", async () => {
    const benutzer = await admin();
    const angemeldet = await mitOidcAnmelden("subject-1", "admin@example.de", "Florian Wilde");

    expect(angemeldet.id).toBe(benutzer.id);
    expect(angemeldet.oidcSubject).toBe("subject-1");
    expect(await testPrisma.benutzer.count()).toBe(1);
  });

  it("legt bei unbekannter OIDC-Anmeldung ein Konto an", async () => {
    const angemeldet = await mitOidcAnmelden("subject-2", "Neu@example.de", "Neue Person");

    expect(angemeldet.email).toBe("neu@example.de");
    expect(angemeldet.passwortHash).toBeNull();
    expect(await testPrisma.benutzer.count()).toBe(1);
  });

  it("erkennt dieselbe Subject-ID wieder, auch wenn sich die E-Mail ändert", async () => {
    const erst = await mitOidcAnmelden("subject-3", "alt@example.de", "Person");
    const wieder = await mitOidcAnmelden("subject-3", "neu@example.de", "Person");

    expect(wieder.id).toBe(erst.id);
    expect(await testPrisma.benutzer.count()).toBe(1);
  });
});
