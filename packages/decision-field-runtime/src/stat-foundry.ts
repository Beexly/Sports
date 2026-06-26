/**
 * THE STAT FOUNDRY — statistics as living hypotheses (the living sports-stat institution).
 *
 * A world-class provider sells a number. The category-defining provider sells the number's GENEALOGY:
 * what it measures, how it's computed, what it knows, where it fails, which decisions it changes, what
 * authority it has earned, and whether it still deserves to exist. This module gives every GSE statistic
 * a `StatGenome` (its passport) and a scientific lifecycle, and implements the first flagship metrics —
 * computed from the PARALLAX Decision Object, so the Foundry is not a parallel system, it is the
 * existing engine wearing its scientific skin.
 *
 * HONESTY DISCIPLINE (the spine): a statistic computed only on FIXTURE data can never claim more than
 * EXPERIMENTAL. VALIDATED requires an out-of-sample confirmation sample; OFFICIAL requires owner
 * promotion. No metric here is VALIDATED or OFFICIAL — settled-n is 0 and the publish gate is HELD.
 *
 * Pure + deterministic. No I/O, no clock, no network, no live data. Spec: docs/frontier/13_STAT_FOUNDRY.md.
 */

import type { DecisionState } from "./decision-state.js";
import { type MaxPermittedStrength, rankOf, STRENGTH_BY_RANK } from "./decision-state-stat-contract.js";
import { type AuthorityVectorInput, type AuthorityLayer, composeAuthority, layerCeilings } from "./authority-vector.js";
import {
  type PFact,
  type Belief,
  type CreditVerdict,
  type Tick,
  forkWR1Availability,
  wr2Boundary,
  lightCone,
  PARALLAX_FIXTURE,
  FIXTURE_AUTHORITY,
} from "./parallax-instrument.js";

// ───────────────────────── The Stat Genome (the passport) ─────────────────────────
export type StatStatus = "CANDIDATE" | "EXPERIMENTAL" | "VALIDATED" | "OFFICIAL" | "DEGRADED" | "RETIRED";

/** The evidence a statistic has actually accrued. Caps the status it may claim. */
export type StatEvidence = "FIXTURE" | "SHADOW" | "OUT_OF_SAMPLE";

export interface StatGenome {
  readonly key: string;
  readonly name: string;
  readonly version: string;
  readonly questionAnswered: string;
  readonly formula: string;
  readonly unit: string;
  readonly decisionStatesSupported: readonly DecisionState[];
  readonly falsifier: string;
  readonly expectedFailureModes: readonly string[];
  /** Temporal policy: what must be knowable-at-T for this stat to be honest. */
  readonly knownAtRequirement: string;
  readonly uncertaintyMethod: string;
  /** The evidence accrued so far — fixtures cannot validate. */
  readonly evidence: StatEvidence;
  /** The status, which is CAPPED by `evidence` via `maxStatusForEvidence`. */
  readonly status: StatStatus;
  /** True only if a flagship metric is actually implemented (vs. designed/needs-data). */
  readonly implemented: boolean;
}

/** A statistic on fixture data can never exceed EXPERIMENTAL; shadow → EXPERIMENTAL; OOS → VALIDATED. */
export function maxStatusForEvidence(e: StatEvidence): StatStatus {
  switch (e) {
    case "FIXTURE":
    case "SHADOW":
      return "EXPERIMENTAL";
    case "OUT_OF_SAMPLE":
      return "VALIDATED"; // OFFICIAL still requires owner promotion (never automatic)
  }
}

/** Enforce the discipline: clamp a desired status to what the evidence licenses. */
export function clampStatus(desired: StatStatus, evidence: StatEvidence): StatStatus {
  const ORDER: StatStatus[] = ["CANDIDATE", "EXPERIMENTAL", "VALIDATED", "OFFICIAL"];
  const cap = maxStatusForEvidence(evidence);
  // DEGRADED/RETIRED are orthogonal (failure states) — pass through.
  if (desired === "DEGRADED" || desired === "RETIRED") return desired;
  const di = ORDER.indexOf(desired);
  const ci = ORDER.indexOf(cap);
  return di <= ci ? desired : cap;
}

// ───────────────────────── A computed flagship metric ─────────────────────────
export interface FlagshipMetric {
  readonly genome: StatGenome;
  readonly value: number | null; // null when the metric needs data we don't have on a fixture
  readonly display: string; // the plain-language "passport" line
  readonly detail: Readonly<Record<string, unknown>>;
}

