/**
 * Phase-0 acceptance gate: the shuffled-time placebo + the market-conditional
 * mutual-information probe (handoff §2 P0 — MANDATORY, BLOCKING).
 *
 * WHAT THE PLACEBO ACTUALLY TESTS (and why it's built this way)
 * A naive "shuffle the rows" placebo cannot distinguish leakage from real
 * signal — a genuinely predictive feature keeps predicting under row
 * permutation. The leak class this program fears (handoff: "the most likely
 * silent fatal bug") is POST-DECISION DATA entering x_t, which in practice
 * arrives as a mis-stamped observation: a loader records the closing line or
 * a final stat with a pre-kickoff `observedAt`. So the placebo randomizes
 * the TIME INDEX at which every row's features are SERVED from the real
 * as-of store: each game's vector is re-assembled as-of a uniformly random
 * instant across the whole corpus era.
 *
 *   - Honest, timely features collapse: a team-strength reading served from
 *     a random era says nothing about THIS game -> measured edge vs the
 *     close -> ~0.
 *   - Leaked outcome-encoders survive: a game-keyed feature carrying the
 *     close/result returns the same poisoned value for any serving time at
 *     or after its (mis-stamped) observedAt -> the placebo keeps "winning"
 *     -> the gate FAILS and names the leak.
 *
 * VALUE METRIC — EV-vs-CLOSE (named honestly)
 * True CLV needs a decision-time price, which the historical corpus lacks
 * until the line archive accumulates (BUILD_LOG "NEEDS FOUNDER" #3). The
 * stand-in is the expected value of fired plays settled AT the de-vigged
 * closing price: firing side s at fair decimal 1/q_s yields realized return
 * (y_s − q_s)/q_s, whose expectation is 0 under the null that the close
 * already prices everything the model knows. This converges like CLV and
 * shares its null; it is NOT a claimable performance number and is never
 * rendered publicly (display guard, Phase 1).
 *
 * Pure and deterministic given a seed. No I/O.
 */

import { AsOfFeatureStore } from "./asof-store.js";
import type { LabeledExample, Trainer } from "./logistic.js";
import { mulberry32, shuffled, uniformInstant, type Rng } from "./rng.js";
import { walkForwardSplits, type TimedRow, type WalkForwardOptions } from "./walk-forward.js";

/** One evaluable decision: features frozen at decisionAt, outcome, devigged close. */
export interface EvalRow extends TimedRow {
  /** AsOfFeatureStore entity the row's features are keyed under (defaults to id). */
  readonly entityKey?: string;
  readonly features: ReadonlyMap<string, number>;
  /** 1 = modeled side (home) won. Pushes/ties must be excluded upstream. */
  readonly y: 0 | 1;
  /** De-vigged closing probability of the modeled side, in (0,1). */
  readonly qClose: number;
}

/** Realized unit return of firing the model's side against the fair close. */
export function evVsClose(p: number, qClose: number, y: 0 | 1): number {
  const home = p > qClose;
  const qSide = home ? qClose : 1 - qClose;
  const ySide = home ? y : ((1 - y) as 0 | 1);
  if (!(qSide > 0 && qSide < 1)) throw new RangeError(`qClose out of (0,1): ${qClose}`);
  return (ySide - qSide) / qSide;
}

export interface FiredPlay {
  readonly rowId: string;
  /** true = fired the home/modeled side. */
  readonly homeSide: boolean;
  readonly ret: number;
  /** De-vigged close of the MODELED (home) side — permutation-null stratifier. */
  readonly q: number;
  readonly y: 0 | 1;
}

export interface EvalReport {
  readonly eligible: number;
  readonly fired: number;
  readonly coverage: number;
  readonly meanReturn: number | null;
  readonly seReturn: number | null;
  readonly foldCount: number;
  readonly plays: readonly FiredPlay[];
}

