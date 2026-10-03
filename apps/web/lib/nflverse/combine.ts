import {
  assertIngestible,
  fetchWithFailover,
  NFLVERSE_BASE,
  parseCsv,
  withMirrors,
} from "@sports/data-ingestion";

/**
 * NFL Combine — athletic testing from the nflverse `combine` release (CC-BY-4.0).
 * Forty, vertical, broad jump, three-cone, shuttle, bench. These are the athletic
 * traits the Human Performance layer treats as scouting PRIORS (real measurements,
 * not a projection or a pick). The file carries player_name + pos, so no join.
 */

export interface CombineRow {
  readonly name: string;
  readonly position: string;
  readonly school: string;
  readonly draftYear: number;
  readonly heightIn: string;
  readonly weight: number | null;
  readonly forty: number | null;
  readonly vertical: number | null;
  readonly broadJump: number | null;
  readonly cone: number | null;
  readonly shuttle: number | null;
  readonly bench: number | null;
}

export interface NflverseCombine {
  readonly generatedAt: string;
  readonly status: "live" | "source-error";
  readonly latestYear: number | null;
  readonly sourceRows: number;
  readonly latestClass: readonly CombineRow[];
  readonly fastestForty: readonly CombineRow[];
  readonly canPublishProjections: false;
  readonly blockReason: string;
  readonly sourceUrl: string;
  readonly error: string | null;
}

type CsvRecord = Readonly<Record<string, string>>;
type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

let cache: { readonly expiresAt: number; readonly value: NflverseCombine } | null = null;

function toNumber(value: string | undefined): number {
  const parsed = Number(value ?? "");
  return Number.isFinite(parsed) ? parsed : 0;
}
function finite(value: string | undefined): number | null {
  const parsed = Number(value ?? "");
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function toRow(r: CsvRecord): CombineRow {
  return {
    name: r["player_name"] ?? "UNKNOWN",
    position: r["pos"] ?? "",
    school: r["school"] ?? "",
    draftYear: toNumber(r["draft_year"] ?? r["season"]),
    heightIn: r["ht"] ?? "",
    weight: finite(r["wt"]),
    forty: finite(r["forty"]),
    vertical: finite(r["vertical"]),
    broadJump: finite(r["broad_jump"]),
    cone: finite(r["cone"]),
    shuttle: finite(r["shuttle"]),
    bench: finite(r["bench"]),
  };
}

export function resetCombineCacheForTests(): void {
  cache = null;
}

export async function loadNflverseCombine({
  timeoutMs = 15000,
  cacheTtlMs = 6 * 60 * 60 * 1000,
  fetcher = fetch,
}: { timeoutMs?: number; cacheTtlMs?: number; fetcher?: FetchLike } = {} ): Promise<NflverseCombine> {
  assertIngestible("nflverse");

  const now = Date.now();
  if (cacheTtlMs > 0 && fetcher === fetch && cache && cache.expiresAt > now) return cache.value;

  const url = `${NFLVERSE_BASE}/combine/combine.csv`;
  try {
    const { response } = await fetchWithFailover(withMirrors(url), fetcher, { timeoutMs });
    const { records } = parseCsv(await response.text());
    if (records.length === 0 || !("player_name" in (records[0] ?? {}))) throw new Error("combine CSV shape unexpected");

    const years = records.map((r) => toNumber(r["draft_year"] ?? r["season"])).filter((y) => y > 0);
    const latestYear = years.length > 0 ? Math.max(...years) : null;

    const latestClass = records
      .filter((r) => latestYear !== null && toNumber(r["draft_year"] ?? r["season"]) === latestYear)
      .map(toRow)
      .filter((r) => r.forty !== null)
      .sort((a, b) => (a.forty ?? 99) - (b.forty ?? 99))
      .slice(0, 50);

    const fastestForty = records
      .map(toRow)
      .filter((r) => r.forty !== null)
      .sort((a, b) => (a.forty ?? 99) - (b.forty ?? 99))
      .slice(0, 15);

    const value: NflverseCombine = {
      generatedAt: new Date().toISOString(),
      status: "live",
      latestYear,
      sourceRows: records.length,
      latestClass,
      fastestForty,
      canPublishProjections: false,
      blockReason:
        "Combine measurements are real athletic-testing facts from nflverse. They are scouting priors, not a projection, ranking, or betting pick.",
      sourceUrl: url,
      error: null,
    };
    if (cacheTtlMs > 0 && fetcher === fetch) cache = { expiresAt: now + cacheTtlMs, value };
    return value;
  } catch (error) {
    return {
      generatedAt: new Date().toISOString(),
      status: "source-error",
      latestYear: null,
      sourceRows: 0,
      latestClass: [],
      fastestForty: [],
      canPublishProjections: false,
      blockReason:
        "The combine file could not load from nflverse. The product shows an empty state instead of fabricated measurements.",
      sourceUrl: url,
      error: error instanceof Error ? error.message : "UNKNOWN",
    };
  }
}