// ───────────────────────── 1. Decision Boundary Distance (ρ) ─────────────────────────
/**
 * ρ(X) = the smallest change on the intervention axis required to flip the decision. The geometry of the
 * conclusion, not the conclusion. Computed from the PARALLAX boundary: baseline at WR1 snap=1; the read
 * flips at x*; ρ = 1 − x*.
 */
export function decisionBoundaryDistance(facts: readonly PFact[]): FlagshipMetric {
  const b = wr2Boundary(facts);
  const rho = b.flipsAt === null ? null : Math.round((1 - b.flipsAt) * 100) / 100;
  const genome = mkGenome({
    key: "decision_boundary_distance",
    name: "Decision Boundary Distance",
    version: "0.1.0-fixture",
    questionAnswered: "How small a change flips the decision?",
    formula: "rho = min ||delta|| such that a*(X+delta) != a*(X); here 1 - x* on the WR1-snap axis",
    unit: "snap-probability",
    decisionStatesSupported: ["WATCHLIST", "ROLE_UP_FANTASY_LATE", "PASS"],
    falsifier: "If moving the axis by rho does NOT flip the read (or a smaller move does), rho is wrong.",
    expectedFailureModes: ["single-axis only on the fixture", "ignores correlated conditions"],
    knownAtRequirement: "WR1 status fact knowable at T; else the boundary is undefined (refuse).",
    uncertaintyMethod: "grid sweep at 0.01 resolution (deterministic)",
    evidence: "FIXTURE",
  });
  return {
    genome,
    value: rho,
    display:
      rho === null
        ? "Boundary undefined — WR1 status not knowable yet."
        : `The read flips from ${b.fromRead.replace(/_/g, " ").toLowerCase()} to ${b.toRead.replace(/_/g, " ").toLowerCase()} with a ${rho} change in WR1's snap probability (x*=${b.flipsAt}).`,
    detail: { flipsAt: b.flipsAt, fromRead: b.fromRead, toRead: b.toRead },
  };
}

// ───────────────────────── 2. Counterfactual Robustness Radius ─────────────────────────
/**
 * How wide a region around the as-of point keeps the decision stable. A robust decision survives many
 * plausible worlds; a fragile one depends on one assumption. Here: the fraction of the snap-prob axis on
 * which the baseline read holds.
 */
export function counterfactualRobustnessRadius(facts: readonly PFact[]): FlagshipMetric {
  const base = forkWR1Availability(1, facts);
  let stable = 0;
  let total = 0;
  let baselineRead: DecisionState | null = null;
  if (base.ok) {
    const b = wr2Boundary(facts);
    baselineRead = b.fromRead;
    for (let i = 0; i <= 100; i++) {
      const f = forkWR1Availability(i / 100, facts);
      if (!f.ok) continue;
      total++;
      const r = wr2BoundaryReadAt(f.projection.point);
      if (r === baselineRead) stable++;
    }
  }
  const radius = total > 0 ? Math.round((stable / total) * 100) / 100 : null;
  const genome = mkGenome({
    key: "counterfactual_robustness_radius",
    name: "Counterfactual Robustness Radius",
    version: "0.1.0-fixture",
    questionAnswered: "How many plausible worlds keep the same decision?",
    formula: "fraction of the intervention axis on which a*(X) is unchanged",
    unit: "fraction [0,1]",
    decisionStatesSupported: ["WATCHLIST", "PASS", "ROLE_UP_FANTASY_LATE"],
    falsifier: "If a decision with high radius flips under a small in-range perturbation, the radius is wrong.",
    expectedFailureModes: ["single-axis proxy on the fixture", "uniform prior over the axis"],
    knownAtRequirement: "WR1 status knowable at T.",
    uncertaintyMethod: "grid coverage (deterministic)",
    evidence: "FIXTURE",
  });
  return {
    genome,
    value: radius,
    display:
      radius === null
        ? "Robustness undefined — status not knowable yet."
        : `The ${(baselineRead ?? "decision").toString().replace(/_/g, " ").toLowerCase()} holds across ${Math.round(radius * 100)}% of plausible WR1-availability worlds.`,
    detail: { stable, total, baselineRead },
  };
}

