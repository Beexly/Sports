/**
 * BioDisco pre-execution evidence + critic stage —
 * arXiv 2508.01285v2 ("BioDisco: Multi-agent hypothesis generation with
 * dual-mode evidence, iterative feedback and temporal evaluation").
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes
 * predictions and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: hypothesis generation with DUAL-MODE evidence
 * (structured database grounding + literature novelty search), an
 * iterative critic that scores novelty/verifiability and feeds back
 * before expensive validation runs, and TEMPORAL evaluation — can the
 * pipeline re-discover known edges from historical data before trusting it
 * on fresh ones?
 *
 * Improvement (record): GSE adds a pre-execution evidence + critic stage
 * to its discovery loop: every hypothesis gets dual-mode grounding
 * (structured nflverse base-rate checks + literature novelty search) and
 * a critic score on novelty and verifiability before backtest compute is
 * spent.
 *
 * ACCEPTANCE GATE: ADOPT if arm B's gate-pass rate >= arm A's while using
 * <=60% of the backtest compute, the temporal-rediscovery check recovers
 * >=2/3 known edges, and Bradley-Terry ratings rank-order signals
 * consistently after 4 weeks. (Gate requires nightly discovery budget +
 * known-edge list; run via the discovery harness.)
 */

export interface Hypothesis {
  readonly id: string;
  readonly statement: string;
  /** Lane: weather, special-teams, referee-crews, injuries, ... */
  readonly lane: string;
  /** Claimed effect size (e.g. ATS points) and direction. */
  readonly claimedEffect: number;
  /** Minimum sample size the proposer claims supports this. */
  readonly claimedN: number;
}

/** Structured (nflverse) grounding: base-rate checks on the claim. */
export interface StructuredGrounding {
  /** Empirical base rate of the claimed event in nflverse data. */
  readonly empiricalBaseRate: number;
  /** Sample size behind that base rate. */
  readonly empiricalN: number;
  /** Is the claimed effect size within a plausible multiple of noise? */
  readonly plausibleVsNoise: boolean;
}

/** Literature grounding: novelty search result (stubbed; search stays out). */
export interface LiteratureGrounding {
  /** Papers/signals in the corpus overlapping this hypothesis. */
  readonly overlappingCorpusHits: number;
  /** Highest similarity to any existing GSE signal (0..1). */
  readonly maxExistingSimilarity: number;
}

export interface DualModeGrounding {
  readonly structured: StructuredGrounding;
  readonly literature: LiteratureGrounding;
}

export interface CriticScore {
  readonly hypothesisId: string;
  /** 0..1 — 1 = nothing like it in the corpus. */
  readonly novelty: number;
  /** 0..1 — 1 = falsifiable, has base rates, testable in one backtest. */
  readonly verifiability: number;
  /** 0..1 — combined gate input. */
  readonly combined: number;
  /** Passes the pre-execution bar? */
  readonly admitted: boolean;
  readonly rationale: string[];
}

export interface CriticThresholds {
  readonly minNovelty: number;
  readonly minVerifiability: number;
  readonly minCombined: number;
}

export const DEFAULT_THRESHOLDS: CriticThresholds = {
  minNovelty: 0.4,
  minVerifiability: 0.5,
  minCombined: 0.5,
};

/**
 * Critic score: novelty decays with corpus overlap / similarity to existing
 * signals; verifiability requires a real base rate, enough claimed N, and a
 * noise-plausible effect. Deterministic — the LLM critic's rubric, coded.
 */
export function criticScore(
  h: Hypothesis,
  g: DualModeGrounding,
  t: CriticThresholds = DEFAULT_THRESHOLDS,
): CriticScore {
  const rationale: string[] = [];
  const novelty = Math.max(
    0,
    Math.min(
      1,
      1 -
        g.literature.maxExistingSimilarity * 0.7 -
        Math.min(g.literature.overlappingCorpusHits, 5) * 0.06,
    ),
  );
  if (novelty < t.minNovelty)
    rationale.push(
      `novelty ${novelty.toFixed(2)} below ${t.minNovelty}: too close to existing signals/corpus`,
    );
  let verifiability = 0;
  let hardVeto = false;
  if (g.structured.empiricalBaseRate > 0 && g.structured.empiricalN >= 30)
    verifiability += 0.4;
  else rationale.push("verifiability: base rate missing or N<30");
  if (h.claimedN >= 30) verifiability += 0.3;
  else {
    // Underpowered claims are a hard veto: no backtest compute is spent.
    rationale.push("verifiability: claimed N<30 (hard veto)");
    hardVeto = true;
  }
  if (g.structured.plausibleVsNoise) verifiability += 0.3;
  else rationale.push("verifiability: effect not plausible vs noise");
  if (hardVeto) verifiability = Math.min(verifiability, 0.4);
  if (verifiability < t.minVerifiability)
    rationale.push(
      `verifiability ${verifiability.toFixed(2)} below ${t.minVerifiability}`,
    );
  const combined = 0.5 * novelty + 0.5 * verifiability;
  const admitted =
    novelty >= t.minNovelty &&
    verifiability >= t.minVerifiability &&
    combined >= t.minCombined;
  if (admitted) rationale.push("admitted: passes dual-mode critic bar");
  return {
    hypothesisId: h.id,
    novelty,
    verifiability,
    combined,
    admitted,
    rationale,
  };
}

export interface ComputeBudget {
  /** Backtest compute units spent. */
  spent: number;
  /** Cap for this arm/night. */
  cap: number;
}

/** Track backtest compute: only admitted hypotheses spend budget. */
export function spendBudget(
  budget: ComputeBudget,
  scores: readonly CriticScore[],
  costPerBacktest: number,
): ComputeBudget {
  const admitted = scores.filter((s) => s.admitted).length;
  return {
    spent: budget.spent + admitted * costPerBacktest,
    cap: budget.cap,
  };
}

/**
 * Temporal-rediscovery check (BioDisco temporal evaluation): hide known
 * edges in historical data and require the pipeline to re-discover >=2/3.
 */
export function temporalRediscoveryCheck(
  knownEdges: readonly string[],
  rediscovered: readonly string[],
): { readonly fraction: number; readonly passes: boolean } {
  if (knownEdges.length === 0) return { fraction: 0, passes: false };
  const found = new Set(rediscovered);
  const hit = knownEdges.filter((e) => found.has(e)).length;
  const fraction = hit / knownEdges.length;
  return { fraction, passes: fraction >= 2 / 3 };
}

/**
 * Bradley-Terry rating update for pairwise signal comparisons (arm B's
 * critic-scored signals vs arm A's raw ones). Returns the winner's rating
 * delta; positive = winner gained.
 */
export function bradleyTerryUpdate(
  ratingWinner: number,
  ratingLoser: number,
  k = 16,
): number {
  const expected = 1 / (1 + Math.pow(10, (ratingLoser - ratingWinner) / 400));
  return k * (1 - expected);
}

/**
 * Gate check from the record: arm B (critic-gated) gate-pass rate >= arm A
 * at <=60% of the compute, temporal rediscovery >=2/3.
 */
export function passesBioDiscoGate(
  armAPassRate: number,
  armBPassRate: number,
  armACompute: number,
  armBCompute: number,
  rediscoveryFraction: number,
): boolean {
  const computeRatio = armACompute > 0 ? armBCompute / armACompute : Infinity;
  return (
    armBPassRate >= armAPassRate &&
    computeRatio <= 0.6 &&
    rediscoveryFraction >= 2 / 3
  );
}
