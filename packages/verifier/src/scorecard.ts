/**
 * Scorecard: Brier + log-loss of a candidate vs marketFairProb on identical
 * rows; paired bootstrap P(better); per-sport strata; Wilson intervals.
 * Output is one JSON object plus a markdown table (LAST_PLAN §4.2).
 */

import type { HoldoutPickRow, Scorecard, ScoredRow, SportStratum, WilsonBand } from "./types";
import {
  DEFAULT_BOOTSTRAP_RESAMPLES,
  DEFAULT_BOOTSTRAP_SEED,
  brierScore,
  logLoss,
  pairedBootstrap,
  wilsonInterval,
} from "./stats";

export type ScorecardOptions = {
  readonly resamples?: number;
  readonly seed?: number;
  /**
   * When true, a candidate Brier strictly below market fails the harness
   * (verify:holdout rule: every historical version must score WORSE than
   * market on PICKS-H1, or the harness is wrong).
   */
  readonly expectCandidateWorse?: boolean;
  readonly label?: string;
};

/** Reduce export rows to scored pairs on which BOTH probabilities exist. */
export function toScoredRows(
  rows: readonly HoldoutPickRow[],
  options?: { readonly requireModelProb?: boolean },
): ScoredRow[] {
  const requireModel = options?.requireModelProb ?? true;
  const out: ScoredRow[] = [];
  for (const r of rows) {
    if (r.outcome !== 0 && r.outcome !== 1) continue;
    if (!(r.marketFairProb > 0 && r.marketFairProb < 1)) continue;
    if (requireModel) {
      if (r.modelProb == null || !(r.modelProb > 0 && r.modelProb < 1)) continue;
    }
    out.push({
      p: r.modelProb ?? r.marketFairProb,
      y: r.outcome,
      sport: r.sport,
      market: r.market,
      modelVersion: r.modelVersion,
      id: r.id,
    });
  }
  return out;
}

/**
 * Build a scorecard of candidate probabilities vs market on identical rows.
 * `rows` must already be filtered to the holdout (PICKS-H1 / NFL-H2).
 */