// ───────────────────────── 3. Opportunity Transfer Matrix ─────────────────────────
/** ΔO_j = O_vacated · w_j — where opportunity mass goes when a player's role changes. Conserved. */
export function opportunityTransferMatrix(snapProbability: number, facts: readonly PFact[]): FlagshipMetric {
  const f = forkWR1Availability(snapProbability, facts);
  const genome = mkGenome({
    key: "opportunity_transfer_matrix",
    name: "Opportunity Transfer Matrix",
    version: "0.1.0-fixture",
    questionAnswered: "When a role changes, where does the opportunity go?",
    formula: "deltaO_j = O_vacated * w_j, with sum_j w_j = 1 (conserves team target mass)",
    unit: "target share",
    decisionStatesSupported: ["ROLE_UP_FANTASY_LATE", "ROLE_MASS_MISALLOCATED", "DFS_SALARY_LAG"],
    falsifier: "If the redistributed shares do not sum back to the pre-fork team total, the matrix is invalid.",
    expectedFailureModes: ["fixture redistribution weights are priors, not estimated", "ignores game-script shift"],
    knownAtRequirement: "WR1 status knowable at T.",
    uncertaintyMethod: "conservation check (residual < 1e-9)",
    evidence: "FIXTURE",
  });
  if (!f.ok) {
    return { genome, value: null, display: `Cannot map opportunity — ${f.detail}`, detail: { reason: f.reason } };
  }
  const deltas: Record<string, number> = {};
  for (const [p, v] of Object.entries(f.shareAfter)) {
    const before = f.shareBefore[p] ?? 0;
    deltas[p] = Math.round((v - before) * 1000) / 1000;
  }
  return {
    genome,
    value: f.conservationResidual,
    display: `WR1 vacates ${(f.shareBefore.WR1 ?? 0).toFixed(2)} share at snap ${snapProbability}; it flows to ${Object.entries(deltas).filter(([, d]) => d > 0).map(([k, d]) => `${k} +${d}`).join(", ")}. Σ conserved.`,
    detail: { deltas, conservationResidual: f.conservationResidual },
  };
}

// ───────────────────────── 4. Authority Margin ─────────────────────────
/** How far the evidence is from the next stronger expression, and the binding layer + what's missing. */
export function authorityMargin(v: AuthorityVectorInput): FlagshipMetric {
  const c = composeAuthority(v);
  const ceilings = layerCeilings(v);
  const curRank = rankOf(c.ceiling);
  const nextRank = Math.min(curRank + 1, STRENGTH_BY_RANK.length - 1);
  const next = STRENGTH_BY_RANK[nextRank] as MaxPermittedStrength;
  // which layers would have to lift for the ceiling to rise one rung
  const blocking = c.bindingLayers.filter((l: AuthorityLayer) => rankOf(ceilings[l]) <= curRank);
  const margin = curRank === nextRank ? 0 : 1;
  const genome = mkGenome({
    key: "authority_margin",
    name: "Authority Margin",
    version: "0.1.0-fixture",
    questionAnswered: "How far is the evidence from the next stronger thing we may say?",
    formula: "rungs from compose(v).ceiling to the next strength; the binding layer(s) are the blockers",
    unit: "lattice rungs",
    decisionStatesSupported: ["WATCHLIST", "NEEDS_LIVE_DATA", "ACTIONABLE"],
    falsifier: "If lifting every named blocking layer does NOT raise the ceiling, the margin is wrong.",
    expectedFailureModes: ["reports only the immediate next rung"],
    knownAtRequirement: "the eight authority layers' operational reality.",
    uncertaintyMethod: "lattice meet (exact)",
    evidence: "FIXTURE",
  });
  return {
    genome,
    value: margin,
    display:
      curRank >= rankOf("PUBLIC_ACTION")
        ? `At the top of the lattice (${c.ceiling}).`
        : `Current ceiling ${c.ceiling}; next ${next}. Blocked by ${blocking.join(", ")} — lift it to climb one rung.`,
    detail: { ceiling: c.ceiling, next, blockingLayers: blocking },
  };
}

// ───────────────────────── 5. Observer Lag Vector ─────────────────────────
/** L_o = t_observed − t_reality-change. Who reacted first, who late. */
export function observerLagVector(beliefs: readonly Belief[], realityChangeTick: Tick): FlagshipMetric {
  const lags = beliefs.map((b) => ({ observer: b.observer, lag: b.observedAt - realityChangeTick }));
  const genome = mkGenome({
    key: "observer_lag_vector",
    name: "Observer Lag Vector",
    version: "0.1.0-fixture",
    questionAnswered: "Which observer reacted first, which late?",
    formula: "L_o = t_o_update − t_reality_change (in fixture ticks)",
    unit: "ticks",
    decisionStatesSupported: ["PLAYER_PROP_MARKET_LAG" as DecisionState, "PUBLIC_OVERREACTION", "GOOD_IDEA_BAD_PRICE"],
    falsifier: "If an observer with negative lag actually updated AFTER the reality change, the timestamps are wrong.",
    expectedFailureModes: ["depends on faithful observedAt capture (point-in-time)"],
    knownAtRequirement: "each observer's update timestamp and the reality-change timestamp.",
    uncertaintyMethod: "exact tick differences",
    evidence: "FIXTURE",
  });
  return {
    genome,
    value: lags.length ? Math.min(...lags.map((l) => l.lag)) : null,
    display: lags.map((l) => `${l.observer} ${l.lag <= 0 ? "early/at" : "late"} (${l.lag >= 0 ? "+" : ""}${l.lag})`).join(" · "),
    detail: { lags },
  };
}

