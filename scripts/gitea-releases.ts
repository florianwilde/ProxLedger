/**
 * Legt zu jedem Git-Tag eine Release in Gitea an – mit dem passenden Abschnitt aus dem CHANGELOG
 * als Beschreibung.
 *
 *   npm run releases:sync -- --dry-run    # zeigt nur, was passieren würde
 *   npm run releases:sync                 # legt an und aktualisiert
 *   npm run releases:sync -- v1.0.0       # nur diese eine Fassung
 *
 * Quelle der Wahrheit bleibt das CHANGELOG: Ein zweites Mal aufgerufen, wird eine vorhandene
 * Release nur aktualisiert, wenn sich der Text geändert hat.
 *
 * Der Token braucht das Recht **write:repository** – `issue:write` allein genügt nicht. Er wird
 * aus `GITEA_TOKEN` gelesen, sonst aus den Git-Zugangsdaten (#047).
 */

import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import "dotenv/config";

interface Fassung {
  tag: string;
  /** Überschrift ohne Klammern, z. B. „1.0.0 – 2026-10-23“. */
  titel: string;
  text: string;
  datum: string | null;
}

interface Release {
  id: number;
  tag_name: string;
  name: string;
  body: string;
}

/** Zerlegt das CHANGELOG in seine Abschnitte je Fassung. */
export function changelogZerlegen(inhalt: string): Fassung[] {
  const zeilen = inhalt.split("\n");
  const fassungen: Fassung[] = [];
  let aktuell: Fassung | null = null;

  for (const zeile of zeilen) {
    // Überschriften der Form „## [1.0.0] – 2026-10-23“ (Keep a Changelog).
    const kopf = /^##\s*\[([^\]]+)\]\s*[–-]?\s*(.*)$/.exec(zeile);
    if (kopf) {
      if (aktuell) fassungen.push(aktuell);
      const nummer = kopf[1].trim();
      const datum = kopf[2].trim() || null;
      // „Unreleased“ hat kein Tag und gehört nicht als Release nach Gitea.
      aktuell = /^\d/.test(nummer)
        ? { tag: `v${nummer}`, titel: datum ? `${nummer} – ${datum}` : nummer, text: "", datum }
        : null;
      continue;
    }
    if (aktuell) aktuell.text += `${zeile}\n`;
  }
  if (aktuell) fassungen.push(aktuell);

  return fassungen.map((fassung) => ({ ...fassung, text: fassung.text.trim() }));
}

function vorhandeneTags(): Set<string> {
  const ausgabe = execFileSync("git", ["tag", "--list", "v*"], { encoding: "utf8" });
  return new Set(ausgabe.split("\n").map((zeile) => zeile.trim()).filter(Boolean));
}

function ausRemote(): { basis: string; repo: string } | null {
  try {
    const url = execFileSync("git", ["remote", "get-url", "origin"], { encoding: "utf8" }).trim();
    const treffer = /^https?:\/\/(?:[^@/]*@)?([^/]+)\/(.+?)(?:\.git)?$/.exec(url);
    if (!treffer) return null;
    return { basis: `https://${treffer[1]}`, repo: treffer[2] };
  } catch {
    return null;
  }
}

