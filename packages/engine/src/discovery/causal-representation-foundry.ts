/**
 * DISCOVERY LAYER — Causal Representation Foundry (Invention 27).
 *
 * The frontier question is not "more stats" but "are these the right variables at all?" A WR injury
 * is not one shock — it may be target-redistribution, route-tree-collapse, defensive-attention-
 * release, QB-efficiency-volatility, and public-overreaction shocks at once. This separates
 * observed variables into cause-related / effect-related / non-causal (by lead-lag + correlation),
 * and proposes a NAMED latent factor only when several surface variables collapse into one — i.e.
 * only when it improves compression. Latent structure inferred from association is NOT ground truth;
 * every proposal carries that caveat. Pure + deterministic.
 */

export type CausalRole = "cause" | "effect" | "non_causal";

export interface VariableObservation {
  readonly name: string;
  /** Lead/lag vs the target in ms: negative = leads (cause-like), positive = lags (effect-like). */
  readonly leadLagMs: number;
  /** Correlation with the target in [-1,1]. */
  readonly correlation: number;
}

/** Classify a variable's causal role relative to a target by lead/lag and association strength. */
export function classifyCausalRole(v: VariableObservation, options: { minCorr?: number; leadThresholdMs?: number } = {}): CausalRole {
  const minCorr = options.minCorr ?? 0.2;
  const leadThr = options.leadThresholdMs ?? 30_000;
  if (Math.abs(v.correlation) < minCorr) return "non_causal";
  if (v.leadLagMs <= -leadThr) return "cause";
  if (v.leadLagMs >= leadThr) return "effect";
  return "non_causal"; // contemporaneous + associated → confounded, treat as non-causal until tested
}

export interface LatentFactorProposal {
  readonly name: string;
  readonly memberVariables: readonly string[];
  /** Compression gain: (members − 1) latent dimensions saved, scaled by shared variance. */
  readonly compressionGain: number;
  readonly sharedVarianceProxy: number;
  readonly accepted: boolean;
  readonly caveat: string;
}

/**
 * Propose a latent factor from a cluster of co-moving variables. Accepted ONLY if it collapses ≥2
 * variables AND shared variance clears the bar — naming a hidden state must earn its keep by
 * compression, not vocabulary. `sharedVarianceProxy` is the caller's measure of common movement (0..1).
 */
export function proposeLatentFactor(args: {
  proposedName: string;
  members: readonly string[];
  sharedVarianceProxy: number;
  minMembers?: number;
  minSharedVariance?: number;
}): LatentFactorProposal {
  const minMembers = args.minMembers ?? 2;
  const minShared = args.minSharedVariance ?? 0.5;
  const accepted = args.members.length >= minMembers && args.sharedVarianceProxy >= minShared;
  return {
    name: args.proposedName,
    memberVariables: args.members,
    compressionGain: accepted ? (args.members.length - 1) * args.sharedVarianceProxy : 0,
    sharedVarianceProxy: args.sharedVarianceProxy,
    accepted,
    caveat: "Latent inferred from association/lead-lag, not ground truth — must survive a falsifying experiment before use.",
  };
}

/** Decompose a labeled surface shock into candidate hidden shock classes (e.g. a WR injury). */
export function decomposeShock(label: string): string[] {
  const map: Record<string, string[]> = {
    wr_injury: ["target_redistribution_shock", "route_tree_collapse_shock", "defensive_attention_release_shock", "qb_efficiency_volatility_shock", "public_overreaction_shock"],
    rb_injury: ["carry_redistribution_shock", "passing_down_role_shock", "goal_line_role_shock", "public_overreaction_shock"],
    qb_downgrade: ["passing_volume_shock", "receiver_ceiling_shock", "script_run_lean_shock", "team_total_shock"],
  };
  return map[label] ?? [`${label}_primary_shock`];
}
