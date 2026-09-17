import { beforeEach, afterAll, describe, expect, it } from "vitest";
import { agentRateLimit, enrollRateLimit } from "@/lib/ratelimit";
import { erzeugeToken, hashToken } from "@/lib/tokens";
import { POST as enrollPost } from "@/app/api/agent/v1/enroll/route";
import { GET as pingGet } from "@/app/api/agent/v1/ping/route";
import { POST as reportPost } from "@/app/api/agent/v1/report/route";
import { datenbankLeeren, datenbankVerfuegbar, testPrisma } from "./helpers/db";

/** Legt einen Enrollment-Token an und gibt den Klartext zurück. */
async function enrollmentTokenAnlegen(
  optionen: { gueltigBis?: Date; maxNutzungen?: number; kundeId?: string; widerrufen?: boolean } = {},
) {
  const token = erzeugeToken("enrollment");
  await testPrisma.enrollmentToken.create({
    data: {
      tokenHash: token.hash,
      praefix: token.praefix,
      bezeichnung: "Test",
      gueltigBis: optionen.gueltigBis ?? null,
      maxNutzungen: optionen.maxNutzungen ?? null,
      kundeId: optionen.kundeId ?? null,
      widerrufenAm: optionen.widerrufen ? new Date() : null,
    },
  });
  return token.klartext;
}

function anfrage(pfad: string, koerper: unknown, token?: string, methode = "POST") {
  return new Request(`http://localhost:3000${pfad}`, {
    method: methode,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      "x-forwarded-for": `10.0.0.${Math.ceil(Math.random() * 250)}`,
    },
    body: methode === "GET" ? undefined : JSON.stringify(koerper),
  });
}

const ENROLL_EINGABE = {
  agentId: "machine-id-abcdef0123456789",
  hostname: "pve-test-01",
  fqdn: "pve-test-01.example.local",
  produkt: "pve" as const,
  serverId: "AABBCCDDEEFF0011",
  agentVersion: "0.2.0",
};

/** Vollständiger Report, wie ihn der Agent auf einem PVE-Host erzeugt. */
function reportEingabe(überschreibungen: Record<string, unknown> = {}) {
  return {
    reportId: `report-${Math.random().toString(36).slice(2)}-0001`,
    agentVersion: "0.2.0",
    erhobenAm: "2026-09-17T03:41:00Z",
    host: {
      hostname: "pve-test-01",
      fqdn: "pve-test-01.example.local",
      ips: ["192.168.10.11", "10.20.0.11"],
      clusterName: "test-cluster",
      nodeName: "node01",
      kernel: "6.8.12-4-pve",
      uptimeSekunden: 4233600,
      cpuModell: "Intel(R) Xeon(R) E-2388G",
      sockets: 1,
      paketUpdates: 3,
    },
    produkt: { typ: "pve" as const, version: "pve-manager/8.3.2" },
    subscription: {
      key: "pve1c-a6bd21fcb6",
      status: "active",
      level: "c",
      productname: "Proxmox VE Community Subscription 1 CPU/year",
      sockets: 1,
      serverid: "AABBCCDDEEFF0011",
      regdate: "2025-09-24",
      nextduedate: "2026-09-24",
      checktime: 1789610400,
    },
    ...überschreibungen,
  };
}

async function registriereTestHost() {
  const enrollToken = await enrollmentTokenAnlegen();
  const antwort = await enrollPost(anfrage("/api/agent/v1/enroll", ENROLL_EINGABE, enrollToken));
  const daten = (await antwort.json()) as { hostId: string; token: string };
  return daten;
}

