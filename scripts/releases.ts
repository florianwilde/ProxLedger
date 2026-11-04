/**
 * Legt zu jedem Git-Tag eine Release auf GitHub und in Gitea an – mit dem passenden Abschnitt aus
 * dem CHANGELOG als Beschreibung.
 *
 *   npm run releases:sync -- --dry-run          # zeigt nur, was passieren würde
 *   npm run releases:sync                       # GitHub und Gitea
 *   npm run releases:sync -- --ziel github      # nur eines der beiden Ziele
 *   npm run releases:sync -- v1.0.0             # nur diese eine Fassung
 *
 * Quelle der Wahrheit bleibt das CHANGELOG: Ein zweites Mal aufgerufen, wird eine vorhandene
 * Release nur aktualisiert, wenn sich der Text geändert hat.
 *
 * Tokens: GitHub aus `GITHUB_TOKEN` (in GitHub Actions vorhanden), Gitea aus `GITEA_TOKEN` mit dem
 * Recht **write:repository**. Fehlt einer, bleibt es für dieses Ziel beim Trockenlauf. Ohne Variable
 * wird in den Git-Zugangsdaten gesucht (#047).
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
  name: string | null;
  body: string | null;
}

interface Daten {
  name: string;
  body: string;
  /** Nur GitHub: Welche Release als „Latest“ gilt, entscheidet sonst die Reihenfolge des Anlegens. */
  neueste: boolean;
}

