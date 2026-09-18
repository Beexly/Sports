/**
 * PFF player grades — reads PFF's own PUBLIC player pages only.
 *
 * VERIFIED LIVE 2026-09-18 (Motif): 4 player pages fetched HTTP 200 and their
 * __NEXT_DATA__ payloads contained the grade data — Mahomes 38 gradeValue
 * occurrences, Josh Allen 32, McCaffrey 32, Myles Garrett 416 per-game facet
 * grades.
 *
 * FOUNDER OVERRIDE 2026-09-18 (Garrett): grades embedded in PFF's own PUBLIC
 * player pages (__NEXT_DATA__) are in scope — "if they are public leaked,
 * that's on them." The PAID PFF API remains out of scope. This client issues
 * GET requests to public player pages only, with no credentials.
 *
 * CITATION REQUIREMENT (founder): every ingestion MUST record time, date, and
 * the exact page URL. This client populates `sourceUrl` (the exact page URL)
 * and `fetchedAt` (ISO timestamp) on every returned payload.
 *
 * Registry: source-registry.ts id "pff", verdict use-with-caution.
 */

import { assertIngestible } from "./source-registry.js";
import { envFlagEnabled } from "./fail-closed-env.js";
import { noStoreFetch } from "./no-store-fetch.js";

export const PFF_SOURCE_ID = "pff";
export const PFF_BASE = "https://www.pff.com";
export const PFF_ATTRIBUTION = "Grades via Pro Football Focus public player pages.";

const TIMEOUT_MS = 15_000;
const POLITE_USER_AGENT = "GSE-DataIngestion/1.0";

/** Earliest and latest season keys we accept (PFF grades coverage window). */
const MIN_SEASON = 2014;
const MAX_SEASON = 2026;

export function isPffGradesIngestEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return envFlagEnabled(env, "PFF_GRADES_INGEST");
}

export class PffGradesError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "PffGradesError";
  }
}

/** One PFF grade row: a facet (offense/defense/pass/run/coverage/receiving/…) for one season. */
export interface PffGrade {
  readonly season: string;
  readonly facet: string | null;
  readonly gradeValue: number | null;
  readonly gradeAverage: number | null;
  readonly gradeRank: number | null;
  readonly gradeRankTotal: number | null;
  readonly updatedAt: string | null;
}

export interface PffPlayerGrades {
  readonly playerSlug: string;
  readonly playerId: string;
  readonly playerName: string | null;
  readonly team: string | null;
  readonly grades: readonly PffGrade[];
  readonly war: number | null;
  /** Exact page URL ingested — the per-ingestion citation the founder requires. */
  readonly sourceUrl: string;
  /** ISO timestamp of the fetch — the per-ingestion citation the founder requires. */
  readonly fetchedAt: string;
}

function finiteOrNull(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function stringOrNull(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

/** Normalize a season to its 4-digit key ("2024"); null when unusable. */
function seasonKey(v: unknown): string | null {
  if (typeof v === "number" && Number.isInteger(v)) return String(v);
  if (typeof v === "string") {
    const trimmed = v.trim();
    if (/^\d{4}$/.test(trimmed)) return trimmed;
  }
  return null;
}

function seasonInRange(season: string): boolean {
  const year = Number(season);
  return Number.isInteger(year) && year >= MIN_SEASON && year <= MAX_SEASON;
}

function asGrade(row: unknown): PffGrade | null {
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  if (!("gradeValue" in r)) return null;
  const season = seasonKey(r.season);
  if (!season || !seasonInRange(season)) return null;
  return {
    season,
    facet: stringOrNull(r.facet),
    gradeValue: finiteOrNull(r.gradeValue),
    gradeAverage: finiteOrNull(r.gradeAverage),
    gradeRank: finiteOrNull(r.gradeRank),
    gradeRankTotal: finiteOrNull(r.gradeRankTotal),
    updatedAt: stringOrNull(r.updatedAt),
  };
}

/** Recursively collect every array nested under a "grades" key. */
function collectGradesArrays(node: unknown, acc: unknown[][]): void {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const item of node) collectGradesArrays(item, acc);
    return;
  }
  for (const [key, value] of Object.entries(node)) {
    if (key === "grades" && Array.isArray(value)) {
      acc.push(value);
    } else {
      collectGradesArrays(value, acc);
    }
  }
}