// ───────────────────────── 6. Belief Independence Score ─────────────────────────
/** Distinct evidence origins ÷ observers. Ten sources echoing one origin are not ten confirmations. */
export function beliefIndependenceScore(beliefs: readonly Belief[]): FlagshipMetric {
  const origins = new Set(beliefs.map((b) => b.source.replace(/\(fixture\)/, "").trim()));
  const score = beliefs.length ? Math.round((origins.size / beliefs.length) * 100) / 100 : null;
  const genome = mkGenome({
    key: "belief_independence_score",
    name: "Belief Independence Score",
    version: "0.1.0-fixture",
    questionAnswered: "Is the apparent agreement independent evidence or copies of one origin?",
    formula: "distinct evidence origins / number of observers",
    unit: "fraction [0,1]",
    decisionStatesSupported: ["PUBLIC_OVERREACTION", "DATA_CONFLICT"],
    falsifier: "If observers with distinct sources are shown to share an upstream origin, the score is overstated.",
    expectedFailureModes: ["origin labels are coarse on the fixture", "no upstream-provenance graph yet"],
    knownAtRequirement: "each observer's evidence source/origin.",
    uncertaintyMethod: "set cardinality (exact)",
    evidence: "FIXTURE",
  });
  return {
    genome,
    value: score,
    display: score === null ? "No observers." : `${origins.size} distinct origins across ${beliefs.length} observers → independence ${score}.`,
    detail: { origins: [...origins] },
  };
}

// ───────────────────────── 7. Refusal Alpha (needs settled data — CANDIDATE) ─────────────────────────
/** Value preserved by NOT acting = avoided-bad − falsely-suppressed, over credit verdicts. */
export function refusalAlpha(verdicts: readonly CreditVerdict[]): FlagshipMetric {
  const avoidedBad = verdicts.filter((v) => v === "CORRECTLY_REFUSED").length;
  const falselySuppressed = verdicts.filter((v) => v === "WRONGLY_REFUSED").length;
  const value = verdicts.length ? avoidedBad - falselySuppressed : null;
  const genome = mkGenome({
    key: "refusal_alpha",
    name: "Refusal Alpha",
    version: "0.1.0-fixture",
    questionAnswered: "How much value did our refusals preserve?",
    formula: "RA = avoided_bad_decisions − valuable_decisions_falsely_suppressed",
    unit: "decisions",
    decisionStatesSupported: ["PASS", "TRAP", "NEEDS_LIVE_DATA"],
    falsifier: "If suppressed decisions would have won at a rate ≥ acted ones, refusal alpha is negative.",
    expectedFailureModes: ["needs settled outcomes — not earnable on fixtures", "selection bias in what we refuse"],
    knownAtRequirement: "settled outcomes for both acted and refused decisions.",
    uncertaintyMethod: "count (point estimate; needs interval at scale)",
    evidence: "FIXTURE",
  });
  return {
    genome: { ...genome, status: "CANDIDATE", implemented: false }, // honest: structurally computable, but meaningless without settled data
    value,
    display: `Refusal Alpha needs settled outcomes (settled-n = 0). Structure ready: avoided-bad − falsely-suppressed.`,
    detail: { avoidedBad, falselySuppressed },
  };
}