/** Walk-forward train/test evaluation of EV-vs-close on fired plays. */
export function walkForwardEval(
  rows: readonly EvalRow[],
  trainer: Trainer,
  wf: WalkForwardOptions,
  fireThreshold: number,
): EvalReport {
  const folds = walkForwardSplits(rows, wf);
  const plays: FiredPlay[] = [];
  let eligible = 0;
  for (const fold of folds) {
    const predict = trainer(fold.train.map(toExample));
    for (const row of fold.test) {
      eligible += 1;
      const p = predict(row.features);
      if (Math.abs(p - row.qClose) > fireThreshold) {
        plays.push({
          rowId: row.id,
          homeSide: p > row.qClose,
          ret: evVsClose(p, row.qClose, row.y),
          q: row.qClose,
          y: row.y,
        });
      }
    }
  }
  const returns = plays.map((pl) => pl.ret);
  const fired = returns.length;
  const meanReturn = fired > 0 ? returns.reduce((a, b) => a + b, 0) / fired : null;
  let seReturn: number | null = null;
  if (fired > 1 && meanReturn !== null) {
    const varSum = returns.reduce((acc, r) => acc + (r - meanReturn) ** 2, 0);
    seReturn = Math.sqrt(varSum / (fired - 1)) / Math.sqrt(fired);
  }
  return {
    eligible,
    fired,
    coverage: eligible > 0 ? fired / eligible : 0,
    meanReturn,
    seReturn,
    foldCount: folds.length,
    plays,
  };
}

function toExample(row: EvalRow): LabeledExample {
  return { features: row.features, y: row.y };
}

// ── The shuffled-time placebo ────────────────────────────────────────────────

export interface PlaceboOptions {
  /** Independent scramble runs (default 12). */
  readonly runs?: number;
  /** RNG seed (default 20260716). */
  readonly seed?: number;
  /** |mean placebo EV| above this fails the gate outright (default 0.01 = 1%). */
  readonly epsilon?: number;
  readonly fireThreshold: number;
  readonly walkForward: WalkForwardOptions;
  readonly featureKeys: readonly string[];
}

export interface PlaceboReport {
  readonly runs: number;
  readonly seed: number;
  readonly realRun: EvalReport;
  /**
   * Per-scramble-run statistics. Placebo runs share the same realized
   * outcomes, so their means are heavily correlated — an across-run CI would
   * mistake ordinary shared luck (small, |z| ~ 1) for leakage, and pooling a
   * union of fired plays dilutes a real leak with EV-zero noise plays. The
   * honest detector is the MEDIAN per-run z (each run's mean over its own
   * within-run SE): shared luck stays |z| ~ 1-2 in every run; an
   * outcome-encoding leak clears z > 4 in essentially every run.
   */
  readonly placeboRuns: readonly PlaceboRunStat[];
  /** Median across runs of the within-run permutation-null p-value. */
  readonly placeboMedianP: number | null;
  readonly placeboMedianMean: number | null;
  readonly epsilon: number;
  /** THE GATE: placebo edge statistically and practically indistinguishable from 0. */
  readonly passed: boolean;
  readonly failureReason: string | null;
}

/**
 * Run the gate. `store` must be the SAME store the real pipeline reads from,
 * already populated; `rows` carry the real-run features/outcomes/closes.
 * The scramble re-serves each row's vector as-of a uniformly random instant
 * spanning the corpus era, through the real store (its no-lookahead tripwire
 * runs as part of the gate).
 */