/** Wie beim Issue-Abgleich: ein Token für Push und API, kein zweiter Eintrag in der .env. */
function tokenAusGitCredentials(basis: string): string | null {
  const host = new URL(basis).host;

  for (const zusatz of [[], ["-c", "credential.helper=store"]]) {
    try {
      const antwort = execFileSync("git", [...zusatz, "credential", "fill"], {
        input: `protocol=https\nhost=${host}\n\n`,
        encoding: "utf8",
        env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
        stdio: ["pipe", "pipe", "ignore"],
      });
      const passwort = /^password=(.*)$/m.exec(antwort);
      if (passwort?.[1]) return passwort[1];
    } catch {
      // Nächste Möglichkeit versuchen.
    }
  }

  return null;
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
      const text = await antwort.text();
      const hinweis =
        antwort.status === 401 || antwort.status === 403
          ? "\n  Der Token braucht das Recht „write:repository“. Gitea: Einstellungen → Anwendungen → Token erzeugen."
          : "";
      throw new Error(`Gitea antwortet mit ${antwort.status} auf ${pfad}: ${text}${hinweis}`);
    }

    // Beim Löschen kommt 204 ohne Inhalt zurück.
    return antwort.status === 204 ? (undefined as T) : ((await antwort.json()) as T);
  }

  releases() {
    return this.anfrage<Release[]>("/releases?limit=100");
  }

  anlegen(daten: { tag_name: string; name: string; body: string }) {
    return this.anfrage<Release>("/releases", { method: "POST", body: JSON.stringify(daten) });
  }

  aktualisieren(id: number, daten: { name: string; body: string }) {
    return this.anfrage<Release>(`/releases/${id}`, { method: "PATCH", body: JSON.stringify(daten) });
  }
}

async function main() {
  const trockenlauf = process.argv.includes("--dry-run");
  const nurFassung = process.argv.slice(2).find((wert) => /^v?\d+\.\d+\.\d+$/.test(wert));

  const remote = ausRemote();
  const basis = (process.env.GITEA_URL ?? remote?.basis ?? "").replace(/\/$/, "");
  const repo = process.env.GITEA_REPO ?? remote?.repo ?? "";

  if (!basis || !repo) {
    console.error("Kein Gitea-Ziel gefunden. GITEA_URL und GITEA_REPO setzen oder ein Remote einrichten.");
    process.exit(1);
  }

  const changelog = await readFile(path.join(process.cwd(), "CHANGELOG.md"), "utf8");
  const tags = vorhandeneTags();

  // Nur Fassungen, zu denen es auch ein Tag gibt – eine Release ohne Tag wäre eine Behauptung.
  let fassungen = changelogZerlegen(changelog).filter((fassung) => tags.has(fassung.tag));
  if (nurFassung) {
    const gesucht = nurFassung.startsWith("v") ? nurFassung : `v${nurFassung}`;
    fassungen = fassungen.filter((fassung) => fassung.tag === gesucht);
  }

  console.log(`Ziel: ${basis}/${repo}`);
  console.log(`${fassungen.length} Fassung(en) mit Tag im CHANGELOG.`);

  const token = process.env.GITEA_TOKEN ?? tokenAusGitCredentials(basis);
  if (trockenlauf || !token) {
    if (!token && !trockenlauf) {
      console.log("\nKein Token gefunden – es folgt nur ein Trockenlauf.");
      console.log("Ein Token mit dem Recht „write:repository“ gehört in GITEA_TOKEN.");
    }
    for (const fassung of fassungen) {
      console.log(`  ${fassung.tag}: „${fassung.titel}“ (${fassung.text.split("\n").length} Zeilen)`);
    }
    return;
  }

  const gitea = new Gitea(basis, repo, token);
  const vorhanden = new Map((await gitea.releases()).map((release) => [release.tag_name, release]));

  for (const fassung of fassungen) {
    const alt = vorhanden.get(fassung.tag);

    if (!alt) {
      if (!trockenlauf) {
        await gitea.anlegen({ tag_name: fassung.tag, name: fassung.titel, body: fassung.text });
      }
      console.log(`Angelegt:     ${fassung.tag}`);
      continue;
    }

    if (alt.body.trim() === fassung.text && alt.name === fassung.titel) {
      console.log(`Unverändert:  ${fassung.tag}`);
      continue;
    }

    if (!trockenlauf) await gitea.aktualisieren(alt.id, { name: fassung.titel, body: fassung.text });
    console.log(`Aktualisiert: ${fassung.tag}`);
  }

  console.log("\nAbgleich abgeschlossen.");
}

main().catch((fehler: unknown) => {
  console.error(fehler instanceof Error ? fehler.message : fehler);
  process.exit(1);
});
