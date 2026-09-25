/**
 * Props-player bridge — wires conditional-TD marginalization, catch-prowess,
 * player-similarity comps, and expected-flag (xflag) models into the live
 * player-prop path.
 *
 * These are the player-level reasoning modules: how a target distribution
 * becomes a TD probability, how a receiver's catch prowess shifts the
 * baseline, who a player's closest comps are, and how many flags a crew
 * will throw.
 *
 * Fail-closed on missing inputs. Never invents a probability or a comp.
 */

import {
  marginalizeConditionalTD,
  marginalizeConditionalFirstDown,
  isProperTargetDist,
  type ConditionalTdInputs,
} from "@sports/prediction-engine";
import {
  fitCatchProwess,
  catchProb,
  spatialBaseline,
  type Target,
} from "@sports/prediction-engine";
import {
  closestComps,
  type PlayerSeason,
  type Comp,
} from "@sports/prediction-engine";
import {
  expectedFlags,
  xFlagsByTeam,
  xFlagsByCrew,
  expectedFreeYardage,
  type XFlagFeatures,
} from "@sports/prediction-engine";

export type PlayerEval<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly reason: string };

// ── Conditional TD marginalization ─────────────────────────────────────────

/**
 * P(TD) = sum_t P(TD | targeted = t) P(targeted = t).
 * Fail-closed when the target distribution is not proper or lengths misalign.
 */