describe.runIf(datenbankVerfuegbar)("Agent-API", () => {
  beforeEach(async () => {
    await datenbankLeeren();
    agentRateLimit.zuruecksetzen();
    enrollRateLimit.zuruecksetzen();
  });

  afterAll(async () => {
    await testPrisma.$disconnect();
  });

  describe("Registrierung", () => {
    it("legt einen Host an und gibt genau einmal einen Token aus", async () => {
      const enrollToken = await enrollmentTokenAnlegen({ maxNutzungen: 3 });
      const antwort = await enrollPost(anfrage("/api/agent/v1/enroll", ENROLL_EINGABE, enrollToken));
      const daten = (await antwort.json()) as { ok: boolean; token: string; hostId: string };

      expect(antwort.status).toBe(201);
      expect(daten.token.startsWith("plx_h_")).toBe(true);

      const host = await testPrisma.host.findUnique({
        where: { id: daten.hostId },
        include: { tokens: true },
      });
      expect(host?.hostname).toBe("pve-test-01");
      expect(host?.produkt).toBe("PVE");

      // In der Datenbank darf nur der Hash liegen.
      expect(host?.tokens[0].tokenHash).toBe(hashToken(daten.token));
      expect(host?.tokens[0].tokenHash).not.toContain(daten.token);

      const verbraucht = await testPrisma.enrollmentToken.findFirst();
      expect(verbraucht?.nutzungen).toBe(1);
    });

    it("übernimmt die Kundenzuordnung aus dem Enrollment-Token", async () => {
      const kunde = await testPrisma.kunde.create({
        data: { name: "Zuordnung GmbH", kundennummer: "K-8001" },
      });
      const enrollToken = await enrollmentTokenAnlegen({ kundeId: kunde.id });

      const antwort = await enrollPost(anfrage("/api/agent/v1/enroll", ENROLL_EINGABE, enrollToken));
      const daten = (await antwort.json()) as { hostId: string };

      const host = await testPrisma.host.findUnique({ where: { id: daten.hostId } });
      expect(host?.kundeId).toBe(kunde.id);
    });

    it("erkennt einen bereits bekannten Agent und legt keinen zweiten Host an", async () => {
      const enrollToken = await enrollmentTokenAnlegen({ maxNutzungen: 5 });
      await enrollPost(anfrage("/api/agent/v1/enroll", ENROLL_EINGABE, enrollToken));
      const zweite = await enrollPost(anfrage("/api/agent/v1/enroll", ENROLL_EINGABE, enrollToken));
      const daten = (await zweite.json()) as { bestehenderHost: boolean };

      expect(zweite.status).toBe(200);
      expect(daten.bestehenderHost).toBe(true);
      expect(await testPrisma.host.count()).toBe(1);
    });

    it("meldet eine bereits bekannte Server-ID (Neuinstallation oder Klon)", async () => {
      const enrollToken = await enrollmentTokenAnlegen({ maxNutzungen: 5 });
      await enrollPost(anfrage("/api/agent/v1/enroll", ENROLL_EINGABE, enrollToken));

      const antwort = await enrollPost(
        anfrage(
          "/api/agent/v1/enroll",
          { ...ENROLL_EINGABE, agentId: "machine-id-9999999999999999", hostname: "pve-neu-01" },
          enrollToken,
        ),
      );
      const daten = (await antwort.json()) as { serverIdBereitsBekannt: boolean };
      expect(daten.serverIdBereitsBekannt).toBe(true);
    });

    it.each([
      ["fehlendem Token", async () => undefined, 401],
      ["unbekanntem Token", async () => "plx_e_unbekannt", 401],
      ["widerrufenem Token", async () => enrollmentTokenAnlegen({ widerrufen: true }), 401],
      ["abgelaufenem Token", async () => enrollmentTokenAnlegen({ gueltigBis: new Date("2020-01-01") }), 401],
      ["aufgebrauchtem Token", async () => enrollmentTokenAnlegen({ maxNutzungen: 0 }), 401],
    ])("weist Registrierung mit %s ab", async (_name, tokenErzeugen, status) => {
      const token = await tokenErzeugen();
      const antwort = await enrollPost(anfrage("/api/agent/v1/enroll", ENROLL_EINGABE, token));
      expect(antwort.status).toBe(status);
      expect(await testPrisma.host.count()).toBe(0);
    });

    it("lehnt unvollständige Eingaben mit 422 ab", async () => {
      const enrollToken = await enrollmentTokenAnlegen();
      const antwort = await enrollPost(
        anfrage("/api/agent/v1/enroll", { hostname: "ohne-agent-id" }, enrollToken),
      );
      expect(antwort.status).toBe(422);
      const daten = (await antwort.json()) as { code: string; felder: { feld: string }[] };
      expect(daten.code).toBe("validierung");
      expect(daten.felder.some((f) => f.feld === "agentId")).toBe(true);
    });
  });

  describe("Report", () => {
    it("übernimmt einen vollständigen Report und schlägt eine Laufzeit vor", async () => {
      const { hostId, token } = await registriereTestHost();

      const antwort = await reportPost(anfrage("/api/agent/v1/report", reportEingabe(), token));
      const daten = (await antwort.json()) as { ok: boolean; laufzeitVorschlag: boolean };

      expect(antwort.status).toBe(200);
      expect(daten.laufzeitVorschlag).toBe(true);

      const host = await testPrisma.host.findUniqueOrThrow({
        where: { id: hostId },
        include: { keyHistorie: true, serverIdHistorie: true, laufzeiten: true, reports: true },
      });

      expect(host.subStatus).toBe("ACTIVE");
      expect(host.subKey).toBe("pve1c-a6bd21fcb6");
      expect(host.subNextduedate?.toISOString().slice(0, 10)).toBe("2026-09-24");
      expect(host.ips).toEqual(["192.168.10.11", "10.20.0.11"]);
      expect(host.uptimeSekunden).toBe(BigInt(4233600));
      expect(host.keyHistorie).toHaveLength(1);
      expect(host.serverIdHistorie).toHaveLength(1);
      expect(host.reports).toHaveLength(1);

      const laufzeit = host.laufzeiten[0];
      expect(laufzeit.status).toBe("VORSCHLAG");
      expect(laufzeit.start.toISOString().slice(0, 10)).toBe("2026-09-24");
      expect(laufzeit.ende.toISOString().slice(0, 10)).toBe("2027-09-23");
    });

    it("nimmt einen Report an, in dem alle optionalen Felder fehlen", async () => {
      const { hostId, token } = await registriereTestHost();

      const antwort = await reportPost(
        anfrage(
          "/api/agent/v1/report",
          { reportId: "nur-pflichtfelder-0001", erhobenAm: "2026-09-17T03:41:00Z" },
          token,
        ),
      );

      expect(antwort.status).toBe(200);
      const host = await testPrisma.host.findUniqueOrThrow({ where: { id: hostId } });
      expect(host.subStatus).toBe("UNKNOWN");
      expect(host.subKey).toBeNull();
      expect(host.hostname).toBe("pve-test-01");
    });

    it("nimmt Reports mit null-Werten an und behandelt unbekannte Status als UNKNOWN", async () => {
      const { hostId, token } = await registriereTestHost();

      await reportPost(
        anfrage(
          "/api/agent/v1/report",
          reportEingabe({
            subscription: {
              key: null,
              status: "irgendwas-neues",
              level: null,
              productname: null,
              sockets: null,
              serverid: null,
              regdate: null,
              nextduedate: null,
              checktime: null,
            },
          }),
          token,
        ),
      );

      const host = await testPrisma.host.findUniqueOrThrow({ where: { id: hostId } });
      expect(host.subStatus).toBe("UNKNOWN");
      expect(host.subNextduedate).toBeNull();
    });

    it("verarbeitet denselben Report nur einmal", async () => {
      const { hostId, token } = await registriereTestHost();
      const eingabe = reportEingabe();

      await reportPost(anfrage("/api/agent/v1/report", eingabe, token));
      const zweite = await reportPost(anfrage("/api/agent/v1/report", eingabe, token));
      const daten = (await zweite.json()) as { doppelt: boolean };

      expect(daten.doppelt).toBe(true);
      expect(await testPrisma.report.count({ where: { hostId } })).toBe(1);
      expect(await testPrisma.laufzeit.count({ where: { hostId } })).toBe(1);
    });

    it("lässt einen nachgesendeten älteren Report den aktuellen Stand nicht überschreiben", async () => {
      const { hostId, token } = await registriereTestHost();

      await reportPost(anfrage("/api/agent/v1/report", reportEingabe(), token));
      await reportPost(
        anfrage(
          "/api/agent/v1/report",
          reportEingabe({
            reportId: "alter-report-0001",
            erhobenAm: "2026-09-10T03:41:00Z",
            subscription: { ...reportEingabe().subscription, status: "expired" },
          }),
          token,
        ),
      );

      const host = await testPrisma.host.findUniqueOrThrow({ where: { id: hostId } });
      expect(host.subStatus).toBe("ACTIVE");
      expect(await testPrisma.report.count({ where: { hostId } })).toBe(2);
    });

    it("merkt einen Key-Wechsel in der Historie vor", async () => {
      const { hostId, token } = await registriereTestHost();

      await reportPost(anfrage("/api/agent/v1/report", reportEingabe(), token));
      await reportPost(
        anfrage(
          "/api/agent/v1/report",
          reportEingabe({
            reportId: "neuer-key-0001",
            erhobenAm: "2026-09-18T03:41:00Z",
            subscription: { ...reportEingabe().subscription, key: "pve1c-neuerkey99" },
          }),
          token,
        ),
      );

      const historie = await testPrisma.subscriptionKeyHistorie.findMany({ where: { hostId } });
      expect(historie.map((e) => e.key).sort()).toEqual(["pve1c-a6bd21fcb6", "pve1c-neuerkey99"]);
    });

    it("weist einen widerrufenen Host-Token ab", async () => {
      const { token } = await registriereTestHost();
      await testPrisma.agentToken.updateMany({ data: { widerrufenAm: new Date() } });

      const antwort = await reportPost(anfrage("/api/agent/v1/report", reportEingabe(), token));
      expect(antwort.status).toBe(401);
      expect(await testPrisma.report.count()).toBe(0);
    });

    it("weist einen Report ohne Token ab", async () => {
      const antwort = await reportPost(anfrage("/api/agent/v1/report", reportEingabe()));
      expect(antwort.status).toBe(401);
    });

    it("lehnt einen Report ohne reportId mit 422 ab", async () => {
      const { token } = await registriereTestHost();
      const antwort = await reportPost(
        anfrage("/api/agent/v1/report", { erhobenAm: "2026-09-17T03:41:00Z" }, token),
      );
      expect(antwort.status).toBe(422);
    });
  });

  describe("Ping und Rate-Limit", () => {
    it("bestätigt einen gültigen Host-Token", async () => {
      const { token, hostId } = await registriereTestHost();
      const antwort = await pingGet(anfrage("/api/agent/v1/ping", null, token, "GET"));
      const daten = (await antwort.json()) as { ok: boolean; hostId: string; hostname: string };

      expect(daten.ok).toBe(true);
      expect(daten.hostId).toBe(hostId);
      expect(daten.hostname).toBe("pve-test-01");
    });

    it("bremst zu viele Reports mit 429 und Retry-After", async () => {
      const { token } = await registriereTestHost();

      let letzte: Response | undefined;
      for (let i = 0; i < 12; i++) {
        letzte = await reportPost(
          anfrage("/api/agent/v1/report", reportEingabe({ reportId: `flut-${i}-0001` }), token),
        );
      }

      expect(letzte?.status).toBe(429);
      expect(Number(letzte?.headers.get("Retry-After"))).toBeGreaterThan(0);
    });
  });
});
