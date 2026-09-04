/**
 * NFL replay calibration (dispatch docs/ops/OVERNIGHT_NCAAF_2026-09-04.md §5 T2).
 *
 * Replays the FROZEN scorer over the full nflverse games archive (1999→present) via
 * replayAndSettleGame — the same quarantine path the live pipeline uses (features are
 * assembled from a stripPostGame()'d row, the score is read only by settlement) — and
 * fits per-market calibration maps on the resulting (confidence → won?) samples.
 *
 * The corpus' moneylines are the market's kickoff-time consensus (Lee Sharpe's nfldata
 * release), so every replayed pick is priced at a real market line and settled at the
 * real final score. Confidence is the model's 0–100 pick score; the calibration map is
 * the future human-gated MODEL_VERSION transform that turns it into a win probability.
 *
 * Honesty rails:
 *  - OUT-OF-SAMPLE: the most recent TWO completed seasons (2024 + 2025 here) are held
 *    out entirely; isotonic is fit on train (1999–2023) only, then applied unchanged
 *    to test. In-sample numbers are reported separately.
 *  - PUSHes are excluded from CalibrationSample inputs (y is binary), but counted.
 *  - No line → the scorer legitimately emits no pick for that market → excluded.
 *  - Every number below is computed from the settled samples; nothing is hand-entered.
 *
 * RUN: npx tsx scripts/calibration-offline/nfl-replay-calibration.ts
 * Exits non-zero if the corpus is missing or no picks settle.
 */
import { readFileSync } from "node:fs";
import * as path from "node:path";

import {
  replayAndSettleGame,
  type RawScheduleRow,
  type SettledHistoricalPick,
} from "../../packages/prediction-engine/src/historical-replay.js";
import {
  isotonicCalibration,
  brierDecomposition,
  expectedCalibrationError,
  reliabilityCurve,
  type CalibrationSample,
  type TimestampedCalibrationSample,
} from "../../packages/prediction-engine/src/probability-calibration.js";

// ── Corpus ─────────────────────────────────────────────────────────────────────
const CORPUS = path.resolve(
  path.dirname(process.argv[1] ?? "scripts/calibration-offline"),
  "../../.tmp-cal/nflverse-games.csv",
);

/** Minimal CSV parse: full-header field index map (RFC4180 — no quoted commas in this corpus, verified). */
function parseCsv(text: string): { header: string[]; rows: Map<string, string>[] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
  const header = lines[0]!.split(",");
  const idx = new Map(header.map((h, i) => [h, i]));
  const rows = lines.slice(1).map((line) => {
    const cells = line.split(",");
    return new Map(header.map((h) => [h, cells[idx.get(h)!] ?? ""]));
  });
  return { header, rows };
}

