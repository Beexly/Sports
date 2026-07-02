/**
 * QB forward prior — two independent forward-looking lenses, agreement surfaced.
 *
 * A quarterback's NEXT-year value is predicted far better by stable, skill-laden
 * inputs than by last year's wins or counting stats. We triangulate two genuinely
 * different forward priors from the same real nflverse weekly file:
 *   • DAKOTA — nflverse's adjusted EPA + CPOE composite, tuned on the coefficients
 *     that best predict next-year adjusted EPA/play. The closest thing to a public
 *     "forward" QB number.
 *   • ANY/A — Adjusted Net Yards per Attempt, the classic efficiency yardstick:
 *       (passing_yards + 20·passing_tds − 45·interceptions − sack_yards)
 *       / (attempts + sacks)
 *     Built here from raw box columns so it's transparent and reproducible.
 *
 * We convert each to a within-pool percentile, take the mean as the forwardGrade,
 * and SURFACE AGREEMENT between the two (1 − |dakotaPct − anyaPct|/100) rather
 * than hiding the disagreement inside one number — a QB the composite loves but
 * ANY/A doubts (or vice-versa) is a "second look" signal, not a clean read. This
 * is the same disagreement-surfaced doctrine as qb-consensus, kept STANDALONE.
 *
 * Read-only, real nflverse data, multi-host failover, honest source-error.
 * canPublishProjections false — it's a forward prior / context, not a point pick.
 */

import { assertIngestible, decodeDatasetText, fetchWithFailover, nflverseUrl, parseCsv, withMirrors } from "@sports/data-ingestion";
import { latestNflverseInspectionSeason } from "@/lib/trends/nflverse-readiness";
import { percentileRanks } from "./qb-consensus";

type CsvRecord = Readonly<Record<string, string>>;
type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export interface QbForwardRow {
  readonly playerId: string;
  readonly name: string;
  readonly team: string;
  readonly games: number;
  readonly attempts: number;
  readonly dakota: number; // season mean of weekly dakota composite
  readonly anyA: number; // Adjusted Net Yards per Attempt
  readonly dakotaPct: number; // 0-100 percentile within the QB pool
  readonly anyaPct: number; // 0-100 percentile within the QB pool
  readonly forwardGrade: number; // mean of the two percentiles, 0-100
  readonly agreement: number; // 0-1; how closely the two priors agree
  readonly note: string;
}

export interface QbForward {
  readonly generatedAt: string;
  readonly status: "live" | "source-error";
  readonly season: number;
  readonly throughWeek: number | null;
  readonly sourceRows: number;
  readonly rows: readonly QbForwardRow[];
  readonly canPublishProjections: false;
  readonly note: string;
  readonly sourceUrl: string;
  readonly error: string | null;
}

const MIN_ATTEMPTS = 80;
const TOP_N = 30;
const AGREEMENT_THRESHOLD = 0.8; // ≥ → the two priors agree; < → they diverge

function num(v: string | undefined): number {
  const n = Number(v ?? "");
  return Number.isFinite(n) ? n : 0;
}
function finite(v: string | undefined): number | null {
  const n = Number(v ?? "");
  return Number.isFinite(n) && v !== undefined && v !== "" ? n : null;
}
function round(v: number, d = 2): number {
  const f = 10 ** d;
  return Math.round(v * f) / f;
}

/**
 * Adjusted Net Yards per Attempt for a season aggregate. Pure.
 *   (passing_yards + 20·passing_tds − 45·interceptions − sack_yards) / (attempts + sacks)
 * Returns null when there is no denominator (no dropbacks) so it drops out cleanly.
 */
export function adjustedNetYardsPerAttempt(t: {
  passingYards: number;
  passingTds: number;
  interceptions: number;
  sackYards: number;
  attempts: number;
  sacks: number;
}): number | null {
  const denom = t.attempts + t.sacks;
  if (denom <= 0) return null;
  return (t.passingYards + 20 * t.passingTds - 45 * t.interceptions - t.sackYards) / denom;
}

function noteFor(agreement: number, dakotaPct: number, anyaPct: number): string {
  if (agreement >= AGREEMENT_THRESHOLD) {
    return "Both forward priors (DAKOTA composite + ANY/A efficiency) land in the same tier: higher confidence in the forward read.";
  }
  return dakotaPct > anyaPct
    ? "The DAKOTA composite (EPA + accuracy) rates this QB higher than ANY/A efficiency does. The model sees forward value the box-score yardstick doesn't. A second look, not a clean number."
    : "ANY/A efficiency rates this QB higher than the DAKOTA composite does. The yardstick is ahead of the EPA + accuracy model. A second look, not a clean number.";
}

interface Agg {
  name: string; team: string;
  games: number; attempts: number; sacks: number;
  passingYards: number; passingTds: number; interceptions: number; sackYards: number;
  dakotaSum: number; dakotaN: number;
}

/**
 * Aggregate weekly QB rows into season forward-prior rows. Pure — no I/O, so the
 * test can drive it with a tiny synthetic fixture offline.
 */
