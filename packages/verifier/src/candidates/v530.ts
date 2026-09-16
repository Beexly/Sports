/**
 * v5.3.0 candidate assembly + duel (C-397, LAST_PLAN D17/D20, §4.2 keep rule).
 *
 * D17: "market-anchored probability, shrinkage weight from A2, every factor
 * that passed §4.2." As of this run, every docs/factors/*.yaml row reading
 * CANDIDATE (A6, A7, A14, A19, A22, A23, A25) is a team- or player-game
 * feature (play-call entropy, target share, red-zone share, snap-share
 * slope, weather-on-yardage) with no join key to a settled moneyline/
 * spread/total pick in PICKS-H1 — the props board that would carry that
 * join (Phase 3, C-383) has not shipped. Building that join now would be
 * inventing a feature transform that does not exist anywhere in the repo;
 * that is fabrication (law 8), not a joint refit. `V530_CANDIDATE_FACTOR_REVIEW`
 * below records each one and why it is excluded, per row, so the gap is
 * visible rather than silently dropped (LAST_PLAN §9 / no silent caps).
 *
 * So v5.3.0's only real input is the A2 shrinkage weight (w=0.10, D5),
 * identical in formula to the v5.2.8 proposal (C-366) — this row exists to
 * carry v5.3.0's own duel and proposal artifact, not to change the number.
 * `confidence` is never read here (D17: "confidence retired as a rank key").
 */

import type { DuelResult, HoldoutPickRow } from "../types";
import { duel } from "../duel";
import { selectPicksH1 } from "../holdout";
import {
  DEFAULT_BOOTSTRAP_RESAMPLES,
  DEFAULT_BOOTSTRAP_SEED,
  brierScore,
  pairedBootstrap,
} from "../stats";

/** Frozen at A2's D5 sweet spot; never re-fit on a holdout (that would be F19). */
export const V530_SHRINKAGE_W = 0.1;

/**
 * v5.3.0 candidate probability: market-anchored shrinkage toward the stored
 * model probability. Returns null when no modelProb is stored (held rows,
 * older confidence-only versions) — never imputed.
 */
export function v530CandidateProb(row: HoldoutPickRow): number | null {
  const mp = row.modelProb;
  if (mp == null || !(mp > 0 && mp < 1)) return null;
  return row.marketFairProb + V530_SHRINKAGE_W * (mp - row.marketFairProb);
}

export type FactorReviewRow = {
  readonly id: string;
  readonly title: string;
  /** The factor's own measured effect on its own validate era (not PICKS-H1). */
  readonly ownEffect: string;
  readonly includedInV530: boolean;
  readonly reasonExcluded: string | null;
};

/**
 * Every docs/factors/*.yaml CANDIDATE row as of C-397 (2026-09-15). Hand-
 * copied from the committed YAMLs; not re-derived or re-scored here. If a
 * factor is ever wired into a pick-level PICKS-H1 join (a props board, or a
 * game-level feature store), it flips `includedInV530` and the candidate
 * formula above changes with it — this row does not pre-guess that design.
 */
export const V530_CANDIDATE_FACTOR_REVIEW: readonly FactorReviewRow[] = [
  {
    id: "A6",
    title: "Permutation entropy of within-drive play calling",
    ownEffect: "ΔR²=0.0961 CI[0.0756,0.1158] n=2686 vs pass_oe (team-game offensive EPA/play)",
    includedInV530: false,
    reasonExcluded:
      "Team-game EPA/play R² margin, not a per-pick probability; no PICKS-H1 row carries a join key to a specific team-game.",
  },
  {
    id: "A7",
    title: "Intrinsic dimension of the play-call manifold",
    ownEffect: "ΔR²=0.0249 CI[0.0123,0.0369] n=2686 vs distinct-play-type count (team-game EPA/play)",
    includedInV530: false,
    reasonExcluded: "Same team-game EPA/play surface as A6; no pick-level join exists.",
  },
  {
    id: "A14",
    title: "FTN charting pressure/coverage/motion rates as props features",
    ownEffect: "ΔBrier=-0.00093 CI[-0.00173,-0.00013] n=2134 (receiving-yards-over-median props proxy)",
    includedInV530: false,
    reasonExcluded:
      "Player-prop feature (no posted line); the props board it would feed is not live (Phase 3, C-383). Not a moneyline/spread/total input.",
  },
  {
    id: "A19",
    title: "WR1-out target redistribution",
    ownEffect: "WR2 target-share Δ=1.1984pp CI[-1.087,3.4837] n=78 (underpowered vs its own MDE80=3.2667)",
    includedInV530: false,
    reasonExcluded:
      "Player target-share delta on an injury designation; no join to a settled game-outcome pick, and CI includes 0 against the pre-registered MDE.",
  },
  {
    id: "A22",
    title: "Red-zone target share to anytime TD",
    ownEffect: "hit-rate Δ=0.3158 CI[0.294,0.3377] n=5725 (player anytime-TD tercile split)",
    includedInV530: false,
    reasonExcluded: "Player-prop hit-rate surface; no posted-line join and no props board live yet.",
  },
  {
    id: "A23",
    title: "Snap-share slope, last three weeks",
    ownEffect: "slope=0.2937 CI[0.2664,0.3211] n=21656 (next-week offense-share residual)",
    includedInV530: false,
    reasonExcluded: "Player usage-share feature; no join to a settled game pick's market price.",
  },
  {
    id: "A25",
    title: "Weather on pass-yardage props (A5 extended to players)",
    ownEffect: "REC yards Δ=-4.2374 CI[-5.7473,-2.7275] n=7196 (trailing-baseline residual, no posted line)",
    includedInV530: false,
    reasonExcluded:
      "Player-prop yardage residual vs a trailing baseline, not a book line; no props board to attach it to yet.",
  },
];