interface Ziel {
  name: string;
  adresse: string;
  releases(): Promise<Release[]>;
  anlegen(tag: string, daten: Daten): Promise<unknown>;
  aktualisieren(id: number, daten: Daten): Promise<unknown>;
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
      // „Unreleased“ hat kein Tag und gehört nicht als Release angelegt.
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

/** Höchste Fassung nach Versionsnummer, nicht nach Reihenfolge im CHANGELOG. */
export function neuesteFassung(fassungen: Fassung[]): string | null {
  const teile = (tag: string) => tag.slice(1).split(".").map(Number);
  let beste: string | null = null;
  for (const { tag } of fassungen) {
    if (!beste) {
      beste = tag;
      continue;
    }
    const [a, b] = [teile(tag), teile(beste)];
    const i = a.findIndex((wert, stelle) => wert !== b[stelle]);
    if (i >= 0 && a[i] > b[i]) beste = tag;
  }
  return beste;
}

/** Zerlegt eine HTTPS-Adresse eines Remotes in Server und Repository. */
export function remoteZerlegen(url: string): { host: string; repo: string } | null {
  const treffer = /^https?:\/\/(?:[^@/]*@)?([^/]+)\/(.+?)(?:\.git)?\/?$/.exec(url.trim());
  return treffer ? { host: treffer[1], repo: treffer[2] } : null;
}

function vorhandeneTags(): Set<string> {
  const ausgabe = execFileSync("git", ["tag", "--list", "v*"], { encoding: "utf8" });
  return new Set(
    ausgabe
      .split("\n")
      .map((zeile) => zeile.trim())
      .filter(Boolean),
  );
}

function ausRemote(): { host: string; repo: string } | null {
  try {
    return remoteZerlegen(execFileSync("git", ["remote", "get-url", "origin"], { encoding: "utf8" }));
  } catch {
    return null;
  }
}

/** Wie beim Issue-Abgleich: ein Token für Push und API, kein zweiter Eintrag in der .env. */
function tokenAusGitCredentials(host: string): string | null {
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

async function anfrage<T>(
  dienst: string,
  url: string,
  kopf: Record<string, string>,
  hinweis: string,
  optionen: RequestInit = {},
): Promise<T> {
  const antwort = await fetch(url, {
    ...optionen,
    headers: { "Content-Type": "application/json", ...kopf, ...optionen.headers },
  });

  if (!antwort.ok) {
    const text = await antwort.text();
    const zusatz = antwort.status === 401 || antwort.status === 403 ? `\n  ${hinweis}` : "";
    throw new Error(`${dienst} antwortet mit ${antwort.status} auf ${url}: ${text}${zusatz}`);
  }

  return antwort.status === 204 ? (undefined as T) : ((await antwort.json()) as T);
}

/** Liest Seite um Seite, bis eine nicht mehr voll ist. */
async function alleSeiten<T>(seite: (nummer: number) => Promise<T[]>, groesse: number): Promise<T[]> {
  const alle: T[] = [];
  for (let nummer = 1; ; nummer++) {
    const teil = await seite(nummer);
    alle.push(...teil);
    if (teil.length < groesse) return alle;
  }
}

function gitea(basis: string, repo: string, token: string): Ziel {
  const api = `${basis}/api/v1/repos/${repo}`;
  const kopf = { Authorization: `token ${token}` };
  const hinweis =
    "Der Token braucht das Recht „write:repository“. Gitea: Einstellungen → Anwendungen → Token erzeugen.";
  // Gitea liefert höchstens 50 Einträge je Seite (max_response_items).
  const groesse = 50;

  return {
    name: "Gitea",
    adresse: `${basis}/${repo}`,
    releases: () =>
      alleSeiten(
        (nummer) =>
          anfrage<Release[]>("Gitea", `${api}/releases?limit=${groesse}&page=${nummer}`, kopf, hinweis),
        groesse,
      ),
    anlegen: (tag, { name, body }) =>
      anfrage("Gitea", `${api}/releases`, kopf, hinweis, {
        method: "POST",
        body: JSON.stringify({ tag_name: tag, name, body }),
      }),
    aktualisieren: (id, { name, body }) =>
      anfrage("Gitea", `${api}/releases/${id}`, kopf, hinweis, {
        method: "PATCH",
        body: JSON.stringify({ name, body }),
      }),
  };
}

function github(repo: string, token: string): Ziel {
  const api = `https://api.github.com/repos/${repo}`;
  const kopf = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const hinweis =
    "Der Token braucht Schreibrecht auf „Contents“ (in GitHub Actions: permissions: contents: write).";
  const groesse = 100;

  return {
    name: "GitHub",
    adresse: `https://github.com/${repo}`,
    releases: () =>
      alleSeiten(
        (nummer) =>
          anfrage<Release[]>("GitHub", `${api}/releases?per_page=${groesse}&page=${nummer}`, kopf, hinweis),
        groesse,
      ),
    anlegen: (tag, { name, body, neueste }) =>
      anfrage("GitHub", `${api}/releases`, kopf, hinweis, {
        method: "POST",
        body: JSON.stringify({ tag_name: tag, name, body, make_latest: String(neueste) }),
      }),
    aktualisieren: (id, { name, body, neueste }) =>
      anfrage("GitHub", `${api}/releases/${id}`, kopf, hinweis, {
        method: "PATCH",
        body: JSON.stringify({ name, body, make_latest: String(neueste) }),
      }),
  };
}

/** Ziel samt Token – oder nur die Adresse, wenn kein Token da ist (dann Trockenlauf). */
function zielFinden(art: "github" | "gitea"): { ziel: Ziel | null; adresse: string; fehlt: string } | null {
  const remote = ausRemote();

  if (art === "github") {
    const repo = process.env.GITHUB_REPOSITORY ?? (remote?.host === "github.com" ? remote.repo : undefined);
    if (!repo) return null;
    const token = process.env.GITHUB_TOKEN ?? tokenAusGitCredentials("github.com");
    return {
      ziel: token ? github(repo, token) : null,
      adresse: `https://github.com/${repo}`,
      fehlt: "GITHUB_TOKEN",
    };
  }

  // Das Remote zeigt seit dem Umzug auf GitHub; es taugt nur als Gitea-Ziel, wenn es keines ist.
  const ausGit = remote && remote.host !== "github.com" ? remote : null;
  const basis = (process.env.GITEA_URL ?? (ausGit ? `https://${ausGit.host}` : "")).replace(/\/$/, "");
  const repo = process.env.GITEA_REPO ?? ausGit?.repo ?? "";
  if (!basis || !repo) return null;
  const token = process.env.GITEA_TOKEN ?? tokenAusGitCredentials(new URL(basis).host);
  return {
    ziel: token ? gitea(basis, repo, token) : null,
    adresse: `${basis}/${repo}`,
    fehlt: "GITEA_TOKEN",
  };
}

async function abgleichen(ziel: Ziel, fassungen: Fassung[], neueste: string | null, trockenlauf: boolean) {
  const vorhanden = new Map((await ziel.releases()).map((release) => [release.tag_name, release]));

  for (const fassung of fassungen) {
    const daten = { name: fassung.titel, body: fassung.text, neueste: fassung.tag === neueste };
    const alt = vorhanden.get(fassung.tag);

    if (!alt) {
      if (!trockenlauf) await ziel.anlegen(fassung.tag, daten);
      console.log(`  Angelegt:     ${fassung.tag}`);
      continue;
    }

    if ((alt.body ?? "").trim() === fassung.text && alt.name === fassung.titel) {
      console.log(`  Unverändert:  ${fassung.tag}`);
      continue;
    }

    if (!trockenlauf) await ziel.aktualisieren(alt.id, daten);
    console.log(`  Aktualisiert: ${fassung.tag}`);
  }
}

async function main() {
  const argumente = process.argv.slice(2);
  const trockenlauf = argumente.includes("--dry-run");
  const nurFassung = argumente.find((wert) => /^v?\d+\.\d+\.\d+$/.test(wert));
  const zielArg = argumente[argumente.indexOf("--ziel") + 1];
  const arten: ("github" | "gitea")[] =
    argumente.includes("--ziel") && (zielArg === "github" || zielArg === "gitea")
      ? [zielArg]
      : ["github", "gitea"];

  const changelog = await readFile(path.join(process.cwd(), "CHANGELOG.md"), "utf8");
  const tags = vorhandeneTags();

  // Nur Fassungen, zu denen es auch ein Tag gibt – eine Release ohne Tag wäre eine Behauptung.
  const mitTag = changelogZerlegen(changelog).filter((fassung) => tags.has(fassung.tag));
  const neueste = neuesteFassung(mitTag);
  let fassungen = mitTag;
  if (nurFassung) {
    const gesucht = nurFassung.startsWith("v") ? nurFassung : `v${nurFassung}`;
    fassungen = fassungen.filter((fassung) => fassung.tag === gesucht);
  }

  console.log(`${fassungen.length} Fassung(en) mit Tag im CHANGELOG, neueste: ${neueste ?? "–"}.`);

  let fehler = false;
  for (const art of arten) {
    const gefunden = zielFinden(art);
    if (!gefunden) {
      console.log(`\n${art === "github" ? "GitHub" : "Gitea"}: kein Ziel gefunden – übersprungen.`);
      if (art === "gitea") console.log("  GITEA_URL und GITEA_REPO setzen.");
      continue;
    }

    console.log(`\nZiel: ${gefunden.adresse}`);
    if (!gefunden.ziel || trockenlauf) {
      if (!gefunden.ziel) console.log(`  Kein Token (${gefunden.fehlt}) – nur Trockenlauf.`);
      for (const fassung of fassungen) {
        console.log(`  ${fassung.tag}: „${fassung.titel}“ (${fassung.text.split("\n").length} Zeilen)`);
      }
      continue;
    }

    try {
      await abgleichen(gefunden.ziel, fassungen, neueste, trockenlauf);
    } catch (fehlerObjekt) {
      // Ein Ziel, das nicht antwortet, soll das andere nicht aufhalten.
      fehler = true;
      console.error(fehlerObjekt instanceof Error ? fehlerObjekt.message : fehlerObjekt);
    }
  }

  console.log("\nAbgleich abgeschlossen.");
  if (fehler) process.exit(1);
}

// Nicht beim Import durch die Tests ausführen – dort könnten echte Tokens in der Umgebung stehen.
if (!process.env.VITEST) {
  main().catch((fehler: unknown) => {
    console.error(fehler instanceof Error ? fehler.message : fehler);
    process.exit(1);
  });
}