export function buildQbForward(records: readonly CsvRecord[], activeSeason: number): { rows: QbForwardRow[]; throughWeek: number | null } {
  const rows = records.filter(
    (r) => r["season"] === String(activeSeason) && r["season_type"] === "REG" && (r["position"] ?? "").toUpperCase() === "QB",
  );
  if (rows.length === 0) return { rows: [], throughWeek: null };
  const throughWeek = rows.reduce((m, r) => Math.max(m, num(r["week"])), 0) || null;

  const byPlayer = new Map<string, Agg>();
  for (const r of rows) {
    const id = r["player_id"] || r["player_display_name"] || "";
    if (!id) continue;
    const a = byPlayer.get(id) ?? {
      name: r["player_display_name"] ?? id,
      team: r["recent_team"] ?? "",
      games: 0, attempts: 0, sacks: 0,
      passingYards: 0, passingTds: 0, interceptions: 0, sackYards: 0,
      dakotaSum: 0, dakotaN: 0,
    };
    a.games += 1;
    a.attempts += num(r["attempts"]);
    a.sacks += num(r["sacks"]);
    a.passingYards += num(r["passing_yards"]);
    a.passingTds += num(r["passing_tds"]);
    a.interceptions += num(r["interceptions"]);
    a.sackYards += num(r["sack_yards"]);
    const dak = finite(r["dakota"]);
    if (dak != null) { a.dakotaSum += dak; a.dakotaN += 1; }
    a.team = r["recent_team"] || a.team;
    byPlayer.set(id, a);
  }

  // Qualify on real volume, and require both priors to be computable so the
  // agreement number is honest (a QB with no dakota weeks drops out).
  const qualified = [...byPlayer.entries()].filter(([, a]) => {
    if (a.attempts < MIN_ATTEMPTS || a.dakotaN === 0) return false;
    return adjustedNetYardsPerAttempt(a) != null;
  });
  if (qualified.length === 0) return { rows: [], throughWeek };

  const dakotas = qualified.map(([, a]) => a.dakotaSum / a.dakotaN);
  const anyas = qualified.map(([, a]) => adjustedNetYardsPerAttempt(a)!);
  const dakotaPcts = percentileRanks(dakotas);
  const anyaPcts = percentileRanks(anyas);

  const out: QbForwardRow[] = qualified.map(([id, a], i) => {
    const dakota = a.dakotaSum / a.dakotaN;
    const anyA = adjustedNetYardsPerAttempt(a)!;
    const dakotaPct = dakotaPcts[i] ?? 0;
    const anyaPct = anyaPcts[i] ?? 0;
    const forwardGrade = Math.round((dakotaPct + anyaPct) / 2);
    const agreement = round(1 - Math.abs(dakotaPct - anyaPct) / 100, 2);
    return {
      playerId: id,
      name: a.name,
      team: a.team,
      games: a.games,
      attempts: a.attempts,
      dakota: round(dakota, 3),
      anyA: round(anyA, 2),
      dakotaPct: round(dakotaPct, 1),
      anyaPct: round(anyaPct, 1),
      forwardGrade,
      agreement,
      note: noteFor(agreement, dakotaPct, anyaPct),
    };
  });

  out.sort((x, y) => y.forwardGrade - x.forwardGrade || y.agreement - x.agreement);
  return { rows: out.slice(0, TOP_N), throughWeek };
}

export async function loadQbForward({
  season = latestNflverseInspectionSeason(),
  timeoutMs = 15000,
  fetcher = fetch,
}: { season?: number; timeoutMs?: number; fetcher?: FetchLike } = {}): Promise<QbForward> {
  assertIngestible("nflverse");
  const url = nflverseUrl("player_stats_week", season);
  try {
    // player_stats ships as a gzipped .csv.gz; decodeDatasetText gunzips by magic byte.
    const { response } = await fetchWithFailover(withMirrors(url), fetcher, { timeoutMs, init: { cache: "no-store" } });
    const { records } = parseCsv(await decodeDatasetText(response));
    if (records.length === 0) throw new Error("empty player_stats_week");

    // Offseason fallback: if the requested season has no REG rows, use the latest present.
    const hasSeason = records.some((r) => r["season"] === String(season) && r["season_type"] === "REG");
    const activeSeason = hasSeason ? season : records.reduce((m, r) => Math.max(m, num(r["season"])), 0);

    const { rows, throughWeek } = buildQbForward(records, activeSeason);
    return {
      generatedAt: new Date().toISOString(),
      status: "live",
      season: activeSeason,
      throughWeek,
      sourceRows: records.length,
      rows,
      canPublishProjections: false,
      note: "Two independent forward QB priors from real nflverse weekly data (the DAKOTA EPA + CPOE composite and ANY/A efficiency), converted to percentiles, averaged into a forward grade, with their agreement surfaced rather than averaged away. A forward prior / context, not a point projection or pick.",
      sourceUrl: url,
      error: null,
    };
  } catch (error) {
    return {
      generatedAt: new Date().toISOString(),
      status: "source-error",
      season: 0,
      throughWeek: null,
      sourceRows: 0,
      rows: [],
      canPublishProjections: false,
      note: "The QB forward prior could not load from nflverse. The board shows an empty state instead of fabricated grades.",
      sourceUrl: url,
      error: error instanceof Error ? error.message : "UNKNOWN",
    };
  }
}