// ───────────────────────── The flagship registry (all ten, honest about which are built) ─────────────────────────
/** The ten flagship genomes. Built ones carry an implementation; the rest are CANDIDATE (need live/settled data). */
export const FLAGSHIP_STATS: readonly StatGenome[] = [
  decisionBoundaryDistance(lightCone(PARALLAX_FIXTURE.facts, 3)).genome,
  counterfactualRobustnessRadius(lightCone(PARALLAX_FIXTURE.facts, 3)).genome,
  observerLagVector(PARALLAX_FIXTURE.beliefs, 2).genome,
  beliefIndependenceScore(PARALLAX_FIXTURE.beliefs).genome,
  opportunityTransferMatrix(0, lightCone(PARALLAX_FIXTURE.facts, 3)).genome,
  refusalAlpha([]).genome,
  authorityMargin(FIXTURE_AUTHORITY).genome,
  // designed, not implemented (need live/settled data) — registered honestly as CANDIDATE:
  mkGenome({
    key: "action_half_life",
    name: "Action Half-Life",
    version: "0.0.0-design",
    questionAnswered: "How long until half the decision's value decays?",
    formula: "t such that E[value(t)] = 0.5 · value(0), by decision type",
    unit: "time",
    decisionStatesSupported: ["GOOD_IDEA_BAD_PRICE", "TOO_LATE"],
    falsifier: "If realized value at the predicted half-life is far from 50%, the decay model is wrong.",
    expectedFailureModes: ["needs settled value-decay curves per decision type"],
    knownAtRequirement: "time-resolved realized value of past decisions.",
    uncertaintyMethod: "survival/half-life fit (needs data)",
    evidence: "FIXTURE",
    status: "CANDIDATE",
    implemented: false,
  }),
  mkGenome({
    key: "source_marginal_value",
    name: "Source Marginal Value",
    version: "0.0.0-design",
    questionAnswered: "What is one source worth, by ablation?",
    formula: "E[ΔU + ΔR + ΔP + ΔM] − C − L − K (approx. Shapley across sources at scale)",
    unit: "utility",
    decisionStatesSupported: ["DATA_CONFLICT", "NEEDS_LIVE_DATA"],
    falsifier: "If removing a 'high-value' source does not degrade decisions/refusals, its value is overstated.",
    expectedFailureModes: ["needs live multi-source decisions to ablate"],
    knownAtRequirement: "decisions computed with and without each source.",
    uncertaintyMethod: "ablation / Shapley (needs data)",
    evidence: "FIXTURE",
    status: "CANDIDATE",
    implemented: false,
  }),
  mkGenome({
    key: "market_maturity",
    name: "Market Bloom & Maturity",
    version: "0.0.0-design",
    questionAnswered: "Where is this market in its lifecycle?",
    formula: "state machine UNBORN→OPENED→THIN→BROADENING→MATURE→MOVING→CAUGHT_UP→STALE→CLOSED",
    unit: "lifecycle state",
    decisionStatesSupported: ["GOOD_IDEA_BAD_PRICE", "TOO_LATE", "PLAYER_PROP_MARKET_LAG" as DecisionState],
    falsifier: "If a market labeled MATURE shows opening-width spreads, the classifier is wrong.",
    expectedFailureModes: ["needs live timestamped book snapshots"],
    knownAtRequirement: "time-series of book prices/limits.",
    uncertaintyMethod: "state classifier (needs data)",
    evidence: "FIXTURE",
    status: "CANDIDATE",
    implemented: false,
  }),
];

// ───────────────────────── helpers ─────────────────────────
function wr2BoundaryReadAt(projectionPoint: number): DecisionState {
  // Mirror of wr2Read's thresholds (kept local to avoid a circular intent); line 52.5 fixture.
  const edge = projectionPoint - 52.5;
  if (edge >= 4) return "ROLE_UP_FANTASY_LATE";
  if (edge >= 1) return "WATCHLIST";
  return "PASS";
}

function mkGenome(g: {
  key: string;
  name: string;
  version: string;
  questionAnswered: string;
  formula: string;
  unit: string;
  decisionStatesSupported: readonly DecisionState[];
  falsifier: string;
  expectedFailureModes: readonly string[];
  knownAtRequirement: string;
  uncertaintyMethod: string;
  evidence: StatEvidence;
  status?: StatStatus;
  implemented?: boolean;
}): StatGenome {
  const desired = g.status ?? "EXPERIMENTAL";
  return {
    key: g.key,
    name: g.name,
    version: g.version,
    questionAnswered: g.questionAnswered,
    formula: g.formula,
    unit: g.unit,
    decisionStatesSupported: g.decisionStatesSupported,
    falsifier: g.falsifier,
    expectedFailureModes: g.expectedFailureModes,
    knownAtRequirement: g.knownAtRequirement,
    uncertaintyMethod: g.uncertaintyMethod,
    evidence: g.evidence,
    status: clampStatus(desired, g.evidence), // the discipline: fixtures cannot exceed EXPERIMENTAL
    implemented: g.implemented ?? true,
  };
}
