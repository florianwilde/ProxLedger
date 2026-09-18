import { execFileSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { POST as enrollPost } from "@/app/api/agent/v1/enroll/route";
import { AGENT_VERSION } from "@/server/agent/http";
import { POST as reportPost } from "@/app/api/agent/v1/report/route";
import { agentRateLimit, enrollRateLimit } from "@/lib/ratelimit";
import { erzeugeToken } from "@/lib/tokens";
import { datenbankLeeren, datenbankVerfuegbar, testPrisma } from "./helpers/db";

const AGENT = path.join(process.cwd(), "agent", "proxledger-agent.sh");

let stubVerzeichnis: string;

/** Legt ein ausführbares Skript an, das einen Proxmox-Befehl nachahmt. */
function befehlErsetzen(name: string, ausgabe: string) {
  const datei = path.join(stubVerzeichnis, name);
  writeFileSync(datei, `#!/usr/bin/env bash\ncat <<'ENDE'\n${ausgabe}\nENDE\n`);
  chmodSync(datei, 0o755);
}

/**
 * Ahmt `proxmox-backup-manager` nach: Das Werkzeug beantwortet `version` anders als
 * `subscription get`, und auf `--output-format json` antwortet es anders als ohne.
 * Genau daran hängt die Auswertung im Agent.
 */
function pbsErsetzen(antworten: { json: string; tabelle: string; version: string }) {
  const datei = path.join(stubVerzeichnis, "proxmox-backup-manager");
  writeFileSync(
    datei,
    [
      "#!/usr/bin/env bash",
      'if [ "$1" = "version" ]; then',
      "cat <<'VERSION'",
      antworten.version,
      "VERSION",
      'elif [[ "$*" == *--output-format*json* ]]; then',
      "cat <<'JSON'",
      antworten.json,
      "JSON",
      "else",
      "cat <<'TEXT'",
      antworten.tabelle,
      "TEXT",
      "fi",
      "",
    ].join("\n"),
  );
  chmodSync(datei, 0o755);
}

/** Führt den Agent mit den vorbereiteten Befehlen aus und liefert den Report. */
function reportErzeugen(): Record<string, never> | Record<string, unknown> {
  const ausgabe = execFileSync("bash", [AGENT, "--dry-run"], {
    env: {
      ...process.env,
      PATH: `${stubVerzeichnis}:/usr/bin:/bin`,
      PROXLEDGER_CONFIG: path.join(stubVerzeichnis, "gibt-es-nicht.conf"),
    },
    encoding: "utf8",
  });
  return JSON.parse(ausgabe) as Record<string, unknown>;
}

const PVE_SUBSCRIPTION = `key: pve1c-a6bd21fcb6
status: active
serverid: A1B2C3D4E5F60718
checktime: 1789610400
productname: Proxmox VE Community Subscription 1 CPU/year
regdate: 2025-09-24 00:00:00
nextduedate: 2026-09-24
sockets: 1
level: c`;

// Echte Ausgaben von einem Proxmox Backup Server 4.2 ohne Subscription (Feldtest #023).
const PBS_TABELLE = `┌──────────┬──────────────────────────────────────────────────────────┐
│ Name     │ Value                                                    │
╞══════════╪══════════════════════════════════════════════════════════╡
│ status   │ notfound                                                 │
├──────────┼──────────────────────────────────────────────────────────┤
│ message  │ There is no subscription key                             │
├──────────┼──────────────────────────────────────────────────────────┤
│ serverid │ 69AED6ABA8A34EBE9AE1075333BBF8FE                         │
├──────────┼──────────────────────────────────────────────────────────┤
│ url      │ https://www.proxmox.com/en/proxmox-backup-server/pricing │
└──────────┴──────────────────────────────────────────────────────────┘`;

const PBS_VERSION = "proxmox-backup-server 4.2.6-1 running version: 4.2.1";

const PBS_JSON = `{"message":"There is no subscription key","serverid":"69AED6ABA8A34EBE9AE1075333BBF8FE","status":"notfound","url":"https://www.proxmox.com/en/proxmox-backup-server/pricing"}`;

describe("Agent-Skript", () => {
  beforeEach(() => {
    stubVerzeichnis = mkdtempSync(path.join(tmpdir(), "proxledger-agent-test-"));
    mkdirSync(stubVerzeichnis, { recursive: true });
  });

  afterEach(() => {
    rmSync(stubVerzeichnis, { recursive: true, force: true });
  });

  it("erzeugt aus einer vollständigen PVE-Ausgabe einen gültigen Report", () => {
    befehlErsetzen("pvesubscription", PVE_SUBSCRIPTION);
    befehlErsetzen("pveversion", "pve-manager/8.3.2/dc2b2f4e");
    befehlErsetzen("lscpu", "Socket(s):             2\nModel name:            Intel(R) Xeon(R) E-2388G");
    befehlErsetzen(
      "ip",
      "1: lo    inet 127.0.0.1/8 scope host lo\n2: vmbr0    inet 192.168.10.11/24 scope global vmbr0",
    );
    befehlErsetzen(
      "apt",
      "Auflistung...\nlibc6/stable 2.40 amd64 [upgradable from: 2.39]\nbash/stable 5.3 amd64 [upgradable from: 5.2]",
    );

    const report = reportErzeugen() as {
      reportId: string;
      agentVersion: string;
      erhobenAm: string;
      produkt: { typ: string; version: string };
      subscription: Record<string, unknown>;
      host: Record<string, unknown>;
    };

    expect(report.agentVersion).toBe(AGENT_VERSION);
    expect(report.reportId).toMatch(/.{8,}/);
    expect(report.erhobenAm).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
    expect(report.produkt).toEqual({ typ: "pve", version: "pve-manager/8.3.2/dc2b2f4e" });

    expect(report.subscription).toMatchObject({
      key: "pve1c-a6bd21fcb6",
      status: "active",
      level: "c",
      sockets: 1,
      serverid: "A1B2C3D4E5F60718",
      productname: "Proxmox VE Community Subscription 1 CPU/year",
      nextduedate: "2026-09-24",
      // Die Uhrzeit aus regdate wird abgeschnitten.
      regdate: "2025-09-24",
      checktime: "1789610400",
    });

    expect(report.host.sockets).toBe(2);
    expect(report.host.cpuModell).toBe("Intel(R) Xeon(R) E-2388G");
    expect(report.host.paketUpdates).toBe(2);
    expect(report.host.kernel).toBeTypeOf("string");
  });

  it("liefert auch ohne Proxmox-Befehle gültiges JSON mit null-Werten", () => {
    const report = reportErzeugen() as {
      produkt: { typ: string | null };
      subscription: Record<string, unknown>;
    };

    expect(report.produkt.typ).toBeNull();
    expect(report.subscription.key).toBeNull();
    expect(report.subscription.status).toBeNull();
    expect(report.subscription.sockets).toBeNull();
  });

  it("maskiert Sonderzeichen aus Proxmox-Ausgaben korrekt", () => {
    befehlErsetzen(
      "pvesubscription",
      `key: pve1c-test
status: active
productname: Proxmox "VE" \\ Subscription	mit Tab`,
    );

    const report = reportErzeugen() as { subscription: { productname: string } };
    expect(report.subscription.productname).toBe('Proxmox "VE" \\ Subscription\tmit Tab');
  });

  it("verarbeitet eine PBS-Ausgabe im JSON-Format", () => {
    befehlErsetzen(
      "proxmox-backup-manager",
      `{"key":"pbsc-9d41be5507","status":"active","serverid":"C3D4E5F607182A3B","sockets":1,"nextduedate":"2027-03-02"}`,
    );

    const report = reportErzeugen() as {
      produkt: { typ: string };
      subscription: Record<string, unknown>;
    };

    expect(report.produkt.typ).toBe("pbs");
    expect(report.subscription).toMatchObject({
      key: "pbsc-9d41be5507",
      status: "active",
      serverid: "C3D4E5F607182A3B",
      sockets: 1,
      nextduedate: "2027-03-02",
    });
  });

  it("liest einen PBS ohne Subscription (echte Ausgaben, JSON bevorzugt)", () => {
    pbsErsetzen({ json: PBS_JSON, tabelle: PBS_TABELLE, version: PBS_VERSION });

    const report = reportErzeugen() as {
      produkt: { typ: string };
      subscription: Record<string, unknown>;
      host: { clusterMitglieder: string[] };
    };

    expect(report.produkt.typ).toBe("pbs");
    expect(report.subscription.status).toBe("notfound");
    expect(report.subscription.serverid).toBe("69AED6ABA8A34EBE9AE1075333BBF8FE");
    expect(report.subscription.key).toBeNull();
    expect(report.subscription.sockets).toBeNull();
    // Ohne pvecm bleibt die Mitgliederliste leer – PBS kennt keinen Cluster in diesem Sinne.
    expect(report.host.clusterMitglieder).toEqual([]);
  });

  it("liest die Rahmentabelle, falls ein PBS kein JSON ausgibt", () => {
    // Ältere Fassungen könnten das JSON-Format nicht kennen; dann bleibt nur die Tabelle.
    befehlErsetzen("proxmox-backup-manager", PBS_TABELLE);

    const report = reportErzeugen() as { subscription: Record<string, unknown> };
    expect(report.subscription.status).toBe("notfound");
    expect(report.subscription.serverid).toBe("69AED6ABA8A34EBE9AE1075333BBF8FE");
  });

  it("meldet die PBS-Version ohne die laufende Fassung", () => {
    pbsErsetzen({ json: PBS_JSON, tabelle: PBS_TABELLE, version: PBS_VERSION });
    const report = reportErzeugen() as { produkt: { version: string } };
    expect(report.produkt.version).toBe("proxmox-backup-server 4.2.6-1");
  });

  it("meldet die Cluster-Mitglieder", () => {
    befehlErsetzen("pvesubscription", PVE_SUBSCRIPTION);
    befehlErsetzen(
      "pvecm",
      `Membership information
----------------------
    Nodeid      Votes Name
         1          1 hv-rz5-pve-01 (local)
         2          1 hv-rz5-pve-02
         3          1 hv-rz5-pve-03`,
    );

    const report = reportErzeugen() as { host: { clusterMitglieder: string[] } };
    expect(report.host.clusterMitglieder).toEqual(["hv-rz5-pve-01", "hv-rz5-pve-02", "hv-rz5-pve-03"]);
  });

  it("meldet eine leere Liste, wenn der Host in keinem Cluster ist", () => {
    befehlErsetzen("pvesubscription", PVE_SUBSCRIPTION);

    const report = reportErzeugen() as { host: { clusterMitglieder: string[] } };
    expect(report.host.clusterMitglieder).toEqual([]);
  });

  it("gibt die Version aus", () => {
    const ausgabe = execFileSync("bash", [AGENT, "--version"], { encoding: "utf8" }).trim();
    expect(ausgabe).toBe(AGENT_VERSION);
  });

  describe.runIf(datenbankVerfuegbar)("Zusammenspiel mit der Agent-API", () => {
    afterAll(async () => {
      await testPrisma.$disconnect();
    });

    it("wird vom Report-Endpunkt unverändert angenommen", async () => {
      await datenbankLeeren();
      agentRateLimit.zuruecksetzen();
      enrollRateLimit.zuruecksetzen();

      befehlErsetzen("pvesubscription", PVE_SUBSCRIPTION);
      befehlErsetzen("pveversion", "pve-manager/8.3.2/dc2b2f4e");
      befehlErsetzen("lscpu", "Socket(s):             1\nModel name:            Intel(R) Xeon(R) E-2388G");

      const enrollToken = erzeugeToken("enrollment");
      await testPrisma.enrollmentToken.create({
        data: { tokenHash: enrollToken.hash, praefix: enrollToken.praefix, bezeichnung: "Agent-Test" },
      });

      const enrollAntwort = await enrollPost(
        new Request("http://localhost:3000/api/agent/v1/enroll", {
          method: "POST",
          headers: { "content-type": "application/json", authorization: `Bearer ${enrollToken.klartext}` },
          body: JSON.stringify({
            agentId: "machine-id-fuer-agent-test",
            hostname: "pve-agent-test",
            produkt: "pve",
          }),
        }),
      );
      const { token, hostId } = (await enrollAntwort.json()) as { token: string; hostId: string };

      const report = reportErzeugen();
      const antwort = await reportPost(
        new Request("http://localhost:3000/api/agent/v1/report", {
          method: "POST",
          headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
          body: JSON.stringify(report),
        }),
      );

      expect(antwort.status).toBe(200);
      const host = await testPrisma.host.findUniqueOrThrow({ where: { id: hostId } });
      expect(host.subKey).toBe("pve1c-a6bd21fcb6");
      expect(host.subStatus).toBe("ACTIVE");
      expect(host.subNextduedate?.toISOString().slice(0, 10)).toBe("2026-09-24");
      expect(host.subChecktime?.toISOString()).toBe("2026-09-17T02:00:00.000Z");
    });
  });
});
