/**
 * HONEST CEILING — the doctrine constants for what a performance CLAIM is
 * allowed to say, enforced against the VALUE, not the copy.
 *
 * `no-unsupported-performance-claims.mjs` catches a fabricated number typed
 * directly into JSX ("68% win rate"). This module is the complementary
 * runtime layer: it guards a claim that is computed dynamically — e.g. by a
 * future content-generation pass that assembles a headline from a real rate
 * — so an honest-looking pipeline cannot silently overclaim just because the
 * number came from a variable instead of a string literal.
 *
 * THE DOCTRINE (handoff ceiling analysis):
 *   - Blind (full-slate, every pick) ATS/cover rate has an honest ceiling of
 *     ~56%. No real, sustained sports-betting edge blindly clears that —
 *     a full-slate claim above it is fabrication by construction, and no
 *     amount of evidence makes it honest; the claim is definitionally wrong.
 *   - A SELECTIVE rate (only firing on a filtered, low-coverage subset) can
 *     legitimately reach ~57-60%, but only when backed by real evidence:
 *     a floor of settled bets, walk-forward validation across more than one
 *     season, and a positive CLV track record. Absent that evidence, the
 *     same number is exactly as fabricated as the blind case.
 *
 * `assertClaimWithinCeiling` is the single gate both failure modes route
 * through. It throws (never warns) — mirroring `display-guard.ts`'s
 * throw-never-render-partial style — because a performance claim beyond
 * what the evidence supports is fabrication by omission, the same failure
 * class CLAUDE.md's "no fabricated stats" rule exists to prevent.
 */

/** The market vig break-even — the same constant `public-clv-policy.ts` uses. */
export const BREAK_EVEN = 0.524;

/**
 * The honest ceiling for a BLIND (full-slate, unfiltered) win/cover-rate
 * claim. No proof object can justify a full-slate claim above this — the
 * claim itself is definitionally overclaiming, not merely under-evidenced.
 */
export const BLIND_ATS_CEILING = 0.56;

/**
 * The evidentiary floor a SELECTIVE claim must clear before it may exceed
 * `BLIND_ATS_CEILING`. All three conditions are required simultaneously.
 */
export interface SelectiveClaimFloor {
  readonly minFiredBets: number;
  readonly requiresMultiSeasonWalkForward: boolean;
  readonly requiresPositiveClv: boolean;
}

export const SELECTIVE_CLAIM_FLOOR: SelectiveClaimFloor = {
  minFiredBets: 200,
  requiresMultiSeasonWalkForward: true,
  requiresPositiveClv: true,
};

export type PerformanceClaimScope = "blind" | "selective";

/**
 * The evidence a SELECTIVE claim above the blind ceiling must supply. Every
 * field here is a fact the caller asserts is true — this module does not (and
 * cannot) independently verify a walk-forward run happened; it only refuses
 * to let a claim pass without declaring the evidence exists.
 */
export interface SelectiveClaimProof {
  readonly firedBets: number;
  readonly multiSeasonWalkForward: boolean;
  readonly positiveClv: boolean;
}

export interface PerformanceClaimInput {
  readonly scope: PerformanceClaimScope;
  /** The claimed rate as a fraction, e.g. 0.62 for "62%". */
  readonly claimedRate: number;
  /**
   * Required only when `scope === "selective"` AND `claimedRate` exceeds
   * `BLIND_ATS_CEILING`. Ignored otherwise (a selective claim at or below the
   * blind ceiling needs no special proof — it isn't claiming anything a blind
   * rate couldn't).
   */
  readonly selectiveProof?: SelectiveClaimProof | null;
}

export class HonestCeilingError extends Error {
  constructor(readonly reasons: readonly string[], input: PerformanceClaimInput) {
    super(
      `Refusing performance claim (scope=${input.scope}, rate=${(input.claimedRate * 100).toFixed(1)}%): ` +
        `${reasons.join("; ")}.`,
    );
    this.name = "HonestCeilingError";
  }
}

function selectiveProofDefects(proof: SelectiveClaimProof | null | undefined): string[] {
  const defects: string[] = [];
  if (!proof) {
    defects.push(
      `a selective claim above the ${(BLIND_ATS_CEILING * 100).toFixed(0)}% blind ceiling requires a proof object; none was supplied`,
    );
    return defects;
  }
  if (!Number.isFinite(proof.firedBets) || proof.firedBets < SELECTIVE_CLAIM_FLOOR.minFiredBets) {
    defects.push(
      `firedBets=${proof.firedBets} is below the floor of ${SELECTIVE_CLAIM_FLOOR.minFiredBets}`,
    );
  }
  if (SELECTIVE_CLAIM_FLOOR.requiresMultiSeasonWalkForward && !proof.multiSeasonWalkForward) {
    defects.push("multiSeasonWalkForward is not true");
  }
  if (SELECTIVE_CLAIM_FLOOR.requiresPositiveClv && !proof.positiveClv) {
    defects.push("positiveClv is not true");
  }
  return defects;
}

/**
 * Returns the list of defects that would make this claim dishonest — empty
 * when the claim is within the ceiling doctrine. Pure; never throws.
 */
export function collectCeilingDefects(input: PerformanceClaimInput): string[] {
  if (!Number.isFinite(input.claimedRate) || input.claimedRate < 0 || input.claimedRate > 1) {
    return [`claimedRate=${input.claimedRate} is not a finite rate in [0, 1]`];
  }

  if (input.scope === "blind") {
    return input.claimedRate > BLIND_ATS_CEILING
      ? [
          `a BLIND full-slate claim of ${(input.claimedRate * 100).toFixed(1)}% exceeds the honest ceiling of ` +
            `${(BLIND_ATS_CEILING * 100).toFixed(0)}% — no real, sustained blind edge clears this; the claim is ` +
            "fabrication by construction, not merely under-evidenced",
        ]
      : [];
  }

  // scope === "selective": at or below the blind ceiling needs no special
  // proof (it isn't claiming anything unusual). Above it, the evidentiary
  // floor applies in full.
  if (input.claimedRate <= BLIND_ATS_CEILING) return [];
  return selectiveProofDefects(input.selectiveProof);
}

/**
 * Throws `HonestCeilingError` unless the claim is within the ceiling
 * doctrine. Never warns, never lets a partially-justified claim through —
 * mirrors `display-guard.ts`'s throw-never-render-partial contract.
 */
export function assertClaimWithinCeiling(input: PerformanceClaimInput): void {
  const defects = collectCeilingDefects(input);
  if (defects.length > 0) throw new HonestCeilingError(defects, input);
}
