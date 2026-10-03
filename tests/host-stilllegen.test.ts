import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { datenbankLeeren, datenbankVerfuegbar, testPrisma } from "./helpers/db";

/** Hosts stilllegen statt löschen – und löschen nur, wenn nichts daran hängt (#041). */
vi.mock("@/server/auth/sitzungspflicht", () => ({
  sitzungErforderlich: async () => ({ benutzerId: "test", rolle: "ADMIN", kundeId: null }),
  sichtbarerKunde: async () => null,
  darfEinkaufSehen: async () => true,
  angemeldet: async () => null,
}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("next/navigation", () => ({ redirect: () => {} }));

const { hostArchivieren, hostLoeschen } = await import("@/server/actions/hosts");
const { hostListe } = await import("@/server/queries/hostliste");

function formular(werte: Record<string, string>) {
  const daten = new FormData();
  for (const [name, wert] of Object.entries(werte)) daten.set(name, wert);
  return daten;
}

async function host(hostname = "hv-pve-01") {
  return testPrisma.host.create({ data: { agentId: `a-${hostname}`, hostname, produkt: "PVE" } });
}

describe.runIf(datenbankVerfuegbar)("Hosts stilllegen", () => {
  beforeEach(async () => {
    await datenbankLeeren();
  });

  afterAll(async () => {
    await testPrisma.$disconnect();
  });

  it("nimmt einen stillgelegten Host aus der Liste", async () => {
    const h = await host();
    expect((await hostListe({})).gesamt).toBe(1);

    await hostArchivieren(formular({ hostId: h.id }));

    expect((await hostListe({})).gesamt).toBe(0);
    expect((await hostListe({ archiviert: "ja" })).gesamt).toBe(1);
  });

  it("schließt beim Stilllegen die offenen Warnungen", async () => {
    const h = await host();
    await testPrisma.alert.create({
      data: {
        regel: "status-nicht-aktiv",
        fingerprint: `status-nicht-aktiv:${h.id}`,
        schwere: "WARNUNG",
        titel: "Keine Subscription gefunden",
        beschreibung: "…",
        hostId: h.id,
      },
    });

    await hostArchivieren(formular({ hostId: h.id }));

    const alert = await testPrisma.alert.findFirstOrThrow({ where: { hostId: h.id } });
    expect(alert.erledigtAm).not.toBeNull();
  });

  it("nimmt einen Host auf Wunsch wieder auf", async () => {
    const h = await host();
    await hostArchivieren(formular({ hostId: h.id }));
    await hostArchivieren(formular({ hostId: h.id }));

    expect((await hostListe({})).gesamt).toBe(1);
  });

  it("löscht einen Host ohne Laufzeiten", async () => {
    const h = await host();
    await hostLoeschen(formular({ hostId: h.id }));

    expect(await testPrisma.host.count()).toBe(0);
  });

  it("löscht keinen Host, an dem eine Laufzeit hängt", async () => {
    const h = await host();
    await testPrisma.laufzeit.create({
      data: {
        hostId: h.id,
        key: "pve1c-aaaa",
        start: new Date("2026-01-01"),
        ende: new Date("2026-12-31"),
        status: "BESTAETIGT",
      },
    });

    await hostLoeschen(formular({ hostId: h.id }));

    // Buchhaltung bleibt: Der Host ist noch da und lässt sich nur stilllegen.
    expect(await testPrisma.host.count()).toBe(1);
  });
});
