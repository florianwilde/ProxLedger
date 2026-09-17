/**
 * Überträgt die Issue-Dateien aus `docs/issues/` in den Gitea-Issue-Tracker.
 *
 *   GITEA_URL=https://git.wilde-server.de \
 *   GITEA_REPO=florian.wilde/ProxLedger \
 *   GITEA_TOKEN=... \
 *   npm run issues:sync
 *
 * Ohne Token oder mit `--dry-run` läuft nur ein Trockenlauf: Es wird ausgegeben, was passieren würde.
 * Die Markdown-Dateien bleiben die Quelle der Wahrheit; Gitea erhält eine Kopie zum Kommentieren.
 */

import { readFile, readdir } from "node:fs/promises";
import "dotenv/config";
import path from "node:path";

interface IssueDatei {
  nummer: number;
  titel: string;
  status: string;
  meilenstein: string | null;
  labels: string[];
  koerper: string;
  dateiname: string;
}

const LABEL_FARBEN: Record<string, string> = {
  agent: "#1e7e34",
  backend: "#007bff",
  api: "#6f42c1",
  ui: "#17a2b8",
  datenbank: "#20c997",
  sicherheit: "#c82333",
  docs: "#6c757d",
  deployment: "#fd7e14",
  infrastruktur: "#495057",
  alerts: "#ffc107",
  buchhaltung: "#e83e8c",
  export: "#0dcaf0",
  prototyp: "#adb5bd",
  test: "#198754",
  chore: "#868e96",
};

function feld(inhalt: string, name: string): string | null {
  const treffer = new RegExp(`^\\*\\*${name}:\\*\\*\\s*(.+)$`, "m").exec(inhalt);
  return treffer ? treffer[1].trim() : null;
}

async function dateienLesen(verzeichnis: string): Promise<IssueDatei[]> {
  const namen = (await readdir(verzeichnis)).filter((name) => /^\d{3}-.*\.md$/.test(name)).sort();

  const issues: IssueDatei[] = [];
  for (const dateiname of namen) {
    const inhalt = await readFile(path.join(verzeichnis, dateiname), "utf8");
    const kopf = /^#\s*#(\d+)\s+(.+)$/m.exec(inhalt);
    if (!kopf) {
      console.warn(`Übersprungen (keine Überschrift „# #NNN Titel“): ${dateiname}`);
      continue;
    }

    // Der Körper beginnt nach den Kopfzeilen (Status, Meilenstein, Labels, Zeiten).
    const körperStart = inhalt.indexOf("## Ziel");
    issues.push({
      nummer: Number(kopf[1]),
      titel: kopf[2].trim(),
      status: feld(inhalt, "Status") ?? "offen",
      meilenstein: feld(inhalt, "Meilenstein"),
      labels: (feld(inhalt, "Labels") ?? "")
        .split(",")
        .map((label) => label.trim().toLowerCase())
        .filter(Boolean),
      koerper: körperStart >= 0 ? inhalt.slice(körperStart).trim() : inhalt,
      dateiname,
    });
  }
  return issues;
}

class Gitea {
  constructor(
    private readonly basis: string,
    private readonly repo: string,
    private readonly token: string,
  ) {}

  private async anfrage<T>(pfad: string, optionen: RequestInit = {}): Promise<T> {
    const antwort = await fetch(`${this.basis}/api/v1/repos/${this.repo}${pfad}`, {
      ...optionen,
      headers: {
        Authorization: `token ${this.token}`,
        "Content-Type": "application/json",
        ...optionen.headers,
      },
    });

    if (!antwort.ok) {
      throw new Error(`Gitea antwortet mit ${antwort.status} auf ${pfad}: ${await antwort.text()}`);
    }
    return (await antwort.json()) as T;
  }

  labels() {
    return this.anfrage<{ id: number; name: string }[]>("/labels?limit=100");
  }

  labelAnlegen(name: string) {
    return this.anfrage<{ id: number; name: string }>("/labels", {
      method: "POST",
      body: JSON.stringify({ name, color: LABEL_FARBEN[name] ?? "#6c757d" }),
    });
  }

  meilensteine() {
    return this.anfrage<{ id: number; title: string }[]>("/milestones?state=all&limit=100");
  }

  meilensteinAnlegen(title: string) {
    return this.anfrage<{ id: number; title: string }>("/milestones", {
      method: "POST",
      body: JSON.stringify({ title }),
    });
  }