/** Recursively find the first { name, team }-ish player object. */
function findPlayer(node: unknown): { name: string | null; team: string | null } | null {
  if (!node || typeof node !== "object" || Array.isArray(node)) return null;
  const r = node as Record<string, unknown>;
  const player = r.player;
  if (player && typeof player === "object" && !Array.isArray(player)) {
    const p = player as Record<string, unknown>;
    if (typeof p.name === "string") {
      return {
        name: p.name,
        team: stringOrNull(p.team) ?? stringOrNull(p.teamAbbreviation) ?? stringOrNull(p.teamName),
      };
    }
  }
  for (const value of Object.values(r)) {
    const found = findPlayer(value);
    if (found) return found;
  }
  return null;
}

/** Recursively find the first finite numeric "war" value. */
function findWar(node: unknown): number | null {
  if (!node || typeof node !== "object") return null;
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findWar(item);
      if (found !== null) return found;
    }
    return null;
  }
  const r = node as Record<string, unknown>;
  if ("war" in r) {
    const w = finiteOrNull(r.war);
    if (w !== null) return w;
  }
  for (const value of Object.values(r)) {
    const found = findWar(value);
    if (found !== null) return found;
  }
  return null;
}

const NEXT_DATA_RE = /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/;

function parsePlayerGrades(
  slug: string,
  playerId: string,
  sourceUrl: string,
  html: string,
): PffPlayerGrades {
  const base: Omit<PffPlayerGrades, "playerName" | "team" | "grades" | "war"> = {
    playerSlug: slug,
    playerId,
    sourceUrl,
    fetchedAt: new Date().toISOString(),
  };

  const match = NEXT_DATA_RE.exec(html);
  const jsonText = match?.[1];
  if (typeof jsonText !== "string") {
    // Page served but carries no embedded data — honest empty, not an error.
    return { ...base, playerName: null, team: null, grades: [], war: null };
  }

  let data: unknown;
  try {
    data = JSON.parse(jsonText) as unknown;
  } catch {
    throw new PffGradesError("PFF __NEXT_DATA__ payload is not valid JSON");
  }

  const arrays: unknown[][] = [];
  collectGradesArrays(data, arrays);
  const grades: PffGrade[] = [];
  for (const arr of arrays) {
    for (const row of arr) {
      const grade = asGrade(row);
      if (grade) grades.push(grade);
    }
  }

  const player = findPlayer(data);
  return {
    ...base,
    playerName: player?.name ?? null,
    team: player?.team ?? null,
    grades,
    war: findWar(data),
  };
}

export class PffGradesClient {
  constructor(
    private readonly env: NodeJS.ProcessEnv = process.env,
    private readonly fetchImpl: typeof fetch = noStoreFetch,
  ) {}

  /**
   * Fetch one player's public PFF page and extract the embedded grades.
   * Returns null when the ingest flag is off (fail-closed default).
   * Throws PffGradesError on HTTP errors or malformed payloads.
   */
  async getPlayerGrades(slug: string, playerId: string): Promise<PffPlayerGrades | null> {
    if (!isPffGradesIngestEnabled(this.env)) return null;
    assertIngestible(PFF_SOURCE_ID);

    const url = `${PFF_BASE}/nfl/players/${encodeURIComponent(slug)}/${encodeURIComponent(playerId)}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await this.fetchImpl(url, {
        method: "GET",
        headers: {
          "User-Agent": POLITE_USER_AGENT,
          Accept: "text/html",
        },
        signal: controller.signal,
      });
      if (!res.ok) throw new PffGradesError(`PFF HTTP ${res.status}`, res.status);
      const html = await res.text();
      return parsePlayerGrades(slug, playerId, url, html);
    } finally {
      clearTimeout(timer);
    }
  }
}