export function shuffledTimePlacebo(
  store: AsOfFeatureStore,
  rows: readonly EvalRow[],
  trainer: Trainer,
  opts: PlaceboOptions,
): PlaceboReport {
  const runs = opts.runs ?? 12;
  const seed = opts.seed ?? 20260716;
  const epsilon = opts.epsilon ?? 0.01;
  if (rows.length === 0) throw new RangeError("placebo needs rows");

  const realRun = walkForwardEval(rows, trainer, opts.walkForward, opts.fireThreshold);

  const times = rows.map((r) => Date.parse(r.decisionAt));
  const minMs = Math.min(...times);
  const maxMs = Math.max(...times);

  const placeboRuns: PlaceboRunStat[] = [];
  for (let k = 0; k < runs; k++) {
    const rng: Rng = mulberry32(seed + k * 7919);
    // Re-serve every row's features as-of a random instant across the era.
    const scrambledRows: EvalRow[] = shuffled(rows, rng).map((row) => {
      const asOf = uniformInstant(minMs, maxMs, rng);
      const served = store.vector(row.entityKey ?? row.id, opts.featureKeys, asOf);
      return { ...row, features: served };
    });
    const report = walkForwardEval(scrambledRows, trainer, opts.walkForward, opts.fireThreshold);
    placeboRuns.push({
      mean: report.meanReturn,
      fired: report.fired,
      pValue: permutationNullPValue(report.plays, mulberry32(seed + k * 7919 + 13), 200),
    });
  }

  store.assertNoLookahead(); // tripwire: the scramble must itself be leak-free

  const median = (xs: readonly number[]): number | null => {
    if (xs.length === 0) return null;
    const s = [...xs].sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 === 1 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
  };
  const medianP = median(placeboRuns.filter((r) => r.pValue !== null).map((r) => r.pValue!));
  const medianMean = median(placeboRuns.filter((r) => r.mean !== null).map((r) => r.mean!));

  // Detection rule (self-calibrating, no magic variance assumptions): each
  // run's fired set is tested against ITS OWN outcome-permutation null —
  // "could pure luck on exactly these fired plays produce this mean?" Under a
  // clean pipeline the per-run p-values are ~uniform (they share luck, so
  // they move together, but the TYPICAL run is unremarkable). A leak makes
  // essentially every run beat its null: median p collapses. Fail iff the
  // median p < 0.005 AND the effect is practically real (|median mean| >
  // epsilon). Softer readings are reported for founder review, never
  // silently gated on.
  let passed: boolean;
  let failureReason: string | null = null;
  if (medianMean === null) {
    // Scrambled features never cleared the fire threshold at all — the
    // strongest possible "no leak" outcome (nothing to fire on once timely
    // information is destroyed).
    passed = true;
  } else if (medianP !== null && medianP < 0.005 && Math.abs(medianMean) > epsilon) {
    passed = false;
    failureReason =
      `placebo median EV ${medianMean.toFixed(4)} with median permutation-null p=${medianP.toFixed(4)} ` +
      `across ${runs} scramble runs — time-scrambled features still beat the close, which means a ` +
      `post-decision/outcome-encoding feature is reaching x_t. Hunt the mis-stamped observedAt.`;
  } else {
    passed = true;
  }

  return {
    runs,
    seed,
    realRun,
    placeboRuns,
    placeboMedianP: medianP,
    placeboMedianMean: medianMean,
    epsilon,
    passed,
    failureReason,
  };
}

export interface PlaceboRunStat {
  readonly mean: number | null;
  readonly fired: number;
  /** P(luck alone >= this run's mean) under outcome permutation within q-strata. */
  readonly pValue: number | null;
}

/**
 * Within-run luck calibration: permute outcomes among fired plays inside
 * q-deciles (under "no info beyond the close", Y|q is exchangeable across
 * plays with similar q), recompute each play's return for its FIRED side,
 * and ask how often luck alone matches the observed mean. Two-sided.
 */
function permutationNullPValue(
  plays: readonly FiredPlay[],
  rng: Rng,
  draws: number,
): number | null {
  const n = plays.length;
  if (n < 20) return null;
  const observed = plays.reduce((a, p) => a + p.ret, 0) / n;
  // q-decile strata over the fired set.
  const order = Array.from({ length: n }, (_, i) => i).sort(
    (a, b) => (plays[a]?.q ?? 0) - (plays[b]?.q ?? 0),
  );
  const strata = Math.max(2, Math.min(10, Math.floor(n / 30)));
  const groups: number[][] = Array.from({ length: strata }, () => []);
  order.forEach((idx, rank) => {
    groups[Math.min(strata - 1, Math.floor((rank / n) * strata))]!.push(idx);
  });
  const retFor = (play: FiredPlay, y: 0 | 1): number => {
    const qSide = play.homeSide ? play.q : 1 - play.q;
    const ySide = play.homeSide ? y : ((1 - y) as 0 | 1);
    return (ySide - qSide) / qSide;
  };
  let extreme = 0;
  for (let d = 0; d < draws; d++) {
    let sum = 0;
    for (const group of groups) {
      const ys = shuffled(
        group.map((i) => plays[i]!.y),
        rng,
      );
      group.forEach((idx, j) => {
        sum += retFor(plays[idx]!, ys[j]!);
      });
    }
    if (Math.abs(sum / n) >= Math.abs(observed)) extreme += 1;
  }
  return (extreme + 1) / (draws + 1);
}

// ── Market-conditional mutual information probe ──────────────────────────────

export interface MiProbeReport {
  /** Estimated I(score; Y | q_close) in nats (Miller-Madow corrected, floored at 0). */
  readonly miNats: number;
  /** Mean MI under the within-stratum permutation null. */
  readonly nullMeanNats: number;
  /** P(null >= observed) over the permutation draws. */
  readonly pValue: number;
  readonly strata: number;
  readonly permutations: number;
  readonly n: number;
}

