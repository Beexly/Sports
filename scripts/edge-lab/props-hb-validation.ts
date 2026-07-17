/**
 * PROPS-HB VALIDATION — real-data exercise of the hierarchical-Bayes props
 * specialist (handoff §2 Phase 3, first edge source; see
 * packages/prediction-engine/src/edge-lab/props-hb.ts).
 *
 * ── SCOPE, STATED HONESTLY ──
 * This is NOT a prop-line CLV claim. There is no archived prop-price history
 * in this repo yet (the same honest boundary close-distillation.ts documents
 * for the closing-line distiller) — nothing here is compared against a real
 * sportsbook price, and no coverage/LCB/CLV/provenance quartet is attached
 * to a publishable "edge." What this script DOES validate, on real nflverse
 * receptions data: that the empirical-Bayes Gamma-Poisson posterior-predictive
 * machinery in props-hb.ts produces CALIBRATED probabilities against actual
 * outcomes under an honest walk-forward protocol. That is a prerequisite for
 * any future prop-line edge claim, not the claim itself. A real prop-line
 * edge test awaits the line archive.
 *
 * ── Data ──
 * nflverse weekly player stats (packages/data-ingestion/src/nflverse-source.ts,
 * `player_stats_week` asset: the merged/backfilled `stats_player_week_*`
 * family). Licensed CC-BY-4.0 — attribution: "Data via nflverse, licensed
 * CC BY 4.0." Requires NODE_OPTIONS=--use-system-ca to fetch live in this
 * environment (see that adapter's header).
 *
 * Target stat: RECEPTIONS — a genuine per-game COUNT, the natural fit for
 * probOver's Poisson-conditional model (yardage would need the continuous
 * path; out of scope here — this validates the count path).
 *
 * ── Protocol (walk-forward, no lookahead) ──
 * For each season N in {2022, 2023, 2024} and position group G in
 * {WR, TE, RB}:
 *   1. Fit the empirical-Bayes group prior on season N-1's REG receptions
 *      (fitGroupPrior over each player's (games, total) that season).
 *   2. Walk forward through season N: for each player, for each game k
 *      (k = 2nd game onward), compute the posterior from ONLY that player's
 *      games 1..k-1 within season N (accumulated on top of the season-N-1
 *      prior), and predict P(receptions in game k > line) where
 *      line = median(receptions in games 1..k-1) + 0.5 — a median-based
 *      proxy for a prop line, built ONLY from information available before
 *      game k.
 *
 * ── Scoring ──
 * Pool every (predicted, actual) pair across all season x position-group
 * combinations. Bucket into probability deciles; report predicted vs
 * realized frequency per decile (with a Wilson lower bound on the realized
 * rate — reusing stats.ts, the repo's standing rule that a published rate
 * needs a coverage + lower-bound pairing), plus the pooled Brier score
 * against a climatology baseline (predicting the pooled base rate for every
 * case).
 *
 * ── Acceptance ──
 *   - Calibration is MONOTONE: realized rate must not decrease more than
 *     once as predicted decile increases (one inversion tolerated — real
 *     data is noisy even when the machinery is sound).
 *   - Brier(model) <= Brier(climatology): the posterior-predictive
 *     probabilities must beat "always guess the base rate."
 *
 * Exit codes: 0 = acceptance PASSED · 2 = acceptance FAILED ·
 * 3 = data/environment error (fetch failure or too few predictions to trust
 * a decile table).
 *
 * Run: NODE_OPTIONS=--use-system-ca npx tsx scripts/edge-lab/props-hb-validation.ts
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { fetchNflverse } from "../../packages/data-ingestion/src/nflverse-source.js";
import { fitGroupPrior, posteriorRate, probOver, type RateSample } from "../../packages/prediction-engine/src/edge-lab/props-hb.js";
import { stampProvenance } from "../../packages/prediction-engine/src/edge-lab/provenance.js";
import { wilsonInterval } from "../../packages/prediction-engine/src/edge-lab/stats.js";

const POSITION_GROUPS = ["WR", "TE", "RB"] as const;
type PositionGroup = (typeof POSITION_GROUPS)[number];
const SEASONS = [2022, 2023, 2024] as const;
const MIN_PREDICTIONS = 1000;
const DECILE_COUNT = 10;

interface PlayerWeekRow {
  readonly playerId: string;
  readonly season: number;
  readonly week: number;
  readonly positionGroup: PositionGroup;
  readonly receptions: number;
}

function toNumber(v: string | undefined): number {
  const n = Number(v ?? "0");
  return Number.isFinite(n) ? n : 0;
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid] as number;
  return ((sorted[mid - 1] as number) + (sorted[mid] as number)) / 2;
}

async function loadPlayerWeeks(): Promise<PlayerWeekRow[]> {
  // A single call (asking for the latest season) triggers the adapter's own
  // combined-asset + per-season-backfill merge, covering every earlier
  // season in one fetch — no need to re-fetch per season.
  const table = await fetchNflverse("player_stats_week", Math.max(...SEASONS));
  const rows: PlayerWeekRow[] = [];
  const groupSet = new Set<string>(POSITION_GROUPS);
  for (const r of table.records) {
    if ((r["season_type"] ?? "") !== "REG") continue;
    const positionGroup = r["position_group"] ?? "";
    if (!groupSet.has(positionGroup)) continue;
    const season = toNumber(r["season"]);
    const week = toNumber(r["week"]);
    const playerId = r["player_id"] ?? "";
    if (playerId === "" || !Number.isInteger(season) || !Number.isInteger(week)) continue;
    rows.push({
      playerId,
      season,
      week,
      positionGroup: positionGroup as PositionGroup,
      receptions: toNumber(r["receptions"]),
    });
  }
  return rows;
}

interface Prediction {
  readonly season: number;
  readonly group: PositionGroup;
  readonly predicted: number;
  readonly actual: 0 | 1;
}

function buildPredictions(rows: readonly PlayerWeekRow[]): { predictions: Prediction[]; notes: string[] } {
  const predictions: Prediction[] = [];
  const notes: string[] = [];

  for (const season of SEASONS) {
    const priorSeason = season - 1;
    for (const group of POSITION_GROUPS) {
      // 1) Fit the EB prior on the PRIOR season's REG receptions for this group.
      const priorRows = rows.filter((r) => r.season === priorSeason && r.positionGroup === group);
      const byPlayerPrior = new Map<string, { games: number; total: number }>();
      for (const r of priorRows) {
        const acc = byPlayerPrior.get(r.playerId) ?? { games: 0, total: 0 };
        acc.games += 1;
        acc.total += r.receptions;
        byPlayerPrior.set(r.playerId, acc);
      }
      const priorSamples: RateSample[] = [...byPlayerPrior.values()];
      const prior = fitGroupPrior(priorSamples);
      if (prior === null) {
        notes.push(
          `season ${season} group ${group}: EB prior degenerate (homogeneous group per fitGroupPrior) on ${priorSamples.length} priorSeason players — skipped, no fake dispersion.`,
        );
        continue;
      }

      // 2) Walk forward within season N, per player, in game order.
      const bySeasonGroup = rows.filter((r) => r.season === season && r.positionGroup === group);
      const byPlayer = new Map<string, PlayerWeekRow[]>();
      for (const r of bySeasonGroup) {
        const list = byPlayer.get(r.playerId) ?? [];
        list.push(r);
        byPlayer.set(r.playerId, list);
      }

      for (const gamesLog of byPlayer.values()) {
        const sorted = [...gamesLog].sort((a, b) => a.week - b.week);
        for (let i = 1; i < sorted.length; i++) {
          const priorGames = sorted.slice(0, i);
          const priorTotal = priorGames.reduce((s, g) => s + g.receptions, 0);
          const posterior = posteriorRate(prior, priorTotal, priorGames.length);
          const line = median(priorGames.map((g) => g.receptions)) + 0.5;
          const predicted = probOver(posterior, line);
          const actualGame = sorted[i] as PlayerWeekRow;
          const actual: 0 | 1 = actualGame.receptions > line ? 1 : 0;
          predictions.push({ season, group, predicted, actual });
        }
      }
    }
  }
  return { predictions, notes };
}

interface DecileRow {
  readonly decile: number;
  readonly n: number;
  readonly meanPredicted: number;
  readonly realizedRate: number;
  readonly wilsonLower: number;
}

function decileTable(predictions: readonly Prediction[]): DecileRow[] {
  const sorted = [...predictions].sort((a, b) => a.predicted - b.predicted);
  const n = sorted.length;
  const rows: DecileRow[] = [];
  for (let d = 0; d < DECILE_COUNT; d++) {
    const lo = Math.floor((n * d) / DECILE_COUNT);
    const hi = Math.floor((n * (d + 1)) / DECILE_COUNT);
    const bucket = sorted.slice(lo, hi);
    if (bucket.length === 0) {
      rows.push({ decile: d + 1, n: 0, meanPredicted: 0, realizedRate: 0, wilsonLower: 0 });
      continue;
    }
    const meanPredicted = bucket.reduce((s, p) => s + p.predicted, 0) / bucket.length;
    const successes = bucket.reduce((s, p) => s + p.actual, 0);
    const realizedRate = successes / bucket.length;
    const wl = wilsonInterval(successes, bucket.length).lower;
    rows.push({ decile: d + 1, n: bucket.length, meanPredicted, realizedRate, wilsonLower: wl });
  }
  return rows;
}

function countInversions(rows: readonly DecileRow[]): number {
  let inversions = 0;
  const nonEmpty = rows.filter((r) => r.n > 0);
  for (let i = 1; i < nonEmpty.length; i++) {
    if ((nonEmpty[i] as DecileRow).realizedRate < (nonEmpty[i - 1] as DecileRow).realizedRate) inversions++;
  }
  return inversions;
}

function brierScore(predictions: readonly Prediction[], predictedOf: (p: Prediction) => number): number {
  return predictions.reduce((s, p) => s + (predictedOf(p) - p.actual) ** 2, 0) / predictions.length;
}

async function main(): Promise<number> {
  const startedAt = new Date().toISOString();

  let rows: PlayerWeekRow[];
  try {
    rows = await loadPlayerWeeks();
  } catch (err) {
    console.error("props-hb-validation: nflverse fetch failed:", err);
    return 3;
  }
  if (rows.length < 5000) {
    console.error(`props-hb-validation: too few player-week rows loaded (${rows.length}); refusing a stub-corpus run.`);
    return 3;
  }

  const { predictions, notes } = buildPredictions(rows);
  if (predictions.length < MIN_PREDICTIONS) {
    console.error(
      `props-hb-validation: too few predictions (${predictions.length} < ${MIN_PREDICTIONS}); refusing an underpowered decile table.`,
    );
    return 3;
  }

  const deciles = decileTable(predictions);
  const inversions = countInversions(deciles);
  const monotoneOk = inversions <= 1;

  const baseRate = predictions.reduce((s, p) => s + p.actual, 0) / predictions.length;
  const modelBrier = brierScore(predictions, (p) => p.predicted);
  const climatologyBrier = brierScore(predictions, () => baseRate);
  const brierOk = modelBrier <= climatologyBrier;

  const passed = monotoneOk && brierOk;

  const bySeasonGroupCounts: Record<string, number> = {};
  for (const p of predictions) {
    const key = `${p.season}|${p.group}`;
    bySeasonGroupCounts[key] = (bySeasonGroupCounts[key] ?? 0) + 1;
  }

  const report = {
    validation: "props-hb-props-machinery",
    scopeNote:
      "NOT a prop-line CLV claim. This validates the posterior-predictive machinery's calibration against real player receptions outcomes under an honest walk-forward protocol. A prop-line edge claim requires an archived prop-price history this repo does not yet have.",
    startedAt,
    finishedAt: new Date().toISOString(),
    data: {
      source: "nflverse player_stats_week (CC-BY-4.0)",
      seasons: [...SEASONS],
      positionGroups: [...POSITION_GROUPS],
      statTarget: "receptions",
      playerWeekRowsLoaded: rows.length,
      predictionsScored: predictions.length,
      bySeasonGroup: bySeasonGroupCounts,
    },
    notes,
    calibration: {
      deciles,
      inversions,
      monotoneOk,
    },
    brier: {
      model: modelBrier,
      climatology: climatologyBrier,
      baseRate,
      modelBeatsClimatology: brierOk,
    },
    criteria: { monotoneOk, brierOk },
    passed,
  };

  const stamp = stampProvenance({
    producer: "edge-lab/props-hb-validation",
    asOf: startedAt,
    inputs: { seasons: [...SEASONS], positionGroups: [...POSITION_GROUPS], statTarget: "receptions" },
    output: JSON.parse(JSON.stringify(report)),
  });

  const outDir = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "reports", "edge-lab");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "props-hb-validation.json"), JSON.stringify({ report, provenance: stamp }, null, 2));

  const decileLines = deciles
    .map(
      (d) =>
        `| ${d.decile} | ${d.n} | ${d.meanPredicted.toFixed(3)} | ${d.realizedRate.toFixed(3)} | ${d.wilsonLower.toFixed(3)} |`,
    )
    .join("\n");

  const md = [
    "# Props-HB validation — real nflverse receptions data (NOT a prop-line CLV claim)",
    "",
    `Generated ${report.finishedAt} by \`scripts/edge-lab/props-hb-validation.ts\` (provenance ${stamp.inputsHash.slice(0, 16)}…, model ${stamp.modelVersion}).`,
    "",
    "**Scope:** " + report.scopeNote,
    "",
    `| item | value |`,
    `|---|---|`,
    `| seasons | ${SEASONS.join(", ")} (prior fit on season N-1, walk-forward within season N) |`,
    `| position groups | ${POSITION_GROUPS.join(", ")} |`,
    `| stat target | receptions (a genuine per-game count — the Poisson-conditional path) |`,
    `| player-week rows loaded | ${rows.length} |`,
    `| predictions scored | ${predictions.length} |`,
    `| Brier (model) | ${modelBrier.toFixed(5)} |`,
    `| Brier (climatology, base rate ${baseRate.toFixed(4)}) | ${climatologyBrier.toFixed(5)} |`,
    `| model beats climatology | ${brierOk ? "YES" : "NO"} |`,
    `| calibration inversions (deciles, tolerance 1) | ${inversions} → ${monotoneOk ? "MONOTONE" : "FAILED"} |`,
    "",
    "## Calibration by decile",
    "",
    "| decile | n | mean predicted | realized rate | Wilson LCB (realized) |",
    "|---|---|---|---|---|",
    decileLines,
    "",
    notes.length > 0 ? "## Notes\n\n" + notes.map((n) => `- ${n}`).join("\n") + "\n" : "",
    `**ACCEPTANCE: ${passed ? "PASSED" : "FAILED"}.** ${
      passed
        ? "The empirical-Bayes Gamma-Poisson posterior-predictive machinery is calibrated on real player-week outcomes and beats a climatology baseline — a validated prerequisite, not a priced prop-line edge."
        : "Calibration or the Brier bar was not met — see the decile table and Brier numbers above."
    }`,
  ].join("\n");
  writeFileSync(join(outDir, "props-hb-validation.md"), md);
  console.log(md);
  return passed ? 0 : 2;
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error("props-hb-validation failed:", err);
    process.exit(3);
  });