export function buildScorecard(
  rows: readonly HoldoutPickRow[],
  options?: ScorecardOptions,
): Scorecard {
  const scored = toScoredRows(rows, { requireModelProb: true });
  const n = scored.length;
  if (n === 0) {
    return emptyScorecard(options?.label ?? "empty", "n=0 on identical rows (no modelProb)");
  }

  const candidateLoss: number[] = [];
  const marketLoss: number[] = [];
  const candidateLog: number[] = [];
  const marketLog: number[] = [];
  let wins = 0;

  for (let i = 0; i < n; i++) {
    const row = scored[i]!;
    const src = rows.find((r) => r.id === row.id)!;
    const cp = src.modelProb!;
    const mp = src.marketFairProb;
    const y = src.outcome;
    candidateLoss.push(brierScore(cp, y));
    marketLoss.push(brierScore(mp, y));
    candidateLog.push(logLoss(cp, y));
    marketLog.push(logLoss(mp, y));
    if (y === 1) wins += 1;
  }

  const mean = (a: readonly number[]): number => a.reduce((s, v) => s + v, 0) / a.length;
  const candidateBrier = mean(candidateLoss);
  const marketBrier = mean(marketLoss);
  const candidateLogLoss = mean(candidateLog);
  const marketLogLoss = mean(marketLog);

  const boot = pairedBootstrap(
    { candidateLoss, marketLoss },
    {
      resamples: options?.resamples ?? DEFAULT_BOOTSTRAP_RESAMPLES,
      seed: options?.seed ?? DEFAULT_BOOTSTRAP_SEED,
    },
  );

  // Per-sport strata
  const bySportMap = new Map<string, HoldoutPickRow[]>();
  for (const r of rows) {
    if (r.modelProb == null || !(r.modelProb > 0 && r.modelProb < 1)) continue;
    const arr = bySportMap.get(r.sport) ?? [];
    arr.push(r);
    bySportMap.set(r.sport, arr);
  }
  const bySport: SportStratum[] = [];
  for (const [sport, srows] of [...bySportMap.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const cL: number[] = [];
    const mL: number[] = [];
    for (const r of srows) {
      cL.push(brierScore(r.modelProb!, r.outcome));
      mL.push(brierScore(r.marketFairProb, r.outcome));
    }
    const sp = pairedBootstrap(
      { candidateLoss: cL, marketLoss: mL },
      {
        resamples: options?.resamples ?? DEFAULT_BOOTSTRAP_RESAMPLES,
        seed: options?.seed ?? DEFAULT_BOOTSTRAP_SEED,
      },
    );
    bySport.push({
      sport,
      n: srows.length,
      candidateBrier: mean(cL),
      marketBrier: mean(mL),
      deltaBrier: sp.delta,
      pBetter: sp.pBetter,
    });
  }

  // Wilson on the candidate's "more confident than market" hit rate is NOT a
  // win-rate claim. We band the raw outcome rate on the holdout so a reader
  // sees the sample's own uncertainty beside the Brier gap (L10).
  const wilson: WilsonBand | null = (() => {
    const w = wilsonInterval(wins, n);
    if (!w) return null;
    return {
      successes: w.successes,
      n: w.n,
      point: w.point,
      low: w.low,
      high: w.high,
      z: w.z,
    };
  })();

  const expectWorse = options?.expectCandidateWorse ?? false;
  const harnessOk = expectWorse ? candidateBrier > marketBrier : true;
  const harnessNote = expectWorse
    ? harnessOk
      ? `harness OK: candidate Brier ${candidateBrier.toFixed(5)} > market ${marketBrier.toFixed(5)} on n=${n}`
      : `HARNESS WRONG: candidate Brier ${candidateBrier.toFixed(5)} <= market ${marketBrier.toFixed(5)} on n=${n} — a historical version beat market on PICKS-H1`
    : `scorecard (no harness expectation): ΔBrier=${(candidateBrier - marketBrier).toFixed(5)} P(better)=${boot.pBetter.toFixed(3)} n=${n}`;

  return {
    n,
    candidateBrier,
    marketBrier,
    deltaBrier: candidateBrier - marketBrier,
    candidateLogLoss,
    marketLogLoss,
    deltaLogLoss: candidateLogLoss - marketLogLoss,
    pBetter: boot.pBetter,
    pBetterResamples: boot.resamples,
    pBetterSeed: boot.seed,
    bySport,
    wilson,
    harnessOk,
    harnessNote,
  };
}

function emptyScorecard(label: string, note: string): Scorecard {
  return {
    n: 0,
    candidateBrier: NaN,
    marketBrier: NaN,
    deltaBrier: NaN,
    candidateLogLoss: NaN,
    marketLogLoss: NaN,
    deltaLogLoss: NaN,
    pBetter: 0.5,
    pBetterResamples: 0,
    pBetterSeed: DEFAULT_BOOTSTRAP_SEED,
    bySport: [],
    wilson: null,
    harnessOk: false,
    harnessNote: `${label}: ${note}`,
  };
}

/** One markdown table for the scorecard (§4.2 output: JSON + markdown). */
export function scorecardMarkdown(title: string, sc: Scorecard): string {
  const f = (x: number, d = 5): string => (Number.isFinite(x) ? x.toFixed(d) : "n/a");
  const lines: string[] = [
    `## ${title}`,
    "",
    `n=${sc.n} · P(better)=${f(sc.pBetter, 3)} · resamples=${sc.pBetterResamples} · seed=${sc.pBetterSeed}`,
    "",
    "| arm | Brier | log-loss |",
    "|---|---|---|",
    `| candidate | ${f(sc.candidateBrier)} | ${f(sc.candidateLogLoss)} |`,
    `| market | ${f(sc.marketBrier)} | ${f(sc.marketLogLoss)} |`,
    `| Δ (cand − mkt) | ${f(sc.deltaBrier)} | ${f(sc.deltaLogLoss)} |`,
    "",
  ];
  if (sc.wilson) {
    lines.push(
      `outcome Wilson 95%: ${sc.wilson.successes}/${sc.wilson.n} = ${(sc.wilson.point * 100).toFixed(1)}% [${(sc.wilson.low * 100).toFixed(1)}, ${(sc.wilson.high * 100).toFixed(1)}]`,
      "",
    );
  }
  if (sc.bySport.length > 0) {
    lines.push("| sport | n | cand Brier | mkt Brier | Δ | P(better) |", "|---|---|---|---|---|---|");
    for (const s of sc.bySport) {
      lines.push(
        `| ${s.sport} | ${s.n} | ${f(s.candidateBrier)} | ${f(s.marketBrier)} | ${f(s.deltaBrier)} | ${f(s.pBetter, 3)} |`,
      );
    }
    lines.push("");
  }
  lines.push(sc.harnessOk ? `PASS — ${sc.harnessNote}` : `CHECK — ${sc.harnessNote}`);
  return lines.join("\n");
}