/**
 * I(score; Y | Q_close) — does the model score carry ANY information about
 * the outcome beyond what the closing price already encodes? Estimated by
 * stratifying on equal-mass q-deciles and computing within-stratum plug-in
 * MI between the (equal-mass-binned) score and Y, Miller-Madow corrected,
 * with a within-stratum permutation null. If this is ~0 the market already
 * knows everything the features know — the founder must be told that truth
 * before more modeling (handoff §2 P0).
 */
export function conditionalMiProbe(args: {
  readonly scores: readonly number[];
  readonly outcomes: readonly (0 | 1)[];
  readonly qClose: readonly number[];
  readonly strata?: number;
  readonly scoreBins?: number;
  readonly permutations?: number;
  readonly seed?: number;
}): MiProbeReport {
  const { scores, outcomes, qClose } = args;
  const n = scores.length;
  if (n !== outcomes.length || n !== qClose.length) {
    throw new RangeError("scores/outcomes/qClose must be equal length");
  }
  const strataCount = args.strata ?? Math.max(2, Math.min(10, Math.floor(n / 50)));
  const scoreBins = args.scoreBins ?? 4;
  const permutations = args.permutations ?? 200;
  const rng = mulberry32(args.seed ?? 918273645);

  // Equal-mass strata on q.
  const order = Array.from({ length: n }, (_, i) => i).sort((a, b) => (qClose[a] ?? 0) - (qClose[b] ?? 0));
  const strataOf = new Array<number>(n);
  order.forEach((idx, rank) => {
    strataOf[idx] = Math.min(strataCount - 1, Math.floor((rank / n) * strataCount));
  });

  const computeMi = (perm: number[] | null): number => {
    let weighted = 0;
    for (let s = 0; s < strataCount; s++) {
      const members = order.filter((i) => strataOf[i] === s);
      const m = members.length;
      if (m < scoreBins * 2) continue; // too thin to say anything
      // Equal-mass score bins within the stratum.
      const byScore = [...members].sort((a, b) => (scores[a] ?? 0) - (scores[b] ?? 0));
      const binOf = new Map<number, number>();
      byScore.forEach((idx, rank) => {
        binOf.set(idx, Math.min(scoreBins - 1, Math.floor((rank / m) * scoreBins)));
      });
      // Joint counts.
      const joint = Array.from({ length: scoreBins }, () => [0, 0]);
      for (const idx of members) {
        const src = perm ? (perm[idx] ?? idx) : idx;
        const y = outcomes[src] ?? 0;
        const bin = joint[binOf.get(idx) ?? 0]!;
        bin[y] = (bin[y] ?? 0) + 1;
      }
      let mi = 0;
      const rowTot = joint.map((r) => (r[0] ?? 0) + (r[1] ?? 0));
      const colTot: [number, number] = [0, 0];
      for (const r of joint) {
        colTot[0] += r[0] ?? 0;
        colTot[1] += r[1] ?? 0;
      }
      let nonEmptyCells = 0;
      for (let b = 0; b < scoreBins; b++) {
        for (let y = 0; y < 2; y++) {
          const c = joint[b]?.[y] ?? 0;
          if (c === 0) continue;
          nonEmptyCells += 1;
          const pxy = c / m;
          const px = (rowTot[b] ?? 0) / m;
          const py = (colTot[y] ?? 0) / m;
          mi += pxy * Math.log(pxy / (px * py));
        }
      }
      // Miller-Madow bias correction.
      const nonEmptyRows = rowTot.filter((t) => t > 0).length;
      const nonEmptyCols = colTot.filter((t) => t > 0).length;
      const mm = (nonEmptyCells - nonEmptyRows - nonEmptyCols + 1) / (2 * m);
      weighted += Math.max(0, mi - mm) * (m / n);
    }
    return weighted;
  };

  const observed = computeMi(null);

  // Within-stratum permutation null: permute outcomes among each stratum's members.
  let nullSum = 0;
  let nullGte = 0;
  for (let p = 0; p < permutations; p++) {
    const perm = Array.from({ length: n }, (_, i) => i);
    for (let s = 0; s < strataCount; s++) {
      const members = order.filter((i) => strataOf[i] === s);
      const shuffledMembers = shuffled(members, rng);
      members.forEach((idx, j) => {
        perm[idx] = shuffledMembers[j] ?? idx;
      });
    }
    const v = computeMi(perm);
    nullSum += v;
    if (v >= observed) nullGte += 1;
  }

  return {
    miNats: observed,
    nullMeanNats: permutations > 0 ? nullSum / permutations : 0,
    pValue: permutations > 0 ? nullGte / permutations : 1,
    strata: strataCount,
    permutations,
    n,
  };
}