/** Candidate vs the market-anchored baseline (L11 precondition) on PICKS-H1. */
export function buildV530DuelVsMarket(
  rows: readonly HoldoutPickRow[],
  options?: { readonly resamples?: number; readonly seed?: number },
): DuelResult {
  const holdout = selectPicksH1(rows);
  return duel(holdout, {
    ...options,
    candidateProb: v530CandidateProb,
    candidateLabel: `v5.3.0 candidate (A2 shrinkage w=${V530_SHRINKAGE_W})`,
    baselineLabel: "market-anchored (marketFairProb)",
    holdoutId: "PICKS-H1",
  });
}

export type ArmScorecard = {
  readonly n: number;
  readonly candidateBrier: number;
  readonly armBrier: number;
  readonly deltaBrier: number;
  readonly pBetter: number;
};

/**
 * Score the candidate against an arbitrary stored-probability arm (used for
 * "vs v5.2.7" — buildScorecard's baseline is always marketFairProb, so a
 * comparison against a specific stored modelVersion needs its own pairing).
 */
export function scoreCandidateVsArm(
  rows: readonly HoldoutPickRow[],
  candidateProb: (row: HoldoutPickRow) => number | null,
  armProb: (row: HoldoutPickRow) => number | null,
  options?: { readonly resamples?: number; readonly seed?: number },
): ArmScorecard {
  const candidateLoss: number[] = [];
  const armLoss: number[] = [];
  for (const r of rows) {
    if (r.outcome !== 0 && r.outcome !== 1) continue;
    const cp = candidateProb(r);
    const ap = armProb(r);
    if (cp == null || ap == null) continue;
    candidateLoss.push(brierScore(cp, r.outcome));
    armLoss.push(brierScore(ap, r.outcome));
  }
  if (candidateLoss.length === 0) {
    return { n: 0, candidateBrier: NaN, armBrier: NaN, deltaBrier: NaN, pBetter: 0.5 };
  }
  const mean = (a: readonly number[]): number => a.reduce((s, v) => s + v, 0) / a.length;
  const boot = pairedBootstrap(
    { candidateLoss, marketLoss: armLoss },
    {
      resamples: options?.resamples ?? DEFAULT_BOOTSTRAP_RESAMPLES,
      seed: options?.seed ?? DEFAULT_BOOTSTRAP_SEED,
    },
  );
  const candidateBrier = mean(candidateLoss);
  const armBrier = mean(armLoss);
  return {
    n: candidateLoss.length,
    candidateBrier,
    armBrier,
    deltaBrier: candidateBrier - armBrier,
    pBetter: boot.pBetter,
  };
}

/** Candidate vs v5.2.7's own stored (unshrunk) modelProb, on PICKS-H1 rows it published. */
export function buildV530VsV527(
  rows: readonly HoldoutPickRow[],
  options?: { readonly resamples?: number; readonly seed?: number },
): ArmScorecard {
  const v527Rows = selectPicksH1(rows).filter((r) => r.modelVersion === "v5.2.7");
  return scoreCandidateVsArm(v527Rows, v530CandidateProb, (r) => r.modelProb, options);
}
