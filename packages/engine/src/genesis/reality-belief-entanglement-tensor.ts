/**
 * GENESIS LAYER — Reality-Belief Entanglement Tensor (Invention 44).
 *
 * The unified field. Football reality, sportsbook prices, props, alt lines, fantasy projections,
 * analyst ranks, DFS salary, ownership, waiver/roster behavior, trade/dynasty value, best-ball ADP,
 * and league managers are not separate systems — they are different SENSORS reading the same role
 * reality. Every observer is a scientific instrument; the edge exists when one updates late, wrong,
 * too much, or for the wrong reason. RBET stores each observer's implied role state and measures the
 * residual against truth and the contradictions across surfaces. Pure + deterministic.
 */

export type Observer =
  | "sportsbook" | "prop_market" | "alt_line" | "fantasy_platform" | "analyst"
  | "dfs_salary" | "dfs_ownership" | "waiver_roster" | "trade_dynasty" | "bestball_adp"
  | "league_manager" | "gse";

export interface ObserverReading {
  readonly observer: Observer;
  /** 0..1 implied role state inferred from this observer's price/rank/ownership. */
  readonly impliedRoleState: number;
  /** 0..1 data quality of this reading. */
  readonly dataQuality: number;
  readonly asOf?: string;
}

export interface RBETInput {
  readonly entity: string;        // player / team
  readonly trueRoleState: number; // 0..1 GSE's best estimate of role reality
  readonly readings: readonly ObserverReading[];
}

export type ResidualDirection = "lag" | "overreaction" | "aligned";

export interface ObserverResidual {
  readonly observer: Observer;
  readonly residual: number; // impliedRoleState − trueRoleState (signed)
  readonly direction: ResidualDirection;
  readonly weightedByQuality: number;
}

export interface RBETResult {
  readonly entity: string;
  readonly residuals: readonly ObserverResidual[];
  /** Mean pairwise |implied_i − implied_j| across observers. */
  readonly crossSurfaceContradiction: number;
  readonly maxDisagreementPair: { readonly a: Observer; readonly b: Observer; readonly gap: number } | null;
  readonly laggards: readonly Observer[];     // most under-reacted (residual ≤ −threshold)
  readonly overreactors: readonly Observer[]; // most over-reacted (residual ≥ +threshold)
  readonly note: string;
}

/** Build the entanglement tensor for one entity and surface its disagreements. */
export function computeRBET(input: RBETInput, opts: { threshold?: number } = {}): RBETResult {
  const t = opts.threshold ?? 0.1;
  const residuals: ObserverResidual[] = input.readings.map((r) => {
    const residual = Number((r.impliedRoleState - input.trueRoleState).toFixed(4));
    const direction: ResidualDirection = residual <= -t ? "lag" : residual >= t ? "overreaction" : "aligned";
    return { observer: r.observer, residual, direction, weightedByQuality: Number((residual * r.dataQuality).toFixed(4)) };
  });

  let pairSum = 0, pairCount = 0;
  let maxPair: RBETResult["maxDisagreementPair"] = null;
  for (let i = 0; i < input.readings.length; i++) {
    for (let j = i + 1; j < input.readings.length; j++) {
      const gap = Math.abs(input.readings[i]!.impliedRoleState - input.readings[j]!.impliedRoleState);
      pairSum += gap; pairCount += 1;
      if (!maxPair || gap > maxPair.gap) maxPair = { a: input.readings[i]!.observer, b: input.readings[j]!.observer, gap: Number(gap.toFixed(4)) };
    }
  }
  const crossSurfaceContradiction = pairCount > 0 ? Number((pairSum / pairCount).toFixed(4)) : 0;

  const laggards = residuals.filter((r) => r.direction === "lag").sort((a, b) => a.residual - b.residual).map((r) => r.observer);
  const overreactors = residuals.filter((r) => r.direction === "overreaction").sort((a, b) => b.residual - a.residual).map((r) => r.observer);

  return {
    entity: input.entity,
    residuals,
    crossSurfaceContradiction,
    maxDisagreementPair: maxPair,
    laggards,
    overreactors,
    note: `${laggards.length} laggard(s), ${overreactors.length} overreactor(s); cross-surface contradiction ${crossSurfaceContradiction}.`,
  };
}
