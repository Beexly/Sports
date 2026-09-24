/**
 * arXiv 2609.22048: Available Guardrails: Certifying Selective Prediction across ML Systems.
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes published picks and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: Per-market certification contracts for the posted-pick pipeline: reporting units are (sport x market) pairs; the availability identity computes per-unit graded-pick counts needed for 80% availability; a 'certified' badge rule so a market is only advertised with a track record once its availability crosses the bar; a held-out selection protocol comparing posting policies by forward performance instead of backtest-winner.
 *
 * Improvement (wiring wave-2 slice CALIBRATE):
 * Add a per-market certification contract to the posted-pick pipeline: reporting units = (sport x market) pairs, the availability identity computing per-unit graded-pick counts needed for 80% availability, a 'certified' badge rule so a market is only advertised with a track record once its availability crosses the bar, plus the held-out selection protocol that compares posting policies by forward performance instead of backtest-winner.
 *
 * ACCEPTANCE GATE:
 * ADAPT the availability calculator iff >=80% of per-market certificates granted on historical data hold on the forward 4-week window (validity), and the method flags >=1 market as uncertifiable that indeed underperforms (it must bite, not rubber-stamp); REJECT the contiguous-partition DP if GSE's market taxonomy is fixed by product requirements.
 *
 * ENABLED=false: certification contracts; needs a human call. The contiguous-partition DP is rejected if the market taxonomy is fixed by product requirements.
 */


export const ENABLED = false;

export interface ReportingUnit {
  readonly sport: string;
  readonly market: string;
}

/** Unit key: "sport x market". */
export function unitKey(u: ReportingUnit): string {
  return u.sport + " x " + u.market;
}

/**
 * Availability identity: graded-pick counts needed per unit for 80% availability.
 * n such that P(grade the unit within the tolerance) >= 0.8, via the normal
 * approximation: n = ceil((z_0.9 * sigma / tolerance)^2), z_0.9 = 1.2816.
 */
export function picksNeededForAvailability(
  gradeSd: number,
  tolerance: number,
  availability = 0.8,
): number {
  const z = availability >= 0.8 ? 1.2816 : 1.0364; // 80% / 75% one-sided
  if (tolerance <= 0) return Infinity;
  return Math.ceil(Math.pow((z * Math.max(gradeSd, 1e-9)) / tolerance, 2));
}

export interface UnitCertificate {
  readonly unit: string;
  readonly gradedPicks: number;
  readonly needed: number;
  readonly availability: number;
  readonly certified: boolean;
}

/**
 * Certified badge rule: a market is only advertised with a track record once
 * its graded-pick count crosses the availability bar.
 */
export function certifyUnit(
  unit: ReportingUnit,
  gradedPicks: number,
  gradeSd: number,
  tolerance: number,
): UnitCertificate {
  const needed = picksNeededForAvailability(gradeSd, tolerance);
  const availability = needed > 0 ? Math.min(gradedPicks / needed, 1) : 1;
  return {
    unit: unitKey(unit),
    gradedPicks,
    needed,
    availability,
    certified: gradedPicks >= needed,
  };
}

export interface PostingPolicy {
  readonly id: string;
  /** Forward (held-out) weekly profits under this policy. */
  readonly forwardProfits: readonly number[];
}

/**
 * Held-out selection protocol: compare posting policies by forward performance
 * (mean forward profit), not by backtest-winner. Returns the ranking.
 */
export function heldOutSelection(
  policies: readonly PostingPolicy[],
): { id: string; meanForwardProfit: number }[] {
  return policies
    .map((p) => ({
      id: p.id,
      meanForwardProfit:
        p.forwardProfits.reduce((a, b) => a + b, 0) / Math.max(p.forwardProfits.length, 1),
    }))
    .sort((a, b) => b.meanForwardProfit - a.meanForwardProfit);
}

/**
 * Gate: >= 80% of per-market certificates granted on historical data must hold
 * on the forward 4-week window (validity), and at least one market must be
 * flagged uncertifiable-that-underperforms (the method must bite).
 */
export function availabilityGate(
  historical: readonly UnitCertificate[],
  forward: readonly UnitCertificate[],
  forwardUnderperforms: (unit: string) => boolean,
): { validityRate: number; bites: boolean; adopt: boolean } {
  const granted = historical.filter((c) => c.certified);
  const held = granted.filter((g) =>
    forward.some((f) => f.unit === g.unit && f.certified),
  ).length;
  const validityRate = granted.length > 0 ? held / granted.length : 1;
  const uncertified = historical.filter((c) => !c.certified).map((c) => c.unit);
  const bites = uncertified.some(forwardUnderperforms);
  return { validityRate, bites, adopt: validityRate >= 0.8 && bites };
}