export function evalConditionalTd(input: ConditionalTdInputs): PlayerEval<number> {
  if (
    !input ||
    !Array.isArray(input.targetProbs) ||
    !Array.isArray(input.tdGivenTarget) ||
    input.targetProbs.length === 0 ||
    input.targetProbs.length !== input.tdGivenTarget.length
  ) {
    return {
      ok: false,
      reason: "targetProbs and tdGivenTarget must be non-empty and aligned",
    };
  }
  if (!isProperTargetDist(input.targetProbs)) {
    return {
      ok: false,
      reason: "targetProbs is not a proper distribution — not imputed",
    };
  }
  for (let i = 0; i < input.tdGivenTarget.length; i++) {
    const p = input.tdGivenTarget[i];
    if (p == null || !Number.isFinite(p) || p < 0 || p > 1) {
      return {
        ok: false,
        reason: `tdGivenTarget[${i}] must be finite in [0,1] — not imputed`,
      };
    }
  }
  try {
    const td = marginalizeConditionalTD(input);
    if (!Number.isFinite(td) || td < 0 || td > 1) {
      return { ok: false, reason: "marginalizeConditionalTD returned value outside [0,1]" };
    }
    return { ok: true, data: Number(td.toFixed(6)) };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Same decomposition for first-down props: P(1D) = sum_t P(1D | t) P(t).
 */
export function evalConditionalFirstDown(input: ConditionalTdInputs): PlayerEval<number> {
  if (
    !input ||
    !Array.isArray(input.targetProbs) ||
    !Array.isArray(input.tdGivenTarget) ||
    input.targetProbs.length === 0 ||
    input.targetProbs.length !== input.tdGivenTarget.length
  ) {
    return {
      ok: false,
      reason: "targetProbs and tdGivenTarget must be non-empty and aligned",
    };
  }
  try {
    const fd = marginalizeConditionalFirstDown(
      input.targetProbs,
      input.tdGivenTarget,
    );
    if (!Number.isFinite(fd)) {
      return { ok: false, reason: "marginalizeConditionalFirstDown returned non-finite" };
    }
    return { ok: true, data: Number(fd.toFixed(6)) };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

// ── Catch prowess ──────────────────────────────────────────────────────────

export interface CatchProwessFit {
  readonly fit: Record<string, { prowess: number; positioningSense: number; targets: number }>;
  readonly baseline: number;
}

/**
 * Fit receiver catch-prowess (spatial baseline + positioning sense) and
 * return the fit alongside the baseline catch probability.
 */
export function evalCatchProwess(input: {
  readonly targets: readonly Target[];
  readonly priorWeight?: number;
}): PlayerEval<CatchProwessFit> {
  const { targets, priorWeight } = input;
  if (!Array.isArray(targets) || targets.length === 0) {
    return { ok: false, reason: "targets must be non-empty" };
  }
  try {
    const baseline = spatialBaseline(targets as Target[]);
    const fit = fitCatchProwess(targets as Target[], priorWeight ?? 30);
    return {
      ok: true,
      data: {
        fit: fit as CatchProwessFit["fit"],
        baseline: Number(baseline.toFixed(6)),
      },
    };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * P(catch | target) for a receiver given a fitted prowess model and the
 * spatial baseline. Unknown receivers fall back to the baseline — that is
 * a documented default, not an imputation of their true prowess.
 */
export function evalCatchProb(input: {
  readonly fit: CatchProwessFit;
  readonly receiverId: string;
}): PlayerEval<number> {
  const { fit, receiverId } = input;
  if (!fit || !fit.fit || !Number.isFinite(fit.baseline)) {
    return { ok: false, reason: "fit with finite baseline required" };
  }
  if (!receiverId || receiverId.trim().length === 0) {
    return { ok: false, reason: "receiverId required" };
  }
  try {
    const p = catchProb(fit.fit, receiverId, fit.baseline);
    if (!Number.isFinite(p) || p < 0 || p > 1) {
      return { ok: false, reason: "catchProb returned value outside [0,1]" };
    }
    return { ok: true, data: Number(p.toFixed(6)) };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

// ── Player similarity comps ────────────────────────────────────────────────

/**
 * Closest historical comps for a player. Fail-closed when the target is
 * missing from the player set — never fabricates a comp.
 */
export function evalClosestComps(input: {
  readonly players: readonly PlayerSeason[];
  readonly targetId: string;
  readonly k?: number;
}): PlayerEval<readonly Comp[]> {
  const { players, targetId, k } = input;
  if (!Array.isArray(players) || players.length < 2) {
    return { ok: false, reason: "need at least 2 players to compute comps" };
  }
  if (!targetId || targetId.trim().length === 0) {
    return { ok: false, reason: "targetId required" };
  }
  try {
    const comps = closestComps(players as PlayerSeason[], targetId, k ?? 3);
    return { ok: true, data: comps };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

// ── Expected flags (xflag) ─────────────────────────────────────────────────

export interface XFlagSummary {
  readonly total: number;
  readonly byTeam: Readonly<Record<string, number>>;
  readonly byCrew: Readonly<Record<string, number>>;
  readonly expectedFreeYardage: number | null;
}

/**
 * Expected flags across a slate, split by team and officiating crew.
 * Fail-closed when probs/keys misalign.
 */
export function evalXFlags(input: {
  readonly playProbs: readonly number[];
  readonly teamOf: readonly string[];
  readonly crewOf: readonly string[];
  readonly yardsIfFlag?: readonly number[];
}): PlayerEval<XFlagSummary> {
  const { playProbs, teamOf, crewOf, yardsIfFlag } = input;
  if (
    !Array.isArray(playProbs) ||
    !Array.isArray(teamOf) ||
    !Array.isArray(crewOf) ||
    playProbs.length === 0 ||
    playProbs.length !== teamOf.length ||
    playProbs.length !== crewOf.length
  ) {
    return {
      ok: false,
      reason: "playProbs/teamOf/crewOf must be non-empty and aligned",
    };
  }
  for (let i = 0; i < playProbs.length; i++) {
    const p = playProbs[i];
    if (p == null || !Number.isFinite(p)) {
      return {
        ok: false,
        reason: `playProbs[${i}] must be finite — not imputed`,
      };
    }
  }
  try {
    const total = expectedFlags(playProbs as number[]);
    const byTeamMap = xFlagsByTeam(playProbs as number[], teamOf as string[]);
    const byCrewMap = xFlagsByCrew(playProbs as number[], crewOf as string[]);
    const freeYd =
      yardsIfFlag && yardsIfFlag.length === playProbs.length
        ? expectedFreeYardage(playProbs as number[], yardsIfFlag as number[])
        : null;

    return {
      ok: true,
      data: {
        total: Number(total.toFixed(6)),
        byTeam: Object.fromEntries(
          [...byTeamMap.entries()].map(([k, v]) => [k, Number(v.toFixed(6))]),
        ),
        byCrew: Object.fromEntries(
          [...byCrewMap.entries()].map(([k, v]) => [k, Number(v.toFixed(6))]),
        ),
        expectedFreeYardage: freeYd == null ? null : Number(freeYd.toFixed(6)),
      },
    };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

export {
  marginalizeConditionalTD,
  marginalizeConditionalFirstDown,
  isProperTargetDist,
  fitCatchProwess,
  catchProb,
  spatialBaseline,
  closestComps,
  expectedFlags,
  xFlagsByTeam,
  xFlagsByCrew,
  expectedFreeYardage,
};
export type {
  ConditionalTdInputs,
  Target,
  PlayerSeason,
  Comp,
  XFlagFeatures,
};