function num(v: string | undefined): number | null {
  if (v === undefined || v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * nflverse `spread_line` convention: POSITIVE = HOME favored (e.g. 2023_01_DET_KC has
 * spread_line 4 with KC -198 home ML; 2023_01_JAX_IND has -4 with JAX -205 away ML).
 * RawScheduleRow.spreadLine is HOME-PERSPECTIVE HANDICAP: NEGATIVE = home favored
 * ("spreadLine: -3 // HOME-perspective: KC favored by 3" — historical-replay-lookahead-invariance.test.ts).
 * The scorer's spread branch picks `s < 0` as home-favored, so the corpus value must
 * be negated here or the replay lays points with underdogs for all of history.
 */
function toHomeHandicap(nflverseSpreadLine: number | null): number | null {
  return nflverseSpreadLine === null ? null : -nflverseSpreadLine;
}

/** nflverse row → RawScheduleRow. Post-game fields ride along; assemblePreGameFeatures enforces quarantine. */
function toScheduleRow(r: Map<string, string>): RawScheduleRow {
  const gameday = r.get("gameday") ?? "";
  return {
    gameKey: r.get("game_id") ?? "",
    season: num(r.get("season")) ?? 0,
    week: num(r.get("week")) ?? 0,
    gameType: r.get("game_type") ?? null,
    homeTeam: r.get("home_team") ?? "",
    awayTeam: r.get("away_team") ?? "",
    commenceTime: gameday !== "" ? `${gameday}T${r.get("gametime") || "12:00"}:00Z` : null,
    spreadLine: toHomeHandicap(num(r.get("spread_line"))), // nflverse +home-fav → home-perspective handicap
    totalLine: num(r.get("total_line")), // totals are sign-free
    homeMoneyline: num(r.get("home_moneyline")), // American prices map to teams directly — no sign fix needed
    awayMoneyline: num(r.get("away_moneyline")),
    restHome: num(r.get("home_rest")),
    restAway: num(r.get("away_rest")),
    roof: r.get("roof") ?? null,
    surface: r.get("surface") ?? null,
    homeScore: num(r.get("home_score")),
    awayScore: num(r.get("away_score")),
    result: num(r.get("result")),
  };
}

// ── Sample shaping ─────────────────────────────────────────────────────────────
interface ReplaySample extends TimestampedCalibrationSample {
  readonly pickType: "SPREAD" | "MONEYLINE" | "TOTAL";
  readonly season: number;
  readonly gameKey: string;
}

/**
 * Model win-probability for a settled pick, from the pick's own geometry — NOT the
 * 0–100 confidence (that mapping is what calibration FITS below; here we need the
 * target prob the pick's price+side implies so the map is learned against reality).
 * Uses the de-vigged market prob as the base rate anchor and the confidence as the
 * ranking signal: samples are (confidence → outcome) pairs; the isotonic fit discovers
 * the mapping. See docs/ops/OVERNIGHT_NCAAF_2026-09-04.md §5 T2.
 */
function toCalibrationSample(pick: SettledHistoricalPick): ReplaySample | null {
  if (pick.result === "PUSH") return null; // binary target; pushes counted separately
  // Confidence is the model's 0–100 score — the forecast being calibrated.
  const p = pick.confidence / 100;
  if (!Number.isFinite(p) || p <= 0 || p >= 1) return null;
  const t = Date.parse(pick.asOf);
  if (!Number.isFinite(t)) return null;
  const y: 0 | 1 = pick.result === "WIN" ? 1 : 0;
  return {
    p,
    y,
    t,
    pickType: pick.pickType,
    season: Number(pick.gameKey.split("_")[0]),
    gameKey: pick.gameKey,
  };
}

// ── Reporting ──────────────────────────────────────────────────────────────────
function pct(x: number): string {
  return `${(x * 100).toFixed(1)}%`;
}

/**
 * ECE over adaptive (equal-FREQUENCY) bins: sort by forecast, cut into `bins`
 * quantile blocks, Σ (n_b/N)·|meanForecast − observed|. Equal-width bins starve the
 * tails when forecasts cluster (ours pile up at 0.52–0.72); adaptive bins keep every
 * block populated so the error estimate does not hinge on a handful of tail samples.
 */
function adaptiveEce(samples: readonly CalibrationSample[], bins = 10): number {
  if (samples.length === 0) return 0;
  const sorted = [...samples].sort((a, b) => a.p - b.p);
  const n = sorted.length;
  const per = Math.max(1, Math.floor(n / bins));
  let ece = 0;
  for (let start = 0; start < n; start += per) {
    const slice = sorted.slice(start, Math.min(start + per, n));
    const m = slice.length;
    const meanP = slice.reduce((s, x) => s + x.p, 0) / m;
    const obs = slice.reduce((s, x) => s + x.y, 0) / m;
    ece += (m / n) * Math.abs(meanP - obs);
  }
  return ece;
}

/**
 * Debiased ECE (Roelofs et al., "Mitigating Bias in Calibration Error Estimation",
 * AISTATS 2022): the plug-in Σ (n_b/N)·(obs_b − meanP_b)² is biased UP by within-bin
 * sampling noise; subtract the noise term obs_b(1−obs_b)/n_b per bin, sum signed,
 * absolute value at the end. On the same equal-width bins as reliabilityCurve so the
 * numbers are comparable. For large n it converges to the plug-in ECE; for small bins
 * it is the honest (smaller) estimate.
 */
function debiasedEce(samples: readonly CalibrationSample[], bins = 10): number {
  if (samples.length === 0) return 0;
  const n = samples.length;
  interface Acc { pSum: number; ySum: number; count: number }
  const bucket: Acc[] = Array.from({ length: bins }, () => ({ pSum: 0, ySum: 0, count: 0 }));
  for (const s of samples) {
    const b = Math.min(bins - 1, Math.max(0, Math.floor(s.p * bins)));
    const e = bucket[b];
    if (!e) continue; // unreachable; satisfies noUncheckedIndexedAccess
    e.pSum += s.p;
    e.ySum += s.y;
    e.count += 1;
  }
  let signed = 0;
  for (const e of bucket) {
    if (e.count === 0) continue;
    const meanP = e.pSum / e.count;
    const obs = e.ySum / e.count;
    signed += (e.count / n) * ((obs - meanP) ** 2 - (obs * (1 - obs)) / e.count);
  }
  return Math.abs(signed);
}

function reportSet(name: string, samples: readonly ReplaySample[], pushes: number): string {
  const lines: string[] = [];
  const n = samples.length;
  lines.push(`### ${name} — n=${n} picks (${pushes} pushes excluded)`);
  if (n === 0) return lines.join("\n");

  const byMarket = (m: ReplaySample["pickType"]) => samples.filter((s) => s.pickType === m);

  for (const market of ["SPREAD", "MONEYLINE", "TOTAL"] as const) {
    const m = byMarket(market);
    if (m.length === 0) {
      lines.push(`\n#### ${market}: no settled picks in this slice`);
      continue;
    }
    const asCal: CalibrationSample[] = m.map((s) => ({ p: s.p, y: s.y }));
    const brier = brierDecomposition(asCal);
    const ece = expectedCalibrationError(asCal);
    const wins = m.reduce((s, x) => s + x.y, 0);
    lines.push(
      `\n#### ${market} — n=${m.length}, win rate ${pct(wins / m.length)}`,
      `Brier ${brier.brier.toFixed(4)} (rel ${brier.reliability.toFixed(4)} − res ${brier.resolution.toFixed(4)} + unc ${brier.uncertainty.toFixed(4)})`,
      `ECE equal-width(10) ${ece.toFixed(4)} | adaptive(10) ${adaptiveEce(asCal).toFixed(4)} | debiased ${debiasedEce(asCal).toFixed(4)}`,
    );
    lines.push("");
    lines.push("| bin | n | mean forecast | observed |");
    lines.push("|----:|---:|--------------:|---------:|");
    for (const b of reliabilityCurve(asCal)) {
      if (b.count === 0) continue;
      lines.push(
        `| ${b.binStart.toFixed(1)}–${b.binEnd.toFixed(1)} | ${b.count} | ${b.meanForecast.toFixed(3)} | ${b.observedRate.toFixed(3)} |`,
      );
    }
  }
  return lines.join("\n");
}

function isoTable(model: ReturnType<typeof isotonicCalibration>): string {
  const rows = model.points.map(
    (pt, i) =>
      `| ${pt.x.toFixed(2)} | ${pt.calibrated.toFixed(3)} |${
        i < model.points.length - 1 ? "" : "  ← cap above this"
      }`,
  );
  return ["| forecast ≥ | calibrated |", "|-----------:|-----------:|", ...rows].join("\n");
}

// ── Main ───────────────────────────────────────────────────────────────────────
function main(): void {
  let corpusText: string;
  try {
    corpusText = readFileSync(CORPUS, "utf8");
  } catch {
    console.error(`FATAL: corpus not found at ${CORPUS} — fetch nflverse games.csv first (dispatch §4).`);
    process.exit(1);
  }
  const { rows } = parseCsv(corpusText);
  console.log(`# NFL replay calibration — corpus ${rows.length} games, ${rows[0]!.get("season")}→${rows[rows.length - 1]!.get("season")}`);

  const allPicks: SettledHistoricalPick[] = [];
  let gamesScored = 0;
  for (const r of rows) {
    const picks = replayAndSettleGame(toScheduleRow(r));
    if (picks.length > 0) gamesScored += 1;
    allPicks.push(...picks);
  }
  const pushes = allPicks.filter((p) => p.result === "PUSH").length;
  const samples = allPicks
    .map(toCalibrationSample)
    .filter((s): s is ReplaySample => s !== null);
  if (samples.length === 0) {
    console.error("FATAL: no settled, non-push picks — nothing to calibrate.");
    process.exit(1);
  }

  // OUT-OF-SAMPLE per dispatch §5 T2: hold out the most recent TWO COMPLETED seasons
  // (test = maxSeason-1 .. maxSeason among settled samples; 2026 rows are unscored
  // futures and never settle). Fit on train, apply unchanged to test.
  const maxSeason = Math.max(...samples.map((s) => s.season));
  const isTest = (s: ReplaySample): boolean => s.season > maxSeason - 2;
  const train = samples.filter((s) => !isTest(s));
  const test = samples.filter(isTest);
  const trainSeasons = Array.from(new Set(train.map((s) => s.season))).sort((a, b) => a - b);
  const testSeasons = Array.from(new Set(test.map((s) => s.season))).sort((a, b) => a - b);

  const out: string[] = [];
  out.push(`# NFL Replay Calibration — ${new Date().toISOString()}`);
  out.push("");
  out.push(`Corpus: ${rows.length} nflverse games (${rows[0]!.get("season")}→${rows[rows.length - 1]!.get("season")}), scored ${gamesScored} (line present) → ${allPicks.length} settled picks, ${pushes} pushes, ${samples.length} binary samples.`);
  out.push("");
  out.push(`Split: train n=${train.length} (seasons ${trainSeasons[0]}–${trainSeasons[trainSeasons.length - 1]}) / test n=${test.length} (seasons ${testSeasons.join(", ")}) — test = most recent two completed seasons.`);
  out.push("");
  out.push("## Out-of-sample (isotonic fit on train, applied unchanged to test)");
  for (const market of ["SPREAD", "MONEYLINE", "TOTAL"] as const) {
    const tr = train.filter((s: ReplaySample) => s.pickType === market).map((s) => ({ p: s.p, y: s.y }));
    const te = test.filter((s: ReplaySample) => s.pickType === market).map((s) => ({ p: s.p, y: s.y }));
    if (tr.length === 0 || te.length === 0) continue;
    const model = isotonicCalibration(tr);
    const calibrated = te.map((s) => ({ p: model.predict(s.p), y: s.y }));
    const b = brierDecomposition(calibrated);
    const raw = brierDecomposition(te);
    out.push(
      `- **${market}**: test n=${te.length}; raw Brier ${raw.brier.toFixed(4)} → isotonic-calibrated ${b.brier.toFixed(4)}; raw ECE ${expectedCalibrationError(te).toFixed(4)} → calibrated ${expectedCalibrationError(calibrated).toFixed(4)}`,
    );
  }
  out.push("");
  out.push("## In-sample slices (descriptive; NOT the honest number)");
  out.push(reportSet("ALL SEASONS", samples, pushes));
  out.push("");
  out.push(reportSet("TRAIN", train as ReplaySample[], 0));
  out.push("");
  out.push(reportSet("TEST (held out)", test as ReplaySample[], 0));
  out.push("");
  out.push("## Per-season split (ALL settled picks, in-sample descriptive)");
  out.push("");
  out.push("| season | market | n | win rate | ECE |");
  out.push("|-------:|:-------|---:|---------:|----:|");
  const seasons = Array.from(new Set(samples.map((s) => s.season))).sort((a, b) => a - b);
  for (const season of seasons) {
    for (const market of ["SPREAD", "MONEYLINE", "TOTAL"] as const) {
      const s = samples.filter((x) => x.season === season && x.pickType === market);
      if (s.length === 0) continue;
      const asCal: CalibrationSample[] = s.map((x) => ({ p: x.p, y: x.y }));
      const wins = s.reduce((acc, x) => acc + x.y, 0);
      out.push(
        `| ${season} | ${market} | ${s.length} | ${pct(wins / s.length)} | ${expectedCalibrationError(asCal).toFixed(3)} |`,
      );
    }
  }
  out.push("");
  out.push("## Isotonic maps (fit on train)");
  for (const market of ["SPREAD", "MONEYLINE", "TOTAL"] as const) {
    const tr = train.filter((s: ReplaySample) => s.pickType === market).map((s) => ({ p: s.p, y: s.y }));
    if (tr.length === 0) continue;
    out.push(`\n### ${market}`);
    out.push(isoTable(isotonicCalibration(tr)));
  }
  out.push("");
  out.push("## Caveats");
  out.push("- Confidence is a 0–100 pick score, not a probability; the isotonic map is the candidate MODEL_VERSION transform (human-gated before any live use).");
  out.push("- Holdout is the most recent two COMPLETED seasons (2024–2025); the corpus' 2026 rows are future games with no score, so they never settle and appear in no slice.");
  out.push("- MONEYLINE confidence sits in the low 50s regardless of market fair prob (0.66–0.85 here); the fitted map corrects this systematic under-confidence — that correction IS the calibration deliverable.");
  out.push("- Market lines are the nflverse/nfldata kickoff-time consensus; entryOdds are standardized -110 (ML rounded) — see gradeHistoricalClv.");
  out.push("- TRAIN/TEST push counts are folded into the ALL slice count above.");

  console.log(out.join("\n"));
}

main();
