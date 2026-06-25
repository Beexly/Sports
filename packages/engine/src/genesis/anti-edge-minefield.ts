/**
 * GENESIS LAYER — Anti-Edge Minefield (Invention 59).
 *
 * Maps the places where apparent edge usually DIES: spread/vig/latency, ownership overcorrection, a
 * waiver cost too high, impossible trade liquidity, role fragility, injury uncertainty, public
 * narrative contamination, small samples, and ghost similarity. An apparent edge is walked through
 * the minefield; each active mine subtracts from it, and some are fatal. Pure + deterministic.
 */

export type MineKind =
  | "friction_spread_vig_latency" | "ownership_overcorrection" | "waiver_cost_too_high"
  | "trade_liquidity_impossible" | "role_fragility" | "injury_uncertainty"
  | "narrative_contamination" | "small_sample" | "ghost_similarity";

export interface MineReading {
  readonly kind: MineKind;
  readonly pressure: number; // 0..1 how active this death-trap is
}

export interface MinefieldInput {
  readonly candidateEdge: number; // 0..1 apparent edge before the minefield
  readonly mines: readonly MineReading[];
}

const MINE_WEIGHT: Record<MineKind, number> = {
  friction_spread_vig_latency: 0.5, ownership_overcorrection: 0.4, waiver_cost_too_high: 0.4,
  trade_liquidity_impossible: 0.5, role_fragility: 0.5, injury_uncertainty: 0.4,
  narrative_contamination: 0.4, small_sample: 0.5, ghost_similarity: 1.0,
};

// Mines that, above their cutoff, kill the edge outright (correctness, not magnitude).
const FATAL: Partial<Record<MineKind, number>> = { ghost_similarity: 0.6, role_fragility: 0.8, trade_liquidity_impossible: 0.8 };

export interface MinefieldResult {
  readonly survivingEdge: number;
  readonly triggeredMines: ReadonlyArray<{ kind: MineKind; loss: number }>;
  readonly fatalMine: MineKind | null;
  readonly survives: boolean;
  readonly note: string;
}

/** Walk an apparent edge through the minefield; return what survives and where it died. */
export function mapMinefield(i: MinefieldInput): MinefieldResult {
  let fatal: MineKind | null = null;
  const triggered: Array<{ kind: MineKind; loss: number }> = [];
  let edge = i.candidateEdge;
  for (const m of i.mines) {
    const cutoff = FATAL[m.kind];
    if (cutoff != null && m.pressure >= cutoff) fatal = fatal ?? m.kind;
    const loss = Number((m.pressure * MINE_WEIGHT[m.kind]).toFixed(4));
    if (loss > 0) triggered.push({ kind: m.kind, loss });
    edge -= loss;
  }
  const survivingEdge = fatal ? 0 : Number(Math.max(0, edge).toFixed(4));
  const survives = !fatal && survivingEdge > 0;
  return {
    survivingEdge,
    triggeredMines: triggered.sort((a, b) => b.loss - a.loss),
    fatalMine: fatal,
    survives,
    note: fatal
      ? `Edge killed outright by a fatal mine (${fatal}).`
      : survives
        ? `Edge survives the minefield with ${survivingEdge} remaining.`
        : "Edge eroded to zero by accumulated frictions.",
  };
}
