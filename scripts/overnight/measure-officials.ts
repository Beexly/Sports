/**
 * Slice 7: one new walk-forward measurement of the DARK `officials` family.
 *
 * The prompt's standing verdict for officials was DARK on honesty: a 2025 holdout
 * of 2024 crew means, n=113, r=-0.092574, slope=-0.010072, se=0.010282. |r| cleared
 * 0.08 but |slope| did not clear se.
 *
 * The only way that flips is a genuinely new holdout, not a re-run. This uses
 * games.jsonl, which carries a `referee` column for 7,308 of 7,548 games across
 * 1999-2026, including ALL 285 settled 2025 games. That is 2.5x the prior sample.
 *
 * Construction, strictly walk-forward:
 *   feature  x = the official's historical home-win RATE on 2025 games, shrunk
 *                toward the era mean, minus the era mean
 *   target   y = home_win on the 2025 holdout
 *   train    seasons strictly before 2025, used ONLY to build the official priors
 *   score    season 2025 only
 *
 * An official's raw rate from a handful of games is noise that would manufacture
 * correlation, so the rate is shrunk toward the prior with weight k. The
 * unshrunk number is reported too, and both are stored, so the sensitivity to
 * that choice is visible rather than hidden.
 *
 * This fits nothing that reaches production. It runs the real `selectPart` from
 * the prediction engine rather than a reimplementation, and on any non-zero g it
 * writes a DARK or STORED row and leaves the registry alone.
 */

import { readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";

import { selectPart, CANDIDATE_FAMILIES } from "../../packages/prediction-engine/src/reasoning/part-selector.js";

const HOLDOUT_SEASON = 2025;
/** Shrinkage weight. An official with 0 prior games gets exactly the era mean. */
const PRIOR_STRENGTH = 10;
/** Below this many prior games an official contributes nothing at all. */
const MIN_PRIOR_GAMES = 20;

const DATA = "data/gse-dataset";

async function readJsonl<T>(file: string): Promise<T[]> {
  const out: T[] = [];
  const rl = createInterface({ input: createReadStream(file, { encoding: "utf8" }), crlfDelay: Infinity });
  for await (const line of rl) if (line.trim()) out.push(JSON.parse(line) as T);
  return out;
}

interface Game {
  game_id: string;
  season: number;
  home_win: boolean | null;
  settled: boolean;
  referee: string | null;
}

interface Fit {
  n: number;
  r: number;
  slope: number;
  se: number;
}

/** OLS with the standard error of the slope. No rounding anywhere. */
function ols(points: { x: number; y: number }[]): Fit | null {
  const n = points.length;
  if (n < 3) return null;
  let sx = 0;
  let sy = 0;
  for (const p of points) {
    sx += p.x;
    sy += p.y;
  }
  const xbar = sx / n;
  const ybar = sy / n;
  let sxx = 0;
  let sxy = 0;
  let syy = 0;
  for (const p of points) {
    const dx = p.x - xbar;
    const dy = p.y - ybar;
    sxx += dx * dx;
    sxy += dx * dy;
    syy += dy * dy;
  }
  if (sxx <= 0 || syy <= 0) return null;
  const slope = sxy / sxx;
  const intercept = ybar - slope * xbar;
  let sse = 0;
  for (const p of points) {
    const resid = p.y - (intercept + slope * p.x);
    sse += resid * resid;
  }
  const se = Math.sqrt(SSE_TO_VARIANCE(sse, n) / sxx);
  const r = sxy / Math.sqrt(sxx * syy);
  return { n, r, slope, se };
}

const SSE_TO_VARIANCE = (sse: number, n: number) => sse / (n - 2);

async function main(): Promise<void> {
  const games = await readJsonl<Game>(`${DATA}/games.jsonl`);

  const settled = (g: Game) => g.settled === true && typeof g.home_win === "boolean" && g.referee !== null && String(g.referee).trim() !== "";

  // ---- TRAIN: seasons strictly before the holdout. Nothing from 2025 leaks in.
  const trainGames = games.filter((g) => g.season < HOLDOUT_SEASON && settled(g));
  let trainHomeWins = 0;
  for (const g of trainGames) if (g.home_win) trainHomeWins += 1;
  const eraHomeRate = trainGames.length === 0 ? null : trainHomeWins / trainGames.length;
  if (eraHomeRate === null) throw new Error("no settled train games with a referee; cannot build priors");

  const prior = new Map<string, { games: number; homeWins: number }>();
  for (const g of trainGames) {
    const cur = prior.get(g.referee!) ?? { games: 0, homeWins: 0 };
    cur.games += 1;
    if (g.home_win) cur.homeWins += 1;
    prior.set(g.referee!, cur);
  }

  // ---- HOLDOUT: 2025 only.
  const holdout = games.filter((g) => g.season === HOLDOUT_SEASON && settled(g));

  const shrunk: { x: number; y: number }[] = [];
  const raw: { x: number; y: number }[] = [];
  let excludedFewGames = 0;
  let excludedUnseenOfficial = 0;
  const excludedExamples: string[] = [];

  for (const g of holdout) {
    const p = prior.get(g.referee!);
    if (p === undefined) {
      excludedUnseenOfficial += 1;
      if (excludedExamples.length < 10) excludedExamples.push(`${g.referee} (unseen before ${HOLDOUT_SEASON})`);
      continue;
    }
    if (p.games < MIN_PRIOR_GAMES) {
      excludedFewGames += 1;
      if (excludedExamples.length < 10) excludedExamples.push(`${g.referee} (only ${p.games} prior games)`);
      continue;
    }
    const y = g.home_win ? 1 : 0;
    const shrunkRate = (p.homeWins + PRIOR_STRENGTH * eraHomeRate) / (p.games + PRIOR_STRENGTH);
    const rawRate = p.homeWins / p.games;
    shrunk.push({ x: shrunkRate - eraHomeRate, y });
    raw.push({ x: rawRate - eraHomeRate, y });
  }

  const shrunkFit = ols(shrunk);
  const rawFit = ols(raw);

  const registry = readFileSync("data/reasoning/parts-registry.jsonl", "utf8")
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l) as { family: string });
  const representatives = registry.map((r) => r.family);

  if (!CANDIDATE_FAMILIES.includes("officials" as never)) throw new Error("officials is not a candidate family");

  const decision = selectPart(
    {
      family: "officials",
      grain: "game_referee_prior_home_rate",
      r: shrunkFit ? shrunkFit.r : null,
      slope: shrunkFit ? shrunkFit.slope : null,
      se: shrunkFit ? shrunkFit.se : null,
      n: shrunkFit ? shrunkFit.n : null,
      // officials has no week-3 row, so f3 = 1. The family cannot reach the sum
      // without one, whatever this fit shows.
      has_row: false,
    },
    representatives,
  );

  const result = {
    generated_at: new Date().toISOString(),
    family: "officials",
    grain: "game_referee_prior_home_rate",
    construction:
      "x = the official's pre-2025 home-win rate, shrunk toward the era mean by k=10 and a minimum of 20 prior games, minus the era mean. y = home_win on 2025. Train = seasons strictly before 2025. Out-of-sample by construction.",
    train: {
      seasons: "< 2025",
      settled_games_with_referee: trainGames.length,
      era_home_rate: eraHomeRate,
      distinct_officials: prior.size,
    },
    holdout: {
      season: HOLDOUT_SEASON,
      settled_games_with_referee: holdout.length,
      scored: shrunk.length,
      excluded_official_unseen: excludedUnseenOfficial,
      excluded_official_too_few_prior_games: excludedFewGames,
      excluded_examples: excludedExamples,
    },
    fit_shrunk: shrunkFit,
    fit_unshrunk_raw: rawFit,
    prior_strength: PRIOR_STRENGTH,
    min_prior_games: MIN_PRIOR_GAMES,
    honesty_bars: {
      r_bar: 0.08,
      slope_must_exceed_se: true,
      r_clears: shrunkFit ? Math.abs(shrunkFit.r) >= 0.08 : false,
      slope_clears: shrunkFit ? Math.abs(shrunkFit.slope) > shrunkFit.se : false,
    },
    scalarizer: decision,
    prior_verdict_for_reference: {
      n: 113,
      r: -0.09257409956668071,
      slope: -0.010071677456738428,
      se: 0.01028210084979805,
      note: "the standing DARK verdict this measurement was asked to try to move",
    },
  };

  writeFileSync("data/reasoning/officials-measurement-2026-09-27.json", `${JSON.stringify(result, null, 2)}\n`, "utf8");

  // A non-zero g is recorded in the appropriate ledger. The registry is never
  // touched unless g is exactly 0, and even then only for 2026_03_LAC_BUF.
  const store = decision.status === "STORED" ? "stored-candidates.jsonl" : "dark-candidates.jsonl";
  const row = {
    family: "officials",
    grain: "game_referee_prior_home_rate",
    method: "walk-forward-ols-on-official-prior-home-rate",
    n: shrunkFit?.n ?? null,
    r: shrunkFit?.r ?? null,
    slope: shrunkFit?.slope ?? null,
    se: shrunkFit?.se ?? null,
    holdout_season: HOLDOUT_SEASON,
    g: decision.g,
    f1: decision.f1,
    f2: decision.f2,
    f3: decision.f3,
    status: decision.status,
    why: decision.why,
    recorded_at: new Date().toISOString(),
  };
  appendFileSync(`data/reasoning/${store}`, `${JSON.stringify(row)}\n`, "utf8");

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