  issues() {
    return this.anfrage<{ number: number; title: string; state: string }[]>("/issues?state=all&limit=200");
  }

  issueAnlegen(daten: Record<string, unknown>) {
    return this.anfrage<{ number: number }>("/issues", { method: "POST", body: JSON.stringify(daten) });
  }

  issueAendern(nummer: number, daten: Record<string, unknown>) {
    return this.anfrage<{ number: number }>(`/issues/${nummer}`, {
      method: "PATCH",
      body: JSON.stringify(daten),
    });
  }
}

/** Titel in Gitea, z. B. „#004 Agent-Skript“ – daran werden vorhandene Issues wiedererkannt. */
function giteaTitel(issue: IssueDatei): string {
  return `#${String(issue.nummer).padStart(3, "0")} ${issue.titel}`;
}

async function main() {
  const trockenlauf = process.argv.includes("--dry-run");
  const basis = (process.env.GITEA_URL ?? "").replace(/\/$/, "");
  const repo = process.env.GITEA_REPO ?? "";
  const token = process.env.GITEA_TOKEN ?? "";

  const verzeichnis = path.join(process.cwd(), "docs", "issues");
  const issues = await dateienLesen(verzeichnis);
  console.log(`${issues.length} Issue-Dateien gelesen.`);

  if (trockenlauf || !basis || !repo || !token) {
    if (!trockenlauf) {
      console.log("\nGITEA_URL, GITEA_REPO oder GITEA_TOKEN fehlen – es läuft nur ein Trockenlauf.\n");
    }
    for (const issue of issues) {
      console.log(
        `  ${giteaTitel(issue)}  [${issue.status}]  Meilenstein ${issue.meilenstein ?? "–"}  Labels: ${
          issue.labels.join(", ") || "–"
        }`,
      );
    }
    console.log(
      "\nEchter Abgleich: GITEA_URL, GITEA_REPO und GITEA_TOKEN setzen (Token mit Recht „issue:write“).",
    );
    return;
  }

  const gitea = new Gitea(basis, repo, token);

  const vorhandeneLabels = new Map((await gitea.labels()).map((l) => [l.name.toLowerCase(), l.id]));
  const benoetigteLabels = [...new Set(issues.flatMap((issue) => issue.labels))];
  for (const name of benoetigteLabels) {
    if (!vorhandeneLabels.has(name)) {
      const neu = await gitea.labelAnlegen(name);
      vorhandeneLabels.set(name, neu.id);
      console.log(`Label angelegt: ${name}`);
    }
  }

  const vorhandeneMeilensteine = new Map((await gitea.meilensteine()).map((m) => [m.title, m.id]));
  const benoetigteMeilensteine = [
    ...new Set(issues.map((issue) => issue.meilenstein).filter((m): m is string => Boolean(m))),
  ].sort();
  for (const titel of benoetigteMeilensteine) {
    if (!vorhandeneMeilensteine.has(titel)) {
      const neu = await gitea.meilensteinAnlegen(titel);
      vorhandeneMeilensteine.set(titel, neu.id);
      console.log(`Meilenstein angelegt: ${titel}`);
    }
  }

  const vorhandeneIssues = new Map((await gitea.issues()).map((i) => [i.title, i]));

  for (const issue of issues) {
    const titel = giteaTitel(issue);
    const daten = {
      title: titel,
      body: `${issue.koerper}\n\n---\nQuelle: \`docs/issues/${issue.dateiname}\` – dort wird dieses Issue gepflegt.`,
      labels: issue.labels
        .map((name) => vorhandeneLabels.get(name))
        .filter((id): id is number => Boolean(id)),
      milestone: issue.meilenstein ? vorhandeneMeilensteine.get(issue.meilenstein) : undefined,
    };

    const vorhanden = vorhandeneIssues.get(titel);
    const zustand = issue.status.startsWith("erledigt") ? "closed" : "open";

    if (vorhanden) {
      await gitea.issueAendern(vorhanden.number, { ...daten, state: zustand });
      console.log(`Aktualisiert: ${titel} (${zustand})`);
    } else {
      const neu = await gitea.issueAnlegen(daten);
      if (zustand === "closed") await gitea.issueAendern(neu.number, { state: "closed" });
      console.log(`Angelegt: ${titel} (${zustand})`);
    }
  }

  console.log("\nAbgleich abgeschlossen.");
}

main().catch((fehler) => {
  console.error(fehler instanceof Error ? fehler.message : fehler);
  process.exit(1);
});
