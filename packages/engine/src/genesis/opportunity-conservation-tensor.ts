/**
 * GENESIS LAYER — Opportunity Conservation Tensor (Invention 47).
 *
 * Football opportunity must conserve. A team has only so many plays, dropbacks, routes, targets,
 * carries, air yards, red-zone and goal-line touches, and touchdowns. When a role shock happens the
 * question is "where did the opportunity MASS go?" — removed = redistributed + strategy shift +
 * efficiency decay + opponent effect. A residual means missing or misallocated mass: an
 * over-credited backup, an ignored sibling, a fake boost. This is the unifying bridge between
 * betting and fantasy. Pure + deterministic.
 */

export type OpportunityChannel =
  | "plays" | "dropbacks" | "routes" | "targets" | "carries" | "air_yards"
  | "red_zone" | "goal_line" | "touchdowns" | "high_value";

export interface ChannelConservation {
  readonly channel: OpportunityChannel;
  readonly removed: number;         // 0..1 share removed by the shock
  readonly redistributed: number;   // 0..1 share captured by teammates
  readonly strategyShift: number;   // 0..1 (run/pass-rate change absorbed it)
  readonly efficiencyDecay: number; // 0..1 (lower team efficiency)
  readonly opponentEffect: number;  // 0..1 (opponent / pace)
}

export type ConservationFlag = "missing_role_mass" | "over_allocated" | "balanced";

export interface ConservationResidualResult {
  readonly channel: OpportunityChannel;
  readonly residual: number; // removed − accounted
  readonly flag: ConservationFlag;
  readonly note: string;
}

/** Check one channel: does the accounted-for opportunity reconcile with what was removed? */
export function checkOpportunityConservation(c: ChannelConservation, tol = 0.1): ConservationResidualResult {
  const accounted = c.redistributed + c.strategyShift + c.efficiencyDecay + c.opponentEffect;
  const residual = Number((c.removed - accounted).toFixed(4));
  const flag: ConservationFlag = residual > tol ? "missing_role_mass" : residual < -tol ? "over_allocated" : "balanced";
  return {
    channel: c.channel,
    residual,
    flag,
    note: flag === "missing_role_mass"
      ? `Removed ${c.removed.toFixed(2)} but only ${accounted.toFixed(2)} accounted — an under-credited sibling holds the missing mass.`
      : flag === "over_allocated"
        ? `Accounted ${accounted.toFixed(2)} exceeds removed ${c.removed.toFixed(2)} — fake boost / over-credited backup.`
        : "Opportunity conserves — coherent.",
  };
}

/** Run a batch of channels and return the non-balanced violations, worst-first. */
export function findConservationViolations(channels: readonly ChannelConservation[], tol = 0.1): ConservationResidualResult[] {
  return channels.map((c) => checkOpportunityConservation(c, tol)).filter((r) => r.flag !== "balanced").sort((a, b) => Math.abs(b.residual) - Math.abs(a.residual));
}

export interface MisallocationResult {
  readonly player: string;
  readonly publicCredit: number;
  readonly actualShare: number;
  readonly gap: number; // publicCredit − actualShare
  readonly verdict: "over_credited" | "under_credited" | "fair";
}

/** Compare public credit to actual inherited share to find the over-credited backup and ignored sibling. */
export function detectRoleMassMisallocation(publicCredit: Readonly<Record<string, number>>, actualShare: Readonly<Record<string, number>>, tol = 0.08): MisallocationResult[] {
  const players = new Set([...Object.keys(publicCredit), ...Object.keys(actualShare)]);
  return [...players]
    .map((player) => {
      const pc = publicCredit[player] ?? 0;
      const as = actualShare[player] ?? 0;
      const gap = Number((pc - as).toFixed(4));
      const verdict: MisallocationResult["verdict"] = gap > tol ? "over_credited" : gap < -tol ? "under_credited" : "fair";
      return { player, publicCredit: pc, actualShare: as, gap, verdict };
    })
    .sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap));
}
