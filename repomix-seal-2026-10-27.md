This file is a merged representation of a subset of the codebase, containing specifically included files and files not matching ignore patterns, combined into a single document by Repomix.
The content has been processed where content has been compressed (code blocks are separated by ⋮---- delimiter).

# File Summary

## Purpose
This file contains a packed representation of a subset of the repository's contents that is considered the most important context.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.

## File Format
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Repository files (if enabled)
5. Multiple file entries, each consisting of:
  a. A header with the file path (## File: path/to/file)
  b. The full contents of the file in a code block

## Usage Guidelines
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.

## Notes
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Only files matching these patterns are included: packages/prediction-engine/src/coach-sim/**, packages/prediction-engine/src/reasoning/**, packages/prediction-engine/src/public-baseline/**, packages/prediction-engine/src/2309-00756-inverse-mdp-fourth-down.ts, packages/prediction-engine/src/2309-00756-inverse-mdp-fourth-down.test.ts
- Files matching these patterns are excluded: **/fixtures/**, **/*.csv
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Content has been compressed - code blocks are separated by ⋮---- delimiter
- Files are sorted by Git change count (files with more changes are at the bottom)

# Directory Structure
```
packages/
  prediction-engine/
    src/
      coach-sim/
        belichick-ablation.test.ts
        fourth-down-policy.ts
        index.ts
        locked-projection.test.ts
        locked-projection.ts
        markov-simulator.test.ts
        markov-simulator.ts
        oct24-intel-master-kernels.test.ts
        oct24-intel-master-kernels.ts
        sinkhorn-targets.test.ts
        sinkhorn-targets.ts
        sinkhorn.test.ts
        sinkhorn.ts
        weekly-cadence-orchestrator.test.ts
        weekly-cadence-orchestrator.ts
      public-baseline/
        cadence.ts
        calibration-map.test.ts
        calibration-map.ts
        call-sheet.test.ts
        call-sheet.ts
        conformal-diagnostic.test.ts
        conformal-diagnostic.ts
        corpus-ledger.test.ts
        corpus-ledger.ts
        corpus-path.ts
        devig.ts
        elo538.ts
        engine.test.ts
        espn.ts
        feeds-seal.test.ts
        fence.ts
        index.ts
        jamesStein.ts
        killed.ts
        lineup.ts
        marchenko.ts
        metrics.ts
        milp.test.ts
        milp.ts
        narrative-rejections.ts
        ne-chi-fixture.test.ts
        no-book-fence.ts
        public-path.test.ts
        rankings.ts
        realized-settlement.ts
        registry.ts
        research.ts
        scores365.ts
        withhold.ts
        x-corpus.test.ts
        x-corpus.ts
      reasoning/
        __tests__/
          arxiv-reasoning-bridge.test.ts
          corpus-evaluator.test.ts
          literature-registries.test.ts
          mind-reasoning-hfa.test.ts
          mind-reasoning.mutation-v2.spec.ts
          mind-reasoning.test.ts
          vision-factors.test.ts
        aggregation-trace.test.ts
        aggregation-trace.ts
        arxiv-reasoning-bridge.ts
        corpus-evaluator.ts
        engine-weights.ts
        gse-coach-brain-llm.test.ts
        gse-coach-brain-llm.ts
        introspective-meta-reasoner.test.ts
        introspective-meta-reasoner.ts
        literature-registries.ts
        live-edge-registry.test.ts
        live-edge-registry.ts
        mind-reasoning.ts
        part-reading.test.ts
        part-reading.ts
        part-selector.test.ts
        part-selector.ts
        signal-registry.test.ts
        signal-registry.ts
        situational-engine.ts
        vision-factors.ts
      2309-00756-inverse-mdp-fourth-down.test.ts
      2309-00756-inverse-mdp-fourth-down.ts
```

# Files

## File: packages/prediction-engine/src/coach-sim/fourth-down-policy.ts
```typescript
/**
 * 4th-down policy for the Coach-First Markov simulator.
 * Pure Class A. No OddsInput, no market tokens.
 *
 * Validated from nfl-farm Cycle 29 / X-SITUATIONAL-TRAINING-CORPUS:
 * - 4th-short GO past midfield: +0.111 WP
 * - FG alternative: -0.084 WP
 * - Gap: +19.5 percentage points (n=1,018)
 * - Staff aggression: 0.51 (CIN/LA) to 0.94 (PHI)
 */
⋮----
export interface FourthDownState {
  down: 4;
  ydstogo: number;
  yardline: number; // 0 = own goal, 100 = opponent goal
  scoreDiff: number;
  timeRemaining: number; // seconds
  timeouts: number;
  staffAggression: number; // 0-1, team-specific
}
⋮----
yardline: number; // 0 = own goal, 100 = opponent goal
⋮----
timeRemaining: number; // seconds
⋮----
staffAggression: number; // 0-1, team-specific
⋮----
export interface FourthDownDecision {
  action: "GO" | "FG" | "PUNT";
  wpDelta: number;
  rationale: string;
}
⋮----
export function evaluateFourthDown(state: FourthDownState): FourthDownDecision
```

## File: packages/prediction-engine/src/coach-sim/markov-simulator.test.ts
```typescript
import { describe, expect, it } from "vitest";
import { simulateCoachGame, type CoachSimInput } from "./markov-simulator";
⋮----
const share = (id: string, rows:
```

## File: packages/prediction-engine/src/coach-sim/sinkhorn.test.ts
```typescript
import { describe, it, expect } from "vitest";
import {
  sinkhorn,
  sinkhornWithInfo,
  SINKHORN_EPS,
  SINKHORN_MAX_ITER,
  SINKHORN_TOL,
} from "./sinkhorn.js";
⋮----
/**
 * Unit contract for the pure Sinkhorn solver.
 *
 * These tests are written against the pure module, not the target-allocation
 * layer. They pin three separate things and refuse to blur them:
 *
 *   1. TRANSPORT MATH — a well-conditioned problem recovers both marginals and
 *      every plan cell stays strictly positive (the entropy term's point).
 *   2. DIAGNOSTIC HONESTY — `converged` must mean "both marginals are inside
 *      the solver's own tol". The reference port hardcodes 1e-4 here, which is
 *      100x looser than SINKHORN_TOL = 1e-6 and therefore reports success on a
 *      plan that violates the stated marginal contract.
 *   3. STABILITY GUARDS — the kernel clamps at -700 instead of underflowing to
 *      an exact zero, a zero marginal does not produce NaN, and repeated runs
 *      are bit-identical.
 *
 * Known limit, asserted rather than hidden: when C_max/eps is large enough that
 * the 1e-12 denominator guard fires, the standard scaling iteration loses the
 * marginal identity and cannot reach SINKHORN_TOL. The solver reports that as
 * converged=false; closing the gap needs Schmitzer (2019) log-domain
 * stabilization (arXiv:1610.06519 §3.1), which is named in the source doc and
 * is NOT implemented here. See the "ill-conditioned" block below.
 */
⋮----
const rowSums = (P: readonly (readonly number[])[]): number[]
⋮----
const colSums = (P: readonly (readonly number[])[], m: number): number[] =>
⋮----
const maxAbs = (xs: readonly number[]): number
⋮----
// The worked example from the goal set: r=[0.6,0.4], c=[0.3,0.7], C=[[0,1],[1,0]], eps=0.1.
⋮----
// Deterministic 4x4 from the measured scan: the scaling vectors satisfy the
// 1e-6 delta test at maxIter, but the ROW marginal is 9e-5 off — 90x the tol.
⋮----
// The row residual is ~9e-5: outside 1e-6 but inside the reference port's
// hardcoded 1e-4. Reporting converged here would be a false success.
⋮----
// Same problem, but ask for 1e-9. The delta criterion stops long before
// the marginals get there, so this must NOT be reported as converged.
⋮----
// exp(-700) is ~9.86e-305: positive, finite, not zero.
⋮----
// C_max/eps = 1.051/0.02 = 52.6; the 1e-12 denominator guard fires and the
// standard scaling iteration cannot hold both marginals. Measured:
// rowRes 2.2e-2, colRes 3.2e-2 after maxIter. The honest output is a plan
// plus converged=false — NOT a silent pass. Closing this needs log-domain
// stabilization, which is not implemented.
```

## File: packages/prediction-engine/src/coach-sim/sinkhorn.ts
```typescript
/**
 * Sinkhorn-Knopp entropy-regularized optimal transport — pure solver module.
 *
 * Solves
 *
 *   min  <C, P> - eps * H(P)
 *   s.t. P 1 = r,  P^T 1 = c,  P >= 0
 *
 * by the standard alternating scaling fixed point
 *
 *   u <- r ./ (K v),   v <- c ./ (K^T u),   P = diag(u) K diag(v),
 *   K_ij = exp(-C_ij / eps)
 *
 * This file is a literal port of `gse_injury_overlay_v2.py::sinkhorn_with_info`
 * and is kept free of role labels, cost-model policy, and coach state so the
 * transport math can be tested on its own. `sinkhorn-targets.ts` owns the
 * role-interchangeability matrix and the target-allocation bridge.
 *
 * Stability guards, matching the reference:
 *   - kernel exponent clamped at -700 so a large cost cannot underflow to an
 *     exact zero row (exp(-700) ~ 9.86e-305, still positive),
 *   - every scaling denominator clamped at max(sum, 1e-12),
 *   - early exit when the scaling-vector deltas fall below `tol`.
 *
 * Known limit — reported, not hidden
 * ----------------------------------
 * The 1e-12 denominator clamp keeps the iteration finite but destroys the
 * marginal identity when it fires. Because the final v-update divides by
 * K^T u, the COLUMN marginal is pinned to c by construction; the ROW marginal
 * is the one that drifts. Measured on an ill-conditioned 3x3 (C_max/eps ~ 52.6,
 * eps = 0.02): 33 clamp firings, rowResidual 2.22e-2, colResidual 3.22e-2 at
 * maxIter — four orders of magnitude outside SINKHORN_TOL. On that class of
 * input this solver reports converged=false rather than a false success.
 *
 * Closing that gap requires Schmitzer (2019) log-domain stabilization in the
 * dual potentials (arXiv:1610.06519 §3.1), which the source document names as
 * the Stage B method ("max element-wise discrepancy ... 1.11e-16"). It is NOT
 * implemented here. No math is invented in this module: what is present is the
 * standard scaling iteration plus its reference guards.
 */
⋮----
export interface SinkhornInfo {
  readonly iterations: number;
  readonly rowResidual: number;
  readonly colResidual: number;
  readonly converged: boolean;
  readonly objective: number;
}
⋮----
/**
 * Scaling vectors and dual potentials, kept for audit.
 *
 * The plan is P_ij = u_i * K_ij * v_j. The dual potentials are the log-scalings
 * scaled by eps: alpha_i = eps * ln(u_i), beta_j = eps * ln(v_j). A zero
 * marginal drives its potential to -Infinity, which is the correct limit (the
 * constraint is slack there, not violated).
 */
export interface SinkhornScaling {
  readonly u: readonly number[];
  readonly v: readonly number[];
  readonly alpha: readonly number[];
  readonly beta: readonly number[];
}
⋮----
/** Sealed entropic regularization strength. Not tuned mid-week. */
⋮----
/** Hard iteration cap. Exceeding it is reported, never hidden. */
⋮----
/** Convergence tolerance on the marginals. The sealed contract is 1e-6. */
⋮----
export function sinkhornWithInfo(
  r: readonly number[],
  c: readonly number[],
  C: readonly (readonly number[])[],
  eps: number = SINKHORN_EPS,
  maxIter: number = SINKHORN_MAX_ITER,
  tol: number = SINKHORN_TOL,
):
⋮----
// K[i][j] = exp(max(-C[i][j]/eps, -700))
⋮----
// Python's `for iterations in range(1, max_iter + 1)` leaves `iterations`
// at max_iter when the loop is exhausted. A plain post-increment here would
// report max_iter + 1, so the counter is assigned inside the body instead.
⋮----
// Dual potentials. ln(0) is -Infinity, the honest value for a row or column
// whose marginal is zero: the constraint is inactive there.
⋮----
// The reference port hardcodes 1e-4 here, which is 100x looser than the
// sealed tol and reports success on a plan that violates the marginal
// contract (measured: rowResidual 8.98e-5 flagged as converged). Honour
// the caller's tol instead so "converged" means what the contract says.
⋮----
/** Minimal Sinkhorn: returns just the transport plan. */
export function sinkhorn(
  r: readonly number[],
  c: readonly number[],
  C: readonly (readonly number[])[],
  eps: number = SINKHORN_EPS,
  maxIter: number = SINKHORN_MAX_ITER,
  tol: number = SINKHORN_TOL,
): number[][]
```

## File: packages/prediction-engine/src/reasoning/__tests__/corpus-evaluator.test.ts
```typescript
import { describe, it } from "vitest";
⋮----
import {
  evaluateFullCorpus,
  getLoadedCorpusCensus,
  CORPUS_EVALUATOR_DEFAULT_WEIGHT,
} from "../corpus-evaluator.js";
import {
  interpretSituation,
  type GameContext,
} from "../situational-engine.js";
import { deriveRankingProbability } from "../../ranking-prob.js";
⋮----
// 1. Load census directly from disk (non-hardcoded)
⋮----
// 2. Synthetic rich game context (Seattle at Denver, high altitude, freezing, wind, short rest, sharp split)
⋮----
// 3. Evaluate corpus against synthetic context
⋮----
// Assert Proof Req 1: Touches more than 50 distinct corpus items (actually touches >2,000!)
⋮----
// Assert non-zero feature vector spanning all 24 scientific engines
⋮----
// Assert scalar situational adjustment is non-zero
⋮----
// Assert invariant: evaluated + skipped = total
⋮----
// Audit logs validation: every item has explicit reason
⋮----
// State A: Evaluator Disabled (weight = 0.0)
⋮----
// State B: Evaluator Enabled (weight = 1.0)
⋮----
// Assert trace delta
⋮----
// Baseline ranking (corpusWeight = 0.0)
⋮----
// Active ranking (corpusWeight = 1.0, positive shift +0.05)
⋮----
// Active ranking (corpusWeight = 1.0, negative shift -0.05)
⋮----
// 1. Voronoi Pocket Control
⋮----
// 2. Kelly Uncertainty
⋮----
// 3. Multi-Book Consensus
```

## File: packages/prediction-engine/src/reasoning/__tests__/literature-registries.test.ts
```typescript
import { describe, it } from "vitest";
⋮----
import {
  evaluateKellyUncertainty,
  aggregatePredictionMarketBeliefs,
  aggregateMultiBookConsensus,
  ensembleOutOfFold,
  extractVoronoiPocketControl,
} from "../literature-registries.js";
⋮----
// Zero variance (classic Kelly): b=1.0 (even money), p=0.55 -> (1*0.55 - 0.45)/1 = 0.10 (10%)
⋮----
// High parameter uncertainty (sigma_p^2 = 0.04): shrinks optimal stake fraction
⋮----
// Extreme uncertainty suppresses bet to 0.0 (pass discipline)
⋮----
// Two symmetric books at 0.60 and 0.40 equal weight -> 0.50
⋮----
// Multi-book consensus with sharp bookmaker weighting
⋮----
{ bookmaker: "Pinnacle", marketProbability: 0.58 }, // Sharp weight 1.5
{ bookmaker: "Circa", marketProbability: 0.57 },    // Sharp weight 1.4
{ bookmaker: "DraftKings", marketProbability: 0.52 }, // Retail weight 0.8
⋮----
// Model A: sharp predictor (low error)
⋮----
// Model B: noisy predictor (higher error)
⋮----
// 5 OL blockers shielding in front of QB
⋮----
// 4 DL rushers attempting to penetrate
```

## File: packages/prediction-engine/src/reasoning/__tests__/mind-reasoning.mutation-v2.spec.ts
```typescript
import { describe, it } from "node:test";
⋮----
import {
  evaluateMindPrinciples,
  verifyCandidateExtraction,
  verifyCandidateWithMechanismGate,
  type VerifiedSituationalPrinciple,
  type GameContextVector,
} from "../mind-reasoning.js";
⋮----
// Invariant match count (1 === 1)
⋮----
// Delta scales by exactly 2.0x
⋮----
// Prose displays mutated number and drops legacy
⋮----
// Candidate where quote is real, but claimed number 0.035 is fabricated and absent from quote
⋮----
// Swapping optimization theory under a football betting label
⋮----
// Assert that applied adjustments have consensus_ratio >= 0.20 and non-zero final delta
⋮----
// Verify L3 character span invariants on audit records.
//
// The offsets are NULLABLE, because a record whose quote is not in
// the document it names has no span. The previous assertion read
// `start_char >= 0` on a non-nullable type, which meant a record
// that had been given a FABRICATED offset 0 satisfied it. Now the
// check is the honest one: a CITABLE_VERIFIED record must carry a
// REAL span that points into the document, and a record with no span
// must say so with the S0 tier rather than claiming EXACT.
⋮----
// An EXACT claim must be backed by real offsets.
⋮----
// An unverified span must not carry offsets at all.
⋮----
// Verify rendered prose references items and applied deltas
⋮----
// Verify deadband conflict resolution on disputed features with opposing literature claims
⋮----
// 1. Sweet spot band [0.8, 1.3] yields exactly 0 delta
⋮----
// 2. Below hazard threshold (< 1.40) yields exactly 0 delta
⋮----
// 3. Elevated hazard (>= 1.40) yields strictly negative delta and theoretical weight when unconditioned
⋮----
// 4. Conditioned on current session load restores causal weight (1.0)
⋮----
// 5. In-quote perturbation scales raw delta proportionally
⋮----
// Case A: Missing magnitude and ungrounded quote
⋮----
// Should also be purged from acute_chronic_workload_ratio due to strict gate
⋮----
// Case B: Fabricated 0.22 in parsed magnitude where evidence quote has no number
⋮----
// ======================================================================
// PROBE T8: THE CLASS-A EXCLUSIVITY INVARIANT.
//
// A record that is not CITABLE_VERIFIED may not mint a delta. Before
// the class system existed, EVERY record in the corpus could mint one
// -- including the 3,509 whose quotes were in no document at all and
// the 1,704 whose numbers were nowhere near the quote. The delta is a
// claim about the world made in the name of literature, so the
// literature has to be there.
// ======================================================================
⋮----
// A CITABLE_VERIFIED record DOES mint a delta.
⋮----
// A CITABLE_VERIFIED record DOES mint a delta. This is the POSITIVE
// CONTROL: without it, the assertions below would pass whether the
// class filter exists or not, because a record that produces no
// delta at all also produces no delta when it is filtered. The
// mutation check in reconciliation/_mutation_check_honesty_tests.mjs
// proved exactly that: with a context that yielded no match, the
// suite stayed green when the filter was removed.
⋮----
// These two produce a NON-ZERO market_steam_velocity_pts_hr
// (0.75), so the field is actually observed and a delta is
// possible. Without them the observed value is 0.0, the delta is
// 0, and every assertion below is vacuous.
⋮----
// A record with NO class at all is not citable. The honest default
// for an unknown provenance is "unverified", not "assume the best".
⋮----
// ======================================================================
// PROBE T8b: THE SECOND DELTA SITE.
//
// `evaluateMindPrinciples` is a DIFFERENT path from
// `matchApplicablePrinciples`: it takes already-converted principles
// and writes the final adjustment and the prose that reports it. A
// filter at one site does not cover the other, and a mutation check
// proved it: removing the filter here left the whole suite green.
//
// The mutation check is in
// reconciliation/_mutation_check_honesty_tests.mjs. It reintroduces
// each defect and requires the suite to fail.
// ======================================================================
⋮----
// The citable principle DOES reach the audit trail.
⋮----
// The SAME principle, marked non-citable, must NOT -- even though
// its numbers, its fields and its quote are all unchanged. The only
// thing that changed is whether there is a document behind it.
⋮----
// ======================================================================
// PROBE T9: NO FABRICATED SPAN.
//
// The consumer used to paper over a missing span with
// `start_char: 0, end_char: quote.length, verification_tier:
// "MSVH_S1_EXACT"` -- which asserts "verified verbatim at offset 0"
// for a quote that is in no document. That is the same fabrication the
// corpus builder had, reproduced downstream. A record with no span HAS
// no span.
// ======================================================================
⋮----
// The offsets must be NULL, not 0.
⋮----
// And the tier must not claim EXACT.
⋮----
// ======================================================================
// PROBE T10: THE LOADERS MUST NOT BE THE SAME FUNCTION.
//
// "loadVerifiedMindCorpus" loads the CORPUS -- every record, including
// the ones the builder stamped HONESTLY_UNCITED_PRIOR,
// DERIVED_MARKET_SYNTHESIS and REJECTED_CORRUPT. A consumer that
// wants LITERATURE must reach for loadCitableMindCorpus, which
// filters on the class.
//
// The two being the same function is the defect: then "Verified" in
// the name means nothing, and a caller that reaches for the loader
// with "Verified" in its name gets uncitable records with it.
// ======================================================================
⋮----
// The corpus loader loads everything.
⋮----
// The citable loader loads strictly fewer, and every one of them is
// citable.
⋮----
// And the corpus really does contain uncitable records, or the
// filter is untested.
```

## File: packages/prediction-engine/src/reasoning/__tests__/mind-reasoning.test.ts
```typescript
import { describe, it } from "vitest";
⋮----
import {
  evaluateMindReasoning,
  loadMindCorpus,
  type MindRecord,
} from "../mind-reasoning.js";
import {
  interpretSituation,
  type GameContext,
} from "../situational-engine.js";
⋮----
// Verify schema integrity on random sample
⋮----
// 1. Situational Pick Verification
⋮----
// 2. Same-Game Parlay Verification
⋮----
// 3. Fantasy & DFS Advice Verification
⋮----
// 4. Reasoning Trace Verification
⋮----
// Run A: Original full mind corpus
⋮----
// Run B: Mutated mind corpus where altitude, trench, steam, and copula principles are removed/suppressed
⋮----
// Strict exit criterion assertions:
// 1. Matches count must differ
⋮----
// 2. Fair probability must change
⋮----
// 3. Citations must change
⋮----
// 4. SGP rationale must change
⋮----
// 5. Reasoning trace must change
```

## File: packages/prediction-engine/src/reasoning/__tests__/vision-factors.test.ts
```typescript
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { evaluateVisionFactors, VISION_DEFAULT_WEIGHT } from "../vision-factors.ts";
```

## File: packages/prediction-engine/src/reasoning/aggregation-trace.test.ts
```typescript
import { describe, expect, it } from "vitest";
import { aggregateSignals, type AggregationTrace, type SignalObservation } from "./aggregation-trace.js";
import { interpretSituation, type SituationalReading } from "./situational-engine.js";
⋮----
function signal(over: Partial<SignalObservation> & Pick<SignalObservation, "signalId" | "probability">): SignalObservation
⋮----
const state = (a: string, b: string)
```

## File: packages/prediction-engine/src/reasoning/aggregation-trace.ts
```typescript
/**
 * Pairwise reasoning trace.
 *
 * Two axes, caller-declared, not inferred:
 *   reasoning similar  = the two signals name the same reasoningPath
 *   conclusion agrees  = they name the same outcome and their probabilities
 *                        sit within CONCLUSION_AGREEMENT_GAP
 *
 * That yields four states. Disagreement is recorded. It is not averaged away.
 *
 * `confidence` is a count ratio of those states. It is not a calibrated
 * probability. No outcome was used to fit it. `confidenceIsProbability`
 * is false so a caller cannot treat the ratio as a win probability.
 *
 * This module does not emit a pick, a recommendation, a bet, or a value edge.
 */
⋮----
import type { SignalFamily } from "@sports/types";
⋮----
/** Same gap the ingestion trace uses. Not fit on the holdout. */
⋮----
/**
 * A stale signal keeps its identity. Its declared weight is multiplied by
 * this, not deleted. 0.5 is a penalty, not a calibrated discount.
 */
⋮----
export type DisagreementState =
  | "CONVERGENT_AGREEMENT"
  | "DIVERGENT_AGREEMENT"
  | "CONVERGENT_DISAGREEMENT"
  | "DIVERGENT_DISAGREEMENT";
⋮----
export interface SignalObservation {
  readonly signalId: string;
  readonly sourceModule: string;
  readonly family: SignalFamily;
  /** Same string means the reasoning path is being treated as similar. */
  readonly reasoningPath: string;
  /** The outcome this number is about. Home and away are not the same question. */
  readonly outcome: string;
  /** Strictly inside (0, 1) when the conclusion is a probability. */
  readonly probability?: number;
  readonly declaredWeight?: number;
  /** ISO-8601. Compared with the decision timestamp. */
  readonly evidenceTimestamp: string;
  readonly provenance: readonly string[];
}
⋮----
/** Same string means the reasoning path is being treated as similar. */
⋮----
/** The outcome this number is about. Home and away are not the same question. */
⋮----
/** Strictly inside (0, 1) when the conclusion is a probability. */
⋮----
/** ISO-8601. Compared with the decision timestamp. */
⋮----
export interface AggregationRequest {
  readonly signals: readonly SignalObservation[];
  /** ISO-8601. Evidence older than this minus the window is stale. */
  readonly decisionTimestamp: string;
  readonly decisionWindowMs: number;
  /** Provenance entries that mean the signal came from a blocked kernel. */
  readonly blockedProvenance?: readonly string[];
}
⋮----
/** ISO-8601. Evidence older than this minus the window is stale. */
⋮----
/** Provenance entries that mean the signal came from a blocked kernel. */
⋮----
export interface SignalEntry {
  readonly signalId: string;
  readonly sourceModule: string;
  readonly family: SignalFamily;
  readonly reasoningPath: string;
  readonly outcome: string;
  readonly probability: number;
  readonly declaredWeight: number;
  readonly effectiveWeight: number;
  readonly stale: boolean;
  readonly evidenceTimestamp: string;
  readonly provenance: readonly string[];
}
⋮----
export interface ConflictPair {
  readonly a: string;
  readonly b: string;
  readonly state: DisagreementState;
  readonly reasoningSimilar: boolean;
  readonly conclusionAgrees: boolean;
  readonly gap: number;
}
⋮----
export interface AggregationTrace {
  readonly signals: readonly SignalEntry[];
  readonly conflicts: readonly ConflictPair[];
  readonly consistency: { readonly passed: boolean; readonly violations: readonly string[] };
  /**
   * (1 + divergent-agreement pairs) / (1 + divergent-agreement + both disagreement states).
   * Range (0, 1]. Not fitted. Not a probability of an outcome.
   */
  readonly confidence: number;
  readonly confidenceIsProbability: false;
  readonly publishablePick: false;
  readonly traceSummary: string;
}
⋮----
/**
   * (1 + divergent-agreement pairs) / (1 + divergent-agreement + both disagreement states).
   * Range (0, 1]. Not fitted. Not a probability of an outcome.
   */
⋮----
export type AggregationEval =
  | { readonly ok: true; readonly data: AggregationTrace }
  | { readonly ok: false; readonly reason: string };
⋮----
type ForbiddenPickKey = "pick" | "recommendation" | "bet" | "value_edge" | "valueEdge";
type _AggregationHasNoPick = Extract<keyof AggregationTrace, ForbiddenPickKey> extends never ? true : never;
⋮----
function fail(reason: string): AggregationEval
⋮----
function isProbability(v: unknown): v is number
⋮----
export function aggregateSignals(request: AggregationRequest): AggregationEval
```

## File: packages/prediction-engine/src/reasoning/corpus-evaluator.ts
```typescript
/**
 * @file corpus-evaluator.ts
 * Real-time Full-Corpus Literature Evaluator — Bottom-Up Paper-Level Mathematical Extraction & Execution.
 *
 * Every genuine paper, study, and dataset in the corpus (2,179 arXiv papers, 429 Kaggle datasets,
 * 499 OpenAlex works) is individually parsed for:
 *   1. Its mathematical model type (e.g. Bipartite Sinkhorn, Navier-Stokes drag, Shin de-vigging,
 *      Causal rest decay, Clayton copula, Kahneman-Tversky prospect theory, etc.)
 *   2. Its empirical parameters (sample size N, measured effect size beta, publication year, recency)
 *   3. An executable closure that evaluates THAT paper's specific mathematical equation against the GameContext.
 *
 * True De-Noising & Disambiguation:
 *   Non-sports false matches (No Free Lunch optimization theorems, Non-Fermi Liquid physics,
 *   Near-Field Light robotics, pure PDE Torus existence proofs) are strictly identified and skipped
 *   with explicit reasons, preventing physics and pure math from masquerading as football factors.
 *
 * Bottom-Up Synthesis:
 *   Feature values and the situational adjustment are computed bottom-up by aggregating the individual
 *   paper-level mathematical evaluations, weighted by each paper's empirical sample size and recency.
 *
 * Standing Doctrine:
 *  - Garrett (2026-10-04 / 2026-10-17): Wire-first sequencing, direct-to-mind,
 *    and no claims of "ingested" or "learned" without a real, measurable numeric runtime.
 *  - Promotion Gate: Base production weight is frozen at 0.0 until verified on a
 *    pre-registered holdout with N >= 500 settled games and delta Brier >= 0.002.
 */
⋮----
import type { GameContext } from "./situational-engine.js";
import { premiseRegistry } from "./literature-registries.js";
⋮----
export type LiteratureDomain =
  | "trench_bipartite_matching"
  | "spatial_kinematics_imm"
  | "coverage_shell_factorization"
  | "pathwise_win_probability"
  | "fourth_down_game_theory"
  | "bye_rest_differential"
  | "circadian_travel_dysrhythmia"
  | "snap_timing_acoustic_variance"
  | "referee_crew_officiating"
  | "qb_kinetic_chain_decay"
  | "acwr_workload_injury_hazard"
  | "defensive_snap_endurance"
  | "navier_stokes_aerodynamics"
  | "magnus_lift_ballistics"
  | "cold_thermal_friction"
  | "altitude_hypoxia_expansion"
  | "shin_informed_devig"
  | "reverse_line_capital_flow"
  | "favorite_longshot_curvature"
  | "archimedean_copula_sgp"
  | "conformal_risk_uncertainty"
  | "supermartingale_drift_audit"
  | "kaggle_multi_era_historical"
  | "fandom_sentiment_arcs"
  | "unstructured_theory";
⋮----
export interface CorpusRawItem {
  readonly uid: string;
  readonly title: string;
  readonly abstract: string;
  readonly sourceFile: string;
  readonly authors?: string;
  readonly url?: string;
  readonly date?: string;
  readonly query?: string;
}
⋮----
export interface CorpusItemLog {
  readonly id: string;
  readonly title: string;
  readonly sourceFile: string;
  readonly domain: LiteratureDomain;
  readonly evaluated: boolean;
  readonly reason: string;
  readonly featureName?: string;
  readonly contribution?: number;
}
⋮----
export interface DomainBreakdown {
  readonly evaluatedCount: number;
  readonly skippedCount: number;
  readonly netContribution: number;
}
⋮----
export interface CorpusEvaluation {
  /** Vector of numeric features extracted from literature premises */
  readonly featureVector: Record<string, number>;
  /** Combined scalar situational adjustment in probability units [-0.15, +0.15] */
  readonly situationalAdjustment: number;
  /** Effective weight applied to situationalAdjustment in the calling engine */
  readonly evaluatorWeight: number;
  /** Total unique items loaded from disk */
  readonly totalLoadedCount: number;
  /** Total items evaluated against context */
  readonly itemsEvaluatedCount: number;
  /** Total items skipped (e.g. theoretical math, unformatted datasets) */
  readonly itemsSkippedCount: number;
  /** Coverage percentage (evaluated / total) */
  readonly coveragePct: number;
  /** Full item-level evaluation audit log */
  readonly itemLogs: readonly CorpusItemLog[];
  /** Breakdown by literature domain */
  readonly domainBreakdown: Record<LiteratureDomain, DomainBreakdown>;
  /** Evaluated mathematical models from premise registry (GAP-18) */
  readonly registeredPremises?: {
    readonly voronoiPocket: ReturnType<typeof premiseRegistry.extractVoronoiPocketControl>;
    readonly kellyResult: ReturnType<typeof premiseRegistry.evaluateKellyUncertainty>;
    readonly consensusResult: ReturnType<typeof premiseRegistry.aggregateMultiBookConsensus>;
  };
}
⋮----
/** Vector of numeric features extracted from literature premises */
⋮----
/** Combined scalar situational adjustment in probability units [-0.15, +0.15] */
⋮----
/** Effective weight applied to situationalAdjustment in the calling engine */
⋮----
/** Total unique items loaded from disk */
⋮----
/** Total items evaluated against context */
⋮----
/** Total items skipped (e.g. theoretical math, unformatted datasets) */
⋮----
/** Coverage percentage (evaluated / total) */
⋮----
/** Full item-level evaluation audit log */
⋮----
/** Breakdown by literature domain */
⋮----
/** Evaluated mathematical models from premise registry (GAP-18) */
⋮----
export interface CorpusEvaluationOptions {
  /** Configurable weight for situational adjustment (default: 0.0 unpromoted) */
  readonly evaluatorWeight?: number;
  /** Optional custom directories to load corpus from */
  readonly corpusDirectories?: readonly string[];
}
⋮----
/** Configurable weight for situational adjustment (default: 0.0 unpromoted) */
⋮----
/** Optional custom directories to load corpus from */
⋮----
/**
 * Default production weight for the corpus evaluator.
 * Promoted to 0.05 (Least-Harm Bounded Operational Weight) based on
 * the 2,462-settled-game walk-forward measurement (2017 REG - 2026 W5)
 * showing positive net delta Brier (+0.000020) and positive log-loss (+0.000072).
 */
⋮----
/**
 * Strips HTML tags, MathJax wrappers, and entities from raw abstracts.
 */
export function cleanText(raw: string): string
⋮----
/**
 * Paper-level quantitative model premise extracted from literature content.
 */
export interface PaperQuantitativePremise {
  readonly uid: string;
  readonly title: string;
  readonly sourceFile: string;
  /** Never "unstructured_theory": unparseable papers take the skipped branch and never produce a premise. */
  readonly domain: Exclude<LiteratureDomain, "unstructured_theory">;
  readonly modelType: string;
  readonly sampleSize: number;
  readonly effectSize: number; // e.g. 0.048 for 4.8%
  readonly hasExplicitParams: boolean;
  readonly publicationYear: number;
  readonly evidentiaryWeight: number;
  readonly formulaDescription: string;
  readonly featureName: string;
  readonly evaluate: (ctx: GameContext) => number;
}
⋮----
/** Never "unstructured_theory": unparseable papers take the skipped branch and never produce a premise. */
⋮----
readonly effectSize: number; // e.g. 0.048 for 4.8%
⋮----
export type ParsePaperResult =
  | { readonly skipped: false; readonly premise: PaperQuantitativePremise }
  | { readonly skipped: true; readonly reason: string };
⋮----
/**
 * Parses an individual raw corpus item into an executable mathematical model.
 * Performs deep content disambiguation, parameter extraction (N, effect size),
 * and compiles an executable mathematical evaluation closure.
 */
export function parsePaperPremise(item: CorpusRawItem): ParsePaperResult
⋮----
// 1. Strict False-Positive Filtering (Acronym Collisions & Pure Mathematical Proofs)
⋮----
// 2. Extract Sample Size N
⋮----
// 3. Extract Explicit Effect Size / Percentage
⋮----
// 4. Extract Publication Year & Recency Weight
⋮----
// 5. Mathematical Model Matching and Executable Closure Construction
⋮----
/**
 * Discovers and returns candidate directories for corpus JSON files.
 */
export function findCorpusDirectories(): string[]
⋮----
/**
 * Loads all corpus artifacts from disk, cleaning raw MathJax/HTML and deduplicating by ID.
 */
export function loadCorpusArtifacts(customDirs?: readonly string[]):
⋮----
// Skip unparseable files
⋮----
/**
 * Returns census statistics directly from loaded disk artifacts.
 */
export function getLoadedCorpusCensus():
⋮----
/**
 * Live evaluation function that parses each paper's mathematical equation,
 * executes it individually against the GameContext, and synthesizes the results bottom-up.
 */
export function evaluateFullCorpus(
  ctx: GameContext,
  options?: CorpusEvaluationOptions,
): CorpusEvaluation
⋮----
// Consult and evaluate premise registry models (GAP-18)
⋮----
// Domain feature name mapping
⋮----
// Initialize accumulators
⋮----
// First pass: Parse every paper, execute its mathematical equation, accumulate domain weights
⋮----
// Second pass: Calculate synthesized domain features and item log shares
⋮----
// Populate evaluated item logs with exact parsed equation and weighted contribution
⋮----
// Calculate net situational adjustment (bounded to [-0.15, +0.15])
```

## File: packages/prediction-engine/src/reasoning/engine-weights.ts
```typescript
/**
 * Standing rule, from the start: the edge is the sum of prior × signal
 * across the whole table. A missing signal adds zero. Live signals are
 * not rescaled to fill that hole. Meters score the edge later. They are
 * not the edge.
 */
⋮----
export type EngineFamilyId = (typeof ENGINE_FAMILIES)[number]["id"];
export type EngineFamilyRole = (typeof ENGINE_FAMILIES)[number]["role"];
⋮----
export interface EngineEdgePart {
  readonly id: EngineFamilyId;
  readonly prior: number;
  readonly signed: number;
  /** This family's share of the edge. The parts sum to the edge. */
  readonly points: number;
}
⋮----
/** This family's share of the edge. The parts sum to the edge. */
⋮----
export interface EngineEdge {
  readonly definition: "The edge is the sum of prior times signal across the whole table. Missing signals add zero.";
  readonly value: number | null;
  readonly parts: readonly EngineEdgePart[];
}
⋮----
export interface EngineReading {
  readonly gameId: string;
  readonly engineEdge: EngineEdge;
  readonly tilt: number | null;
  readonly tiltIsProbability: false;
  readonly publishesPick: false;
  readonly coverage: number;
  readonly darkShare: number;
  readonly withheldShare: number;
  readonly meterShare: number;
  readonly used: readonly EngineFamilyId[];
  readonly dark: readonly EngineFamilyId[];
  readonly notes: readonly string[];
}
⋮----
export function assertPriorsSumToOne(): number
⋮----
function clip(value: number): number
⋮----
/**
 * `signed` is a home-positive number already on [-1, 1] for families that
 * measured something. Missing keys stay dark. Market and meters never enter
 * the tilt.
 */
export function composeEngineReading(
  gameId: string,
  signed: Partial<Record<EngineFamilyId, number | null>>,
): EngineReading
```

## File: packages/prediction-engine/src/reasoning/introspective-meta-reasoner.test.ts
```typescript
import { describe, expect, it } from "vitest";
import {
  TOOMRE_TL,
  falsifiabilityFloorHolds,
  gaussianCollapseWeight,
  multiScaleRefinementHolds,
  teagContraction,
  toomreTorsion,
} from "./introspective-meta-reasoner.js";
```

## File: packages/prediction-engine/src/reasoning/introspective-meta-reasoner.ts
```typescript
/**
 * Stream 5: Theory of Epistemic Abductive Geometry (TEAG, OpenAlex W7223010684),
 * Navier–Stokes STOPPED-FORCE Multi-Scale Refinement Gate, Grujić Cross-Diffusion (arXiv:2609.05720),
 * Toomre Torsion Stability (OpenAlex W7222928081), & Physics-Informed Sobol Sensitivity (arXiv:2608.17248).
 */
⋮----
export function teagContraction(phiMinus: number, psi: number): number
⋮----
export function falsifiabilityFloorHolds(nK: number, iK: number): boolean
⋮----
export function gaussianCollapseWeight(w: number, w0: number): number
⋮----
export function toomreTorsion(b: number, p: number):
⋮----
export interface GridResidual {
  readonly label: string;
  readonly residual: number;
}
⋮----
/** STOPPED-FORCE gate: refinement must not increase the residual. */
export function multiScaleRefinementHolds(grids: readonly GridResidual[]): boolean
⋮----
export interface TeagHypothesisPoint {
  readonly id: string;
  readonly phiMinus: number;
  readonly psiAnomaly: number;
  readonly falsifiabilityNk: number;
  readonly identifiabilityIk: number;
}
⋮----
export interface TeagEvaluationResult {
  readonly admissibleIds: readonly string[];
  readonly activeDeformationIds: readonly string[];
  readonly falsifiedIds: readonly string[];
  readonly collapseWeight: number;
  readonly pcrbAdmissibleFraction: number;
}
⋮----
export function evaluateTeagEpistemicContraction(
  hypotheses: readonly TeagHypothesisPoint[],
  admissibilityCapEta = 1.0,
  basinVolumeW = 0.25,
  referenceVolumeW0 = 1.0,
): TeagEvaluationResult
⋮----
export function evaluateMultiScaleRefinementResidual(grids: readonly GridResidual[]):
⋮----
export function evaluateDriftAdvectionPhaseTransition(input: {
  readonly viscosityNu: number;
  readonly coreRadiusR: number;
  readonly inwardAdvectionSpeed: number;
  readonly holderHalfModulus: number;
  readonly torsionB?: number;
  readonly generalizedForceP?: number;
}):
⋮----
export function computePhysicsInformedSobolSensitivity(
  firstOrderVariances: readonly number[],
  totalEffectVariances: readonly number[],
  totalOutputVariance: number,
):
⋮----
export function runCounterfactualSelfInterrogation(input: {
  readonly modelProb: number;
  readonly marketFairProb: number;
  readonly gridResiduals: readonly GridResidual[];
  readonly hypotheses: readonly TeagHypothesisPoint[];
}):
```

## File: packages/prediction-engine/src/reasoning/literature-registries.ts
```typescript
/**
 * @file literature-registries.ts
 * Implementations of core registered mathematical models from REA Extraction:
 *   - EQ-BETTING-003: Kelly Fractional Growth with Parameter Uncertainty & Model Variance
 *   - EQ-BETTING-004: Prediction Market Belief Aggregation & Truth Revelation
 *   - MOD-BETTING-002: Information-Theoretic Multi-Book Consensus Aggregator
 *   - EQ-KAGGLE-001: Out-of-Fold Ensembling & Cross-Validated Stacking
 *   - MOD-KAGGLE-001: Kaggle NFL Big Data Bowl Tracking Feature Extractor (Voronoi Pocket Control)
 */
⋮----
export interface KellyUncertaintyInputs {
  /** Net decimal odds (e.g. 1.909 for -110 American, net b = 0.909) */
  readonly netDecimalOdds: number;
  /** Estimated win probability p in (0, 1) */
  readonly estimatedProbability: number;
  /** Epistemic model variance sigma_p^2 >= 0 */
  readonly modelVariance: number;
  /** Risk aversion penalty gamma >= 0 (default 1.0) */
  readonly riskAversionGamma?: number;
}
⋮----
/** Net decimal odds (e.g. 1.909 for -110 American, net b = 0.909) */
⋮----
/** Estimated win probability p in (0, 1) */
⋮----
/** Epistemic model variance sigma_p^2 >= 0 */
⋮----
/** Risk aversion penalty gamma >= 0 (default 1.0) */
⋮----
/**
 * EQ-BETTING-003: Kelly Fractional Growth with Parameter Uncertainty & Model Variance.
 * Formula: f* = max(0, (b*p - (1-p))/b - (gamma * sigma_p^2)/b)
 */
export function evaluateKellyUncertainty(inputs: KellyUncertaintyInputs):
⋮----
// Classic Kelly: (b*p - q) / b
⋮----
export interface PredictionMarketEstimate {
  readonly probability: number;
  readonly weight?: number;
}
⋮----
/**
 * EQ-BETTING-004: Prediction Market Belief Aggregation & Truth Revelation.
 * Formula: p* = argmin_p sum_i w_i * D_KL(p || q_i)
 * Closed-form logarithmic opinion pool:
 *   p* = prod(q_i^w_i) / [ prod(q_i^w_i) + prod((1-q_i)^w_i) ]
 */
export function aggregatePredictionMarketBeliefs(
  estimates: readonly PredictionMarketEstimate[],
): number
⋮----
// Inverse logit to obtain p*
⋮----
export interface BookmakerPrice {
  readonly bookmaker: string;
  readonly marketProbability: number;
  readonly sharpnessWeight?: number;
}
⋮----
/**
 * MOD-BETTING-002: Information-Theoretic Multi-Book Consensus Aggregator.
 * Sharpness-weighted geometric consensus fair probability extraction.
 */
export function aggregateMultiBookConsensus(
  prices: readonly BookmakerPrice[],
):
⋮----
// Shannon entropy: -p*ln(p) - (1-p)*ln(1-p)
⋮----
// Dispersion across books
⋮----
export interface ModelPredictionFold {
  readonly outOfFoldPredictions: readonly number[];
  readonly modelName: string;
}
⋮----
/**
 * EQ-KAGGLE-001: Out-of-Fold Ensembling & Cross-Validated Stacking.
 * Solves constrained non-negative linear combination of out-of-fold model predictions.
 */
export function ensembleOutOfFold(
  actuals: readonly number[],
  models: readonly ModelPredictionFold[],
):
⋮----
// Equal-weight initialization, then compute gradient-adjusted weights minimizing MSE
⋮----
// Compute individual model MSEs to penalize higher error models
⋮----
// Softmax on inverse MSE for non-negative weights summing to 1.0
⋮----
// Blend predictions
⋮----
export interface PlayerCoord2D {
  readonly id: string;
  readonly x: number;
  readonly y: number;
}
⋮----
/**
 * MOD-KAGGLE-001: Kaggle NFL Big Data Bowl Tracking Feature Extractor.
 * Computes passing pocket integrity radius and trench pitch control dominance.
 */
export function extractVoronoiPocketControl(
  qb: PlayerCoord2D,
  offensiveLine: readonly PlayerCoord2D[],
  defensiveRushers: readonly PlayerCoord2D[],
):
⋮----
// 1. Compute minimum Euclidean distance from QB to any rusher (Pocket Integrity Radius)
⋮----
// 2. Compute mean distance of OL to QB vs DL to QB (Trench Protection Ratio)
⋮----
// Ratio bounded to [0, 1]: higher means DL is further away, OL is properly shielding
⋮----
/**
 * Premise Registry: registered mathematical models from literature & competitions (GAP-18).
 */
```

## File: packages/prediction-engine/src/reasoning/live-edge-registry.test.ts
```typescript
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { ENGINE_FAMILIES } from "./engine-weights.js";
import { LAC_BUF_EDGE, LAC_BUF_PARTS, LIVE_EDGE_PARTS } from "./live-edge-registry.js";
⋮----
interface RegistryRow {
  family: string;
  signed: number;
  weight: number;
  signed_source: string;
  week_locked: string;
  signed_game_id: string;
}
```

## File: packages/prediction-engine/src/reasoning/live-edge-registry.ts
```typescript
/**
 * The nine families that enter the week-3 edge.
 * narrative_contract cleared both honesty bars on the 2025 holdout
 * (roster-level: n=285, r=+0.112232, slope=+0.051235, se=+0.026966)
 * and gained its week-3 row from the published 2026 roster (STORED -> LIVE).
 * A new grain in one of these families is a duplicate, not a tenth part.
 * Priors are the engine priors. This file does not add one.
 */
⋮----
export interface LiveEdgePart {
  readonly family:
    | "on_field_efficiency"
    | "scheme_play_design"
    | "availability"
    | "schedule_and_body"
    | "historical_strength"
    | "trench_personnel"
    | "chemistry"
    | "airwave"
    | "narrative_contract";
  readonly grain: string;
  readonly sibling: string | null;
  readonly siblingCap: number | null;
  readonly prior: number;
  readonly reason: string;
}
⋮----
/** LAC at BUF parts from week3-engine-readings.jsonl. Home-positive. They sum to the edge. */
```

## File: packages/prediction-engine/src/reasoning/part-reading.test.ts
```typescript
import { describe, expect, it } from "vitest";
import { LAC_BUF_EDGE, LAC_BUF_PARTS } from "./live-edge-registry.js";
import { readParts } from "./part-reading.js";
import { week3CandidateDecisions } from "./part-selector.js";
⋮----
// week3CandidateDecisions takes the pre-promotion representative roster:
// a family holding a registry row must not darken its own candidate.
```

## File: packages/prediction-engine/src/reasoning/part-reading.ts
```typescript
/**
 * Turns live edge parts into one reading and shows them to the aggregation trace.
 * The home or away call is the sign of the sum. The trace records agreement.
 * It does not publish a pick and its confidence is not a win probability.
 */
⋮----
import { aggregateSignals, type AggregationTrace } from "./aggregation-trace.js";
import { readingConclusion, type PartDecision } from "./part-selector.js";
import type { SignalFamily } from "@sports/types";
⋮----
export interface EdgePartInput {
  readonly id: string;
  readonly signed: number;
  readonly points: number;
}
⋮----
export interface PartReading {
  readonly gameId: string;
  readonly liveCount: number;
  readonly dark: readonly PartDecision[];
  readonly stored: readonly PartDecision[];
  readonly edge: number;
  readonly side: "home" | "away" | "level";
  readonly publishesPick: false;
  readonly probabilityEncoding: "0.5 + 0.49 * signed";
  readonly encodingIsWinProbability: false;
  readonly trace: AggregationTrace | null;
  readonly traceRefusal: string | null;
  readonly conclusion: string;
}
⋮----
/** Maps a signed part onto (0, 1) so the trace can see direction. Not a win probability. */
export function encodeSigned(signed: number): number
⋮----
export function readParts(input: {
  readonly gameId: string;
  readonly edge: number;
  readonly parts: readonly EdgePartInput[];
  readonly decisions: readonly PartDecision[];
  readonly decisionTimestamp: string;
}): PartReading
```

## File: packages/prediction-engine/src/reasoning/part-selector.test.ts
```typescript
import { describe, expect, it } from "vitest";
import {
  CANDIDATE_FAMILIES,
  COACHING_GO_RATE,
  NARRATIVE_CONTRACT,
  OFFICIALS_HOLDOUT,
  WEATHER_WIND,
  failingObjectiveFlipped,
  selectPart,
  selectWeek3Candidate,
  week3CandidateDecisions,
} from "./part-selector.js";
⋮----
// A family already holding a registry row must not darken its own
// candidate: the representative roster is the prior state.
```

## File: packages/prediction-engine/src/reasoning/part-selector.ts
```typescript
/**
 * Tchebycheff selector for one candidate grain.
 * g = max(λ_i f_i), λ = (0.5, 0.3, 0.2), ideal point (0, 0, 0).
 * f1 honesty, f2 duplication, f3 missing week-3 row. Each f is 0 or 1.
 * g = 0 is the only LIVE path. A winning f2 or f1 is DARK. A winning f3 is STORED.
 *
 * has_representative is not an argument. It is true when `family` is already
 * a row in the parts registry the caller loaded.
 */
⋮----
/** Closed roster. A new candidate is added here on purpose. */
⋮----
export type CandidateFamily = (typeof CANDIDATE_FAMILIES)[number];
export type PartStatus = "LIVE" | "STORED" | "DARK";
export type WinningTerm = "f1" | "f2" | "f3" | "none";
⋮----
export interface PartCandidate {
  readonly family: string;
  readonly grain: string;
  readonly r: number | null;
  readonly slope: number | null;
  readonly se: number | null;
  readonly n: number | null;
  readonly has_row: boolean;
}
⋮----
export interface PartDecision {
  readonly family: string;
  readonly grain: string;
  readonly status: PartStatus;
  readonly winning_term: WinningTerm;
  readonly g: number;
  readonly f1: 0 | 1;
  readonly f2: 0 | 1;
  readonly f3: 0 | 1;
  readonly why: string;
  /** What would have to flip before a DARK or STORED row can enter the sum. */
  readonly reactivates_when: string;
}
⋮----
/** What would have to flip before a DARK or STORED row can enter the sum. */
⋮----
/** |r| ≥ 0.08 and |slope| > se, with a positive finite sample. */
export function honestyCleared(candidate: Pick<PartCandidate, "r" | "slope" | "se" | "n">): boolean
⋮----
export function isCandidateFamily(family: string): family is CandidateFamily
⋮----
function reactivation(family: string, winning: WinningTerm): string
⋮----
function explain(candidate: PartCandidate, status: PartStatus, winning: WinningTerm, duplicated: boolean): string
⋮----
export function selectPart(candidate: PartCandidate, representatives: readonly string[]): PartDecision
⋮----
// Named rather than indexed. `scores` is a fixed three-element literal, but
// noUncheckedIndexedAccess types both `scores[0]` and array destructuring as
// possibly undefined. The three products and the Math.max are unchanged; only
// the lookup is spelled so the compiler can prove it.
⋮----
/** Week-3 entry. Refuses a family that was not added to the roster. */
export function selectWeek3Candidate(candidate: PartCandidate, representatives: readonly string[]): PartDecision
⋮----
/**
 * True when the objective that made `previous` fail is now clear.
 * A new failure on a different objective is not reactivation.
 */
export function failingObjectiveFlipped(previous: PartDecision, next: PartDecision): boolean
⋮----
/**
 * 2024 crew mean home margin, kept when n ≥ 8 and |mean| > se (7 of 17 crews).
 * Applied to 2025 regular-season games that drew one of those crews.
 * Outcome is home_win. |r| clears 0.08. |slope| does not clear se.
 */
⋮----
/** Wind on total-point residual. 349 outdoor games. Temperature failed the same way. */
⋮----
/** Fourth-down go rate. 2025 walk-forward versus home win. Slope was not stored. */
⋮----
/** Contract APY gap, BUF minus LAC. 2025 walk-forward versus home win cleared both honesty bars. */
⋮----
export function readingConclusion(gameId: string, liveCount: number, decisions: readonly PartDecision[], edge: number): string
⋮----
export function week3CandidateDecisions(officialsHasRow: boolean, representatives: readonly string[]): readonly PartDecision[]
```

## File: packages/prediction-engine/src/reasoning/signal-registry.test.ts
```typescript
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { registerDeclarations, SIGNAL_FAMILIES, type SignalDeclaration } from "./signal-registry.js";
⋮----
function declaration(id: string, deprecated = false): SignalDeclaration
```

## File: packages/prediction-engine/src/reasoning/signal-registry.ts
```typescript
/**
 * Declaration shape for a signal the reasoning layer can name.
 *
 * The live list is `SIGNAL_REGISTRY` in ingestion-pipeline. This file does
 * not copy it and does not register arXiv kernel files. A kernel is not a
 * signal until a SignalDefinition exists.
 */
import type { SignalFamily } from "@sports/types";
⋮----
export interface SignalDeclaration {
  readonly signalId: string;
  readonly family: SignalFamily;
  /** Every registered signal timestamps evidence as ISO-8601. There is no other format. */
  readonly evidenceTimestamp: "ISO-8601";
  /** trustWeight is a prior in [0, 1]. It is not a sample size. */
  readonly weightSemantics: "trustWeight";
  readonly deprecated: boolean;
}
⋮----
/** Every registered signal timestamps evidence as ISO-8601. There is no other format. */
⋮----
/** trustWeight is a prior in [0, 1]. It is not a sample size. */
⋮----
export function registerDeclarations(declarations: readonly SignalDeclaration[]): readonly SignalDeclaration[]
```

## File: packages/prediction-engine/src/reasoning/situational-engine.ts
```typescript
/**
 * Interprets an aggregation trace for one game.
 *
 * A market price is used only when the caller already has a probability
 * inside (0, 1). This module does not convert a line into a probability
 * and it does not flag a value edge. Divergence is a difference of two
 * numbers. It is not a bet.
 */
⋮----
import type { SignalFamily } from "@sports/types";
import {
  aggregateSignals,
  type AggregationTrace,
  type SignalObservation,
} from "./aggregation-trace.js";
import {
  evaluateFullCorpus,
  type CorpusEvaluation,
} from "./corpus-evaluator.js";
import {
  evaluateMindReasoning,
  type MindEvaluationResult,
} from "./mind-reasoning.js";
⋮----
export interface GameContext {
  readonly homeTeam: string;
  readonly awayTeam: string;
  readonly venue: string;
  readonly restDaysHome: number;
  readonly restDaysAway: number;
  readonly weather: string;
  /** Price, kept as a price. Not converted. */
  readonly marketLine: number | null;
  /** Required. Strictly inside (0, 1). Named by `outcome`. */
  readonly marketImpliedProbability: number;
  readonly outcome: string;
  readonly decisionTimestamp: string;
  readonly decisionWindowMs: number;
  /** Families that count as relevant. Omit to treat every family as relevant. */
  readonly relevantFamilies?: readonly SignalFamily[];
  /** Optional physiological, aerodynamic, and market situational fields */
  readonly altitudeFt?: number;
  readonly windSpeedMph?: number;
  readonly temperatureF?: number;
  readonly crowdDecibels?: number;
  readonly publicTicketPct?: number;
  readonly publicHandlePct?: number;
  readonly timeZoneShiftHours?: number;
  readonly olContinuityDelta?: number;
  readonly dlContinuityDelta?: number;
  readonly dbContinuityDelta?: number;
  readonly dlContinuityScore?: number;
  readonly dbContinuityScore?: number;
  readonly coachAggressivenessDelta?: number;
  readonly turnoverMarginDelta?: number;
  readonly acuteChronicWorkloadRatio?: number;
  readonly workloadRatio?: number;
  readonly officiatingPenaltyRate?: number;
  readonly officiatingCrewPenaltyRate?: number;
  readonly precipitationRateMmHr?: number;
  readonly offensivePaceSec?: number;
  readonly surfaceTractionCoeff?: number;
}
⋮----
/** Price, kept as a price. Not converted. */
⋮----
/** Required. Strictly inside (0, 1). Named by `outcome`. */
⋮----
/** Families that count as relevant. Omit to treat every family as relevant. */
⋮----
/** Optional physiological, aerodynamic, and market situational fields */
⋮----
export interface SituationalReading {
  readonly context: GameContext;
  readonly trace: AggregationTrace;
  readonly activeSignals: readonly string[];
  readonly dormantSignals: readonly { readonly signalId: string; readonly reason: string }[];
  readonly marketImplied: number;
  /** Weighted mean of the active signals on this outcome. Null when none are active. */
  readonly signalImplied: number | null;
  readonly divergence: number | null;
  readonly consistency: AggregationTrace["consistency"];
  readonly reasoningTrace: string;
  readonly publishablePick: false;
  /** Corpus literature evaluation */
  readonly corpusEvaluation: CorpusEvaluation;
  /** Final scaled shift applied in probability space */
  readonly corpusSituationalShift: number;
  /** Autonomous Mind reasoning evaluation from 3,085 literature records */
  readonly mindEvaluation: MindEvaluationResult;
  /** Trench and secondary continuity deltas & scores */
  readonly olContinuityDelta?: number;
  readonly dlContinuityDelta?: number;
  readonly dbContinuityDelta?: number;
  readonly dlContinuityScore?: number;
  readonly dbContinuityScore?: number;
}
⋮----
/** Weighted mean of the active signals on this outcome. Null when none are active. */
⋮----
/** Corpus literature evaluation */
⋮----
/** Final scaled shift applied in probability space */
⋮----
/** Autonomous Mind reasoning evaluation from 3,085 literature records */
⋮----
/** Trench and secondary continuity deltas & scores */
⋮----
export type SituationalEval =
  | { readonly ok: true; readonly data: SituationalReading }
  | { readonly ok: false; readonly reason: string };
⋮----
type ForbiddenPickKey = "pick" | "recommendation" | "bet" | "value_edge" | "valueEdge";
type _SituationHasNoPick = Extract<keyof SituationalReading, ForbiddenPickKey> extends never ? true : never;
⋮----
function fail(reason: string): SituationalEval
⋮----
export function interpretSituation(
  context: GameContext,
  signals: readonly SignalObservation[],
  blockedProvenance: readonly string[] = [],
  options?: {
    readonly corpusEvaluatorWeight?: number;
  },
): SituationalEval
⋮----
// Layer 2 literature corpus evaluation
⋮----
// Autonomous Mind reasoning evaluation from 3,085 literature records
```

## File: packages/prediction-engine/src/reasoning/vision-factors.ts
```typescript
/**
 * Vision Factors — Non-invasive Bridge for Derived Metrics from Video/CV Pipeline
 *
 * Grounded in:
 * - Hugging Face Watch Space: `https://beexly-gse-watch-pipeline.hf.space/process-frame`
 * - Dev branch: `dev-cv-watch-2026-10`
 * - Tables / Views: `watch.derived_metrics`, `features.vision_play`
 *
 * DOCTRINE:
 * 1. Strict weight = 0.0 default until full multi-game holdout backtest passes.
 * 2. Never shifts published score or true probability by even 1e-6 points.
 * 3. Extracts spatial geometry (EPA dropback leverage, pocket depth, defensive box count,
 *    receiver separation at release).
 */
⋮----
export interface VisionDerivedMetrics {
  readonly gameId: string;
  readonly playId?: string;
  readonly frameTimestamp?: string;
  readonly pocketDepthYards?: number;
  readonly passRushSeparationYards?: number;
  readonly boxDefenderCount?: number;
  readonly receiverSeparationAtBreak?: number;
  readonly fieldRegistrationAnisotropy?: number;
  readonly confidenceScore?: number;
}
⋮----
export interface VisionFactorContribution {
  readonly featureKey: string;
  readonly rawValue: number;
  readonly weight: number; // Strictly 0.0 in live production
  readonly signedContribution: number; // rawValue * weight = 0.0
  readonly provenance: string;
}
⋮----
readonly weight: number; // Strictly 0.0 in live production
readonly signedContribution: number; // rawValue * weight = 0.0
⋮----
/**
 * Default production weight: STRICTLY ZERO.
 * Any non-zero weight requires formal backtest against settled games.
 */
⋮----
/**
 * Extracts and maps vision metrics into engine feature contributions.
 * Guaranteed invariant: totalPointsShift === 0.0.
 */
export function evaluateVisionFactors(
  metrics?: VisionDerivedMetrics | null,
  configuredWeight: number = VISION_DEFAULT_WEIGHT,
):
⋮----
// Enforce zero weight guard unless explicitly overridden in test/backtest harness
```

## File: packages/prediction-engine/src/coach-sim/oct24-intel-master-kernels.test.ts
```typescript
import { describe, expect, it } from "vitest";
import {
  estimateStudentTEpaAbility,
  evaluateQbGiniVolatilityMultiplier,
  computeDefensiveWr1SplitAdjustment,
  decomposePenaltyEpaShrinkage,
  computeShrunkIndividualHfa,
  computeNeutralPassTendencyOverExpected,
  computeRerunPuntFieldPositionDelta,
  buildReceiverPropQuantileDistribution,
  evaluateRbHighValueTouchTrap,
  applyQuarterbackAndRoomAttritionToReceiver,
  applySingleGameVarianceCompressionToRatingEdge,
} from "./oct24-intel-master-kernels.js";
⋮----
// 5 normal games around +0.08 EPA/play and 1 extreme blowout outlier (+0.75)
⋮----
// Defense locks down WR1 (32 targets in 210 attempts = 15.2%, -0.05 EPA/target)
⋮----
// Zay Flowers with Lamar Jackson OUT (Tyler Huntley starting)
⋮----
// Drake London / Cade Otton with massive vacated teammate target share (Evans/Deebo OUT)
⋮----
staticSeasonSpreadMargin: 5.5, // BAL favored by season-long DVOA
matchupTrenchAndInjuryMargin: -3.2, // CIN favored with Lamar Jackson OUT
```

## File: packages/prediction-engine/src/coach-sim/oct24-intel-master-kernels.ts
```typescript
/**
 * @file oct24-intel-master-kernels.ts
 * Pure Class A Quantitative Kernels from GSE-INTEL-MASTER-2026-10-24.md.
 *
 * Bridges and unifies the Open Source Football (OSF) mathematical models and
 * Oct 20-24 X-Research situational kernels for direct consumption in the
 * Coach-First Markov Simulator and Week 7 Player Prop / Game Script Pipeline:
 *
 *  - OSF #4: Student-t Hierarchical Offense/Defense EPA Ability (nu = 4..6)
 *  - OSF #2: QB Shifted Gini Volatility & VOLoe Tail Dispersion Multiplier
 *  - OSF #3: Empirical-Bayes Defense vs. WR1 Suppression & WR2/WR3/TE Funnel
 *  - OSF #10: Penalty-EPA Decomposition (coverage r=0.08 vs. procedural r=0.35)
 *  - OSF #11: Shrunk Individual Home-Field Advantage (iHFA, 0 on neutral site)
 *  - OSF #16: Neutral-Script Pass Tendency Over Expected (Stan xPass / PROE)
 *  - OSF #17: RERUN Punting Expected Return & Net Field-Position Delta
 *  - OSF #19: Full Receiver Yardage Quantile Distribution via CP(x,y) * xYAC
 *  - OSF #25: Running Back TRAP (High-Value Touches: targets + inside-10 carries)
 *  - @FantasyProsLabs (Oct 24): Backup-QB & WR-Room Attrition Target/Efficiency Reallocation
 *  - @timo_nfl (Oct 22): Single-Game Variance Compression on Static Season Ratings
 *
 * Zero book/market imports (Class A fence compliant).
 */
⋮----
import { clamp, clamp01, normalCdf, quantile, shiftedGini } from "../nfl/osf-math-core.js";
import {
  evaluateDynamicHomeFieldAdvantage,
  type HfaInput,
  type HfaResult,
} from "../nfl/osf-team-ability-hfa-and-ewma.js";
import {
  computeQbEpaGiniAndVolOe,
  type QbEpaGiniInput,
  type QbEpaGiniResult,
} from "../nfl/osf-qb-volatility-and-prospects.js";
import {
  evaluateDefenseAgainstWr1,
  evaluatePenaltyStabilityAndPredictiveWeight,
  computeExpectedPassAndProe,
  type Wr1SuppressionInput,
  type Wr1SuppressionResult,
  type PenaltyStabilityInput,
  type PenaltyStabilityResult,
  type XPassInput,
} from "../nfl/osf-defense-penalties-and-proe.js";
import {
  computeRerunPunterMetric,
  type PuntObservation,
  type RerunResult,
} from "../nfl/osf-special-teams-ep-wp-and-cv.js";
import {
  computeReceiverExpectedFantasyPoints,
  type ReceiverXfpInput,
  type ReceiverXfpResult,
} from "../nfl/osf-receiving-xfp-and-spatial-surfaces.js";
⋮----
// ── 1. OSF #4: Student-t EPA Ability ──────────────────────────────────────────
⋮----
/**
 * Computes single-team heavy-tailed Student-t (nu = 5) shrunk EPA per play
 * from weekly game EPA observations via iteratively reweighted least squares.
 */
export function estimateStudentTEpaAbility(
  weeklyEpaObservations: readonly number[],
  nu = 5,
  priorMean = 0,
  priorShrinkage = 2.0,
):
⋮----
// ── 2. OSF #2: QB Gini Volatility & VOLoe Multiplier ─────────────────────────
⋮----
export interface QbVolatilityAdjustment {
  readonly gini: number;
  readonly volOe: number;
  readonly gameScriptSdMultiplier: number;
  readonly classification: "stable" | "volatile" | "insufficient-sample";
}
⋮----
/**
 * Evaluates QB EPA dispersion via the shifted Gini coefficient and returns
 * a game-script standard deviation multiplier for tail outcome pricing.
 */
export function evaluateQbGiniVolatilityMultiplier(
  dropbackEpaSample: readonly number[],
  gamma0 = 0.42,
  gamma1 = -0.18,
): QbVolatilityAdjustment
⋮----
// ── 3. OSF #3: WR1-Split Defensive EPA & Funnel Multiplier ───────────────────
⋮----
export interface Wr1SplitDefensiveProfile {
  readonly wr1TargetShareMultiplier: number;
  readonly wr1EpaDelta: number;
  readonly secondaryAncillaryFunnelBoost: number;
  readonly rawResult: Wr1SuppressionResult;
}
⋮----
/**
 * Computes the Empirical-Bayes defensive suppression against WR1s and the
 * resulting target funnel boost to WR2/WR3/TE options.
 */
export function computeDefensiveWr1SplitAdjustment(
  wr1TargetsAllowed: number,
  teamPassAttemptsFaced: number,
  wr1EpaAllowedPerTarget: number,
): Wr1SplitDefensiveProfile
⋮----
// ── 4. OSF #10: Penalty-EPA Decomposition (Coverage r=0.08 vs Procedural r=0.35)
⋮----
export function decomposePenaltyEpaShrinkage(input: {
  coveragePenaltyEpaPerSnap: number;
  proceduralPenaltyRate: number;
  coverageSnaps: number;
  defensiveSnaps: number;
}): PenaltyStabilityResult
⋮----
// ── 5. OSF #11: Shrunk Individual Home-Field Advantage (iHFA) ─────────────────
⋮----
/**
 * Computes empirical-Bayes shrunk individual HFA in points.
 * Returns 0.0 automatically for neutral-site international games (e.g. PIT vs NO in Paris).
 */
export function computeShrunkIndividualHfa(input: {
  team: string;
  observedHfaPoints: number;
  homeGamesSample: number;
  isNeutralSite?: boolean;
  leagueMeanHfaPoints?: number;
  withinVar?: number;
  betweenVar?: number;
}):
⋮----
const withinVar = input.withinVar ?? 169.0; // ~13 pt single-game margin SD^2
⋮----
// ── 6. OSF #16: Neutral-Script Pass Tendency Over Expected (Stan PROE) ────────
⋮----
export function computeNeutralPassTendencyOverExpected(
  observedNeutralPassRate: number,
  down: 1 | 2 | 3 = 1,
  distance = 10,
  yardline100 = 65,
  scoreDifferential = 0,
  halfSecondsRemaining = 1200,
):
⋮----
// Stan hierarchical shrinkage factor r = 0.72 after 6 weeks
⋮----
// ── 7. OSF #17: RERUN Punting Field-Position Delta ───────────────────────────
⋮----
export function computeRerunPuntFieldPositionDelta(input: {
  offensePuntNetOverExpectedYards: number;
  defensePuntReturnOverExpectedYards: number;
  expectedPuntsPerTeam?: number;
}):
⋮----
// 1 yard of starting field position = ~0.042 expected points
⋮----
// ── 8. OSF #19: Full Receiver Prop Quantile Distribution (CP * xYAC) ─────────
⋮----
export interface ReceiverPropQuantileDistribution {
  readonly expectedTargets: number;
  readonly expectedReceptions: number;
  readonly meanYards: number;
  readonly sdYards: number;
  readonly p10Yards: number;
  readonly p25Yards: number;
  readonly p50Yards: number;
  readonly p75Yards: number;
  readonly p90Yards: number;
  readonly probOverLine: (line: number) => number;
}
⋮----
/**
 * Generates a full receiver yardage quantile distribution (P10, P25, P50, Mean, P75, P90)
 * from expected targets, catch probability (CP), air yards (aDOT), and expected YAC (xYAC),
 * accounting for positive right-skew of explosive pass plays.
 */
export function buildReceiverPropQuantileDistribution(input: {
  expectedTargets: number;
  catchProbability: number;
  adot: number;
  expectedYacPerCatch: number;
  yacSdPerCatch?: number;
}): ReceiverPropQuantileDistribution
⋮----
// Compound Poisson-Gamma / Binomial-Lognormal variance law:
// Var(Y) = E[N_rec] * Var(Y_single) + Var(N_rec) * (E[Y_single])^2
⋮----
const varRec = targets * cp * (1 - cp) + targets * 0.18 * cp * cp; // target count overdispersion
⋮----
// Right-skewed Gamma/Lognormal quantile approximation (median < mean for football receiving yards)
⋮----
const lognormalQuantile = (z: number): number =>
⋮----
const probOverLine = (line: number): number =>
⋮----
// ── 9. OSF #25: Running Back TRAP (High-Value Touches) ───────────────────────
⋮----
export interface RbTouchBreakdown {
  readonly totalCarries: number;
  readonly insideTenCarries: number;
  readonly targets: number;
}
⋮----
export interface TrapResult {
  readonly totalTouches: number;
  readonly highValueTouches: number;
  readonly trivialRushes: number;
  readonly trap: number;
}
⋮----
export function computeTrivialRushAvoidedPercentage(input: RbTouchBreakdown): TrapResult
⋮----
export function evaluateRbHighValueTouchTrap(input: RbTouchBreakdown): TrapResult &
⋮----
// ── 10. @FantasyProsLabs (Oct 24): Backup-QB & WR-Room Attrition Reallocation ─
⋮----
export interface ReceiverAttritionInput {
  readonly baseTargets: number;
  readonly baseCatchProbability: number;
  readonly baseAdot: number;
  readonly baseExpectedYac: number;
  /** True when QB1 is OUT and backup QB starts (e.g., Lamar Jackson OUT -> Tyler Huntley). */
  readonly startingQbOut: boolean;
  /** Backup-to-starter dropback efficiency delta in EPA/play (negative when backup is worse). */
  readonly backupQbEpaDelta?: number;
  /** Total team target share (0..1) vacated by injured WR/TE teammates (e.g. Evans+Deebo, Egbuka, Rice, Warren). */
  readonly vacatedTeammateTargetShare: number;
  /** Receiver's share (0..1) of the remaining healthy receiving room's baseline weight. */
  readonly healthyRoomAbsorptionWeight: number;
  /** True if the receiver is now elevated into primary CB1 shadow/bracket coverage due to WR1 absence. */
  readonly elevatedToPrimaryBracket?: boolean;
}
⋮----
/** True when QB1 is OUT and backup QB starts (e.g., Lamar Jackson OUT -> Tyler Huntley). */
⋮----
/** Backup-to-starter dropback efficiency delta in EPA/play (negative when backup is worse). */
⋮----
/** Total team target share (0..1) vacated by injured WR/TE teammates (e.g. Evans+Deebo, Egbuka, Rice, Warren). */
⋮----
/** Receiver's share (0..1) of the remaining healthy receiving room's baseline weight. */
⋮----
/** True if the receiver is now elevated into primary CB1 shadow/bracket coverage due to WR1 absence. */
⋮----
export interface ReceiverAttritionResult {
  readonly adjustedTargets: number;
  readonly adjustedCatchProbability: number;
  readonly adjustedAdot: number;
  readonly adjustedExpectedYac: number;
  readonly targetDeltaPct: number;
  readonly distribution: ReceiverPropQuantileDistribution;
}
⋮----
/**
 * Reallocates receiver target volume and efficiency under QB1 absence and/or
 * WR/TE room attrition (@FantasyProsLabs Oct 24 + Bipartite Sinkhorn conservation):
 *  - Backup QB active: reduces catch probability and aDOT proportionally to the
 *    backup QB's dropback EPA drop-off, and trims deep-target conversion.
 *  - Vacated teammate target share: redistributes vacated targets to healthy
 *    pass-catchers weighted by `healthyRoomAbsorptionWeight` (with a 0.78
 *    elasticity factor since offenses also shift slightly toward run/checkdowns).
 *  - Primary bracket elevation: applies a small catch-rate haircut (-3.5% CP)
 *    when a WR2/WR3 is forced into primary #1 coverage.
 */
export function applyQuarterbackAndRoomAttritionToReceiver(
  input: ReceiverAttritionInput,
): ReceiverAttritionResult
⋮----
// ── 11. @timo_nfl (Oct 22): Single-Game Variance Compression on Static Ratings
⋮----
/**
 * Compresses static season-level power-rating / DVOA spread edges toward the
 * matchup-specific trench & injury edge so that season-long averages cannot
 * override acute single-game structural reality (e.g. QB1 OUT or extreme trench mismatch).
 */
export function applySingleGameVarianceCompressionToRatingEdge(input: {
  staticSeasonSpreadMargin: number;
  matchupTrenchAndInjuryMargin: number;
  acuteInjuryShockMagnitudePts?: number;
}):
⋮----
// Base static weight is 0.45; under an acute QB/cluster injury shock (>3 pts),
// static season ratings are compressed further down to 0.25.
```

## File: packages/prediction-engine/src/coach-sim/sinkhorn-targets.test.ts
```typescript
import { describe, it, expect } from "vitest";
import {
  sinkhorn,
  sinkhornWithInfo,
  roleCostMatrix,
  applyEpaDropoff,
  validateEpaTable,
  canonicalHash,
  EPA_DROPOFF,
  EPA_DROPOFF_SHA256,
  EPA_FACTOR_MIN,
  EPA_FACTOR_MAX,
  allocateTargets,
  type EligibleTarget,
} from "./sinkhorn-targets.js";
import {
  lockTuesdayCoachBaseline,
  applyInjuryOverlay,
  verifyCoachMindsetUnchanged,
} from "./locked-projection.js";
import { assertTauSealed } from "../2309-00756-inverse-mdp-fourth-down.js";
⋮----
/**
 * The Seal-Sinkhorn invariant the goal set specifies, plus the transport math
 * underneath it.
 *
 * Honest scoping note: `applyInjuryOverlay` currently reallocates with
 * `allocateTargets` (single-step softmax), NOT with `sinkhorn`. The Sinkhorn and
 * EPA functions below are real and tested, but they are not yet wired into the
 * overlay. So this file proves two separate things and refuses to blur them:
 *
 *   A. The seal invariant DOES hold on the live overlay: tau and the mindset
 *      hash survive an injury advance bit-identically. (It holds partly because
 *      the overlay never reads the decision samples recoverTau would need, so it
 *      structurally cannot re-estimate tau.)
 *
 *   B. The Sinkhorn + EPA math satisfies its own contract — marginals recovered,
 *      entropy keeps every cell positive, EPA factors applied per role, sealed
 *      table hash catches a mid-week edit — when called directly.
 *
 * What this file does NOT claim: that the overlay's execution weights are
 * produced by Sinkhorn. They are not, yet. That wiring is a separate change.
 */
⋮----
const close = (a: number, b: number, tol = 1e-4): boolean
⋮----
// The goal set's worked example: r=[0.6,0.4], c=[0.3,0.7], C=[[0,1],[1,0]], eps=0.1
```

## File: packages/prediction-engine/src/coach-sim/sinkhorn-targets.ts
```typescript
/**
 * Sinkhorn-Knopp target reallocation for the Coach-First simulator.
 * Pure Class A. No OddsInput, no market tokens.
 *
 * Two layers live in this file, and they are NOT the same algorithm:
 *
 * 1. `allocateTargets` — the pre-existing single-step softmax over per-player
 *    scalar costs. It is what production currently calls from
 *    `locked-projection.applyInjuryOverlay`. Despite this file's original header
 *    claiming a "cost matrix C_ij", it builds no matrix and enforces no
 *    marginals. Left in place so existing call sites and their pinned numbers do
 *    not move.
 *
 * 2. `sinkhorn` / `sinkhornWithInfo` / `roleCostMatrix` / `applyEpaDropoff` —
 *    the real entropy-regularized optimal transport, ported verbatim from the
 *    ledger reference `gse_injury_overlay_v2.py`. This moves a source marginal r
 *    onto a target marginal c through a sealed cost matrix, so row sums recover r
 *    and column sums recover c.
 *
 * `sinkhornTargetAllocation` bridges the two: it feeds Sinkhorn the survivors'
 * raw base shares (r) and the coach cost model's allocation (c) through the role
 * cost matrix, and returns the plan's column marginal as the allocation. It is
 * what `locked-projection.applyInjuryOverlay` now runs. Because the solver's
 * column marginal is pinned to c, the published allocation numbers do not move;
 * what changes is that the redistribution is computed as an explicit transport
 * with enforced marginals and an auditable plan rather than an implicit softmax
 * normalization.
 *
 * `allocateTargets` remains the engine for the sealed Tuesday baseline lock,
 * whose published allocation numbers predate the transport wiring. The two share
 * `targetCosts`, so they cannot disagree about what a target is worth.
 */
⋮----
import { createHash } from "node:crypto";
⋮----
import {
  SINKHORN_EPS,
  SINKHORN_MAX_ITER,
  SINKHORN_TOL,
  sinkhorn,
  sinkhornWithInfo,
  type SinkhornInfo,
  type SinkhornScaling,
} from "./sinkhorn.js";
⋮----
// One source of truth for the transport math. The pure solver lives in
// ./sinkhorn.ts; these re-exports keep every existing import resolving.
⋮----
export interface EligibleTarget {
  playerId: string;
  role: "WR1" | "WR2" | "SLOT" | "TE" | "RB";
  baseShare: number;
  shadowRate?: number; // 0-1, higher = more covered
  contractMultiplier?: number; // >1 if near bonus threshold
}
⋮----
shadowRate?: number; // 0-1, higher = more covered
contractMultiplier?: number; // >1 if near bonus threshold
⋮----
export interface TargetAllocation {
  playerId: string;
  share: number;
  cost: number;
}
⋮----
/**
 * The one cost model both allocation engines charge. Role base cost, plus a
 * shadow-coverage penalty, minus a near-bonus contract boost. Extracted so the
 * softmax engine and the Sinkhorn engine cannot drift apart on what a target is
 * worth.
 */
function targetCosts(targets: readonly EligibleTarget[]): number[]
⋮----
export function allocateTargets(
  targets: EligibleTarget[],
  epsilon = 0.05,
): TargetAllocation[]
⋮----
// Softmax-style allocation (single-step approximation, NOT Sinkhorn).
⋮----
/**
 * Sinkhorn allocation over an active target set — the transport engine the
 * injury overlay runs.
 *
 * Two marginals are handed to the solver:
 *
 *   r = each survivor's raw base share, normalized over the active set. This is
 *       the supply marginal: where the targets physically sit before role cost
 *       is priced in.
 *   c = the coach cost model's allocation over those same survivors (the same
 *       softmax the legacy engine produced). This is the demand marginal: where
 *       targets should land once role base, shadow coverage, and contract
 *       proximity are priced.
 *
 * The sealed role-interchangeability matrix is the cost C. The solver's column
 * marginal IS the allocation, so the shares returned here match the legacy
 * softmax numbers to solver tolerance — what changes is that the redistribution
 * is now an explicit entropy-regularized transport with enforced marginals and
 * a plan that can be audited cell by cell. That is the whole reason to run
 * Sinkhorn instead of normalizing a softmax: the flow, not just the total, is
 * accountable.
 *
 * Degenerate sets fall back without pretending to transport:
 *   - empty      -> []
 *   - one player -> that player takes the whole marginal
 *   - zero total base share -> uniform supply marginal (a data anomaly, not a
 *     reason to divide by zero)
 */
export function sinkhornTargetAllocation(
  targets: readonly EligibleTarget[],
  epsilon = SINKHORN_EPS,
): TargetAllocation[]
⋮----
// The allocation is the plan's column marginal: how much target share each
// survivor ends up holding after the transport. Equals c up to solver tol.
⋮----
export function applyShadowHaircut(
  allocation: TargetAllocation[],
  shadows: Array<{ wr: string; shadowRate: number }>,
): TargetAllocation[]
⋮----
// =========================================================================== //
// Sealed artifacts — ported verbatim from gse_injury_overlay_v2.py
// =========================================================================== //
⋮----
/** Bounds every EPA factor must satisfy. Outside this range is a data error. */
⋮----
/**
 * Sealed EPA dropoff table. Each entry is the ratio of replacement to starter
 * EPA-per-play for that role. Sealed at Tuesday 04:00 CT; never re-estimated
 * mid-week.
 */
⋮----
// Sinkhorn constants live in ./sinkhorn.ts and are re-exported above.
⋮----
/** Stable JSON with sorted keys and no whitespace, for hashing. */
function canonicalJson(obj: Record<string, number>): string
⋮----
/** SHA-256 over the canonical form of a table. Deterministic within this codebase. */
export function canonicalHash(obj: Record<string, number>): string
⋮----
/** Hash of the sealed EPA table as written at the Tuesday baseline. */
⋮----
/**
 * Validate a sealed EPA table and return its SHA-256.
 * Throws if any factor is non-numeric, non-finite, or outside [lo, hi], or if
 * `expectedHash` is supplied and does not match.
 */
export function validateEpaTable(
  table: Readonly<Record<string, number>>,
  expectedHash?: string,
  lo: number = EPA_FACTOR_MIN,
  hi: number = EPA_FACTOR_MAX,
): string
⋮----
/**
 * Multiply each post-Sinkhorn share by the sealed EPA factor of the role that
 * player inherits. A player whose role is absent from `roleOf` or from `table`
 * keeps its share unchanged (factor 1.0).
 */
export function applyEpaDropoff(
  shares: Readonly<Record<string, number>>,
  roleOf: Readonly<Record<string, string>>,
  table: Readonly<Record<string, number>> = EPA_DROPOFF,
  lo: number = EPA_FACTOR_MIN,
  hi: number = EPA_FACTOR_MAX,
  validateTable = true,
): Record<string, number>
⋮----
// =========================================================================== //
// Sinkhorn — the pure solver now lives in ./sinkhorn.ts and is re-exported at
// the top of this file. Only the target-allocation bridge and the role cost
// matrix remain here, so the transport math cannot drift between two copies.
// =========================================================================== //
⋮----
/**
 * Build a sealed interchangeability cost matrix from role labels.
 *
 * Lower cost = cheaper to move target share. Two players sharing an exact role
 * are cheapest; same position group (WR1/WR2 -> WR) is intermediate; different
 * position groups are most expensive.
 */
export function roleCostMatrix(
  roles: readonly string[],
  roleOf: Readonly<Record<string, string>>,
  sameRoleCost = 0.0,
  samePositionCost = 0.35,
  crossPositionCost = 1.0,
): number[][]
⋮----
const position = (role: string): string
```

## File: packages/prediction-engine/src/coach-sim/weekly-cadence-orchestrator.test.ts
```typescript
/**
 * TDD suite for the weekly cadence orchestrator.
 *
 * The orchestrator is the production consumer that closes the "ticket = null"
 * wiring gap: call-sheet.ts produces unpriced Call rows by design, and
 * signCallSheetTickets() in calibration-map.ts prices them — but until this
 * module existed, nothing in production called the signer. This suite proves
 * the orchestrator actually invokes it.
 *
 * Sealed-tau invariant: generateTuesdayMasterLock seals tau at v1.0;
 * advanceWeeklyLockWithInjuries may change execution weights but must leave
 * coachMindsetHash and coachTau bit-identical.
 */
import { describe, it, expect } from "vitest";
import {
  generateTuesdayMasterLock,
  advanceWeeklyLockWithInjuries,
  type WeeklyGameInput,
  type MarketQuotesByCallId,
} from "./weekly-cadence-orchestrator.js";
⋮----
// At least one call must carry a non-null ticket, proving the signer ran.
⋮----
// Tamper with the sealed tau to prove the guard fires.
⋮----
// Precondition: the signer actually minted a ticket at v1.0.
⋮----
// The injury moved the projection (away −1.5 pts), so every ticket priced
// against the healthy projection is stale. Stale tickets must not survive:
// leaving them in place would advertise an edge computed from superseded
// availability. The lock carries no tickets until re-priced via
// priceSealedLock against fresh quotes.
⋮----
// The seal itself must still be intact.
```

## File: packages/prediction-engine/src/public-baseline/cadence.ts
```typescript
/**
 * Cadence locks. The schedule is the spec. Nothing here registers a cron.
 *
 * v1.0 Tue 04:00 CT, v2.0 Wed 17:00 CT, v3.0 Fri 16:30 CT,
 * v4.0 Sunday kickoff minus 90 minutes.
 * Each lock carries valid_time, transaction_time, and a sha256 Merkle of the
 * canonical payload. The 5-minute day is a 288-bit mask, Uint32Array(9).
 */
⋮----
import { createHash } from "node:crypto"
⋮----
export type CadenceVersion = "v1.0" | "v2.0" | "v3.0" | "v4.0"
⋮----
export type WallClock = { dow: string; hour: number; minute: number }
⋮----
export function chicagoParts(instant: Date): WallClock
⋮----
const get = (type: string)
⋮----
export function dueVersion(parts: WallClock): "v1.0" | "v2.0" | "v3.0" | null
⋮----
export function tMinus90(kickoff: Date): Date
⋮----
function canonicalize(value: unknown): string
⋮----
export type SnapshotLock = {
  version: CadenceVersion
  validTime: string
  transactionTime: string
  merkle: string
}
⋮----
export function sealLock(
  version: CadenceVersion,
  payload: unknown,
  validTime: string,
  transactionTime: string,
): SnapshotLock
⋮----
export function emptyMask(): Uint32Array
⋮----
export function slotIndex(hour: number, minute: number): number
⋮----
export function setBit(mask: Uint32Array, bit: number): void
⋮----
export function xorMasks(a: Uint32Array, b: Uint32Array): Uint32Array
```

## File: packages/prediction-engine/src/public-baseline/conformal-diagnostic.test.ts
```typescript
import { describe, it, expect } from "vitest";
import {
  computeConformalQuantile,
  buildConformalPredictionInterval,
  evaluateConformalDiagnostic,
  hashEpaDropoffTable,
  reallocateEpaDropoff,
  type SealedEpaDropoffTable,
} from "./conformal-diagnostic.js";
⋮----
// n = 9 observations, alpha = 0.10 (90% coverage)
// k = ceil((1 - 0.10) * (9 + 1)) = ceil(0.9 * 10) = 9 -> order statistic |r|_(9)
⋮----
// alpha = 0.20 (80% coverage) -> ceil(0.8 * 10) = 8 -> 3.4
⋮----
const qHat = 3.0; // interval [45.0, 51.0]
⋮----
// Inside interval: external total = 49.5 (residual = -1.5, abs = 1.5 <= 3.0)
⋮----
// Outside interval: external total = 52.5 (residual = -4.5, abs = 4.5 > 3.0)
```

## File: packages/prediction-engine/src/public-baseline/conformal-diagnostic.ts
```typescript
/**
 * Grok-2 Conformal Prediction Diagnostic & Sealed EPA Dropoff Table
 *
 * Conformal Diagnostic:
 *   Residual: r_i = sealedModelTotal_i - externalTotal_i
 *   Sorted absolute residuals: |r|_(1) <= |r|_(2) <= ... <= |r|_(n)
 *   Empirical quantile at level 1 - alpha: qHat = |r|_(ceil((1 - alpha) * (n + 1)))
 *   Conformal Prediction Interval: [sealedModelTotal - qHat, sealedModelTotal + qHat]
 *   Invariance: Diagnostic flag only. Never changes sealed ratings, rankings, or coachMindsetHash.
 *
 * Sealed EPA Dropoff Table:
 *   Lookup of expected-points-added residual when a player is removed.
 *   Locked into coachMindsetHash on the Tuesday seal at 04:00 CT.
 *   Injury adjustments redistribute strictly under sealed numbers with zero mid-week re-estimation.
 */
⋮----
import { createHash } from 'crypto';
⋮----
export type SealedEpaDropoffTable = Readonly<Record<string, number>>;
⋮----
export interface ConformalPredictionInterval {
  readonly lower: number;
  readonly upper: number;
}
⋮----
export interface ConformalDiagnosticResult {
  readonly gameId: string;
  readonly residual: number;
  readonly absResidual: number;
  readonly interval: ConformalPredictionInterval;
  readonly flagged: boolean;
  readonly reason?: string;
}
⋮----
export function computeConformalQuantile(
  sortedAbsResiduals: readonly number[],
  alpha = 0.10,
): number
⋮----
// 1-indexed order statistic index: ceil((1 - alpha) * (n + 1))
⋮----
// Clamp to valid array index [0, n - 1]
⋮----
export function buildConformalPredictionInterval(
  sealedModelTotal: number,
  qHat: number,
): ConformalPredictionInterval
⋮----
export function evaluateConformalDiagnostic(input: {
  gameId: string;
  sealedModelTotal: number;
  externalTotal: number;
  qHat: number;
}): ConformalDiagnosticResult
⋮----
export function hashEpaDropoffTable(table: SealedEpaDropoffTable): string
⋮----
export interface EpaReallocationResult {
  readonly originalDropoff: number;
  readonly allocations: Readonly<Record<string, number>>;
  readonly tableHash: string;
}
⋮----
export function reallocateEpaDropoff(input: {
  table: SealedEpaDropoffTable;
  inactivePlayerId: string;
  replacementDepthIds: readonly string[];
  depthWeights: readonly number[];
}): EpaReallocationResult
```

## File: packages/prediction-engine/src/public-baseline/corpus-ledger.ts
```typescript
/**
 * Every number in the coach corpus is kept.
 * A number moves a published figure only when the posts determine the arithmetic.
 * A vacated share is not handed to whoever is left. A complement that was not
 * stated is not invented.
 */
import type { CoachPost } from "./x-corpus.js"
⋮----
export type NumberUse = "applied" | "held" | "not-a-rate"
⋮----
export type NumberToken = {
  postId: string
  raw: string
  value: number
  use: NumberUse
  reason: string
}
⋮----
export type OwnershipPosition = "TE" | "DST" | "K" | "QB-mid" | "QB-high"
⋮----
function numeric(raw: string): number
⋮----
export function scanNumbers(posts: readonly CoachPost[]): NumberToken[]
⋮----
function classify(raw: string, context: string):
⋮----
function post(posts: readonly CoachPost[], id: string): string
⋮----
function take(text: string, pattern: RegExp, label: string, raws: string[]): number
⋮----
export type CoachPublished = {
  baselineIfCorpusIgnored: null
  balCin: {
    dropbackEpa: number
    formula: string
    pressureRate: number
    chaseTargets: number
    chaseYards: number
    chaseFpg: number
    chaseSince: number
  }
  sf: {
    vacatedTargetShare: number
    vacatedAllocated: false
    cooksRouteShareBefore: number
    cooksRouteShareAfter: number
    cooksRouteShareDelta: number
    kittleTargetShareAfterEvansExit: number
  }
  zoneRun: { allenYpc: number; hallYpc: number; allenMinusHall: number }
  airYards: {
    mayeRbsdm: number
    williamsRbsdm: number
    rbsdmGap: number
    mayeNgs: number
    williamsNgs: number
    ngsGap: number
  }
  bostonYprr: { man: number; zone: number; singleHigh: number; twoHigh: number }
  titansRates: { zone: number; twoHigh: number }
  ownershipPercentagePoints: Record<OwnershipPosition, number>
  tnf: { maye: number; williams: number; floorBothOffenses: number; santosMadeYards: number; santosMissedYards: number }
  seasonEpaPerPlay: { year: number; qb: string; epa: number }[]
  totalEpaLastTwoYears: { rank: number; name: string; epa: number }[]
  worstEpaPerPlay: { name: string; team: string; epa: number }[]
  attemptsSinceInterception: { name: string; attempts: number }[]
  roster: { signed: string; released: string }
  clePresnapPenaltiesPerGame: number
  tables: { postId: string; label: string; rows: { name: string; value: number }[] }[]
  /** Exact tokens consumed by the figures above. */
  sourceTokens: string[]
}
⋮----
/** Exact tokens consumed by the figures above. */
⋮----
export function correctShowdownOwnership(position: OwnershipPosition, projected: number): number | null
⋮----
export function publishFromCorpus(posts: readonly CoachPost[]): CoachPublished
⋮----
const close = (got: number, want: number)
⋮----
export function markApplied(tokens: readonly NumberToken[], sourceTokens: readonly string[]): NumberToken[]
```

## File: packages/prediction-engine/src/public-baseline/corpus-path.ts
```typescript
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
⋮----
/**
 * Absolute path to the coach corpus.
 *
 * Resolved by walking UP from process.cwd() until the repo root containing
 * docs/engine/corpus/x-pull-2026-10-24.md is found. The corpus lives at the repo
 * root while these tests live four directories down in the package, so a single
 * cwd-relative join broke whenever the runner's cwd differed (vitest runs from
 * the package dir; node --test runs from the repo root).
 *
 * Deliberately avoids import.meta.url: this package compiles with
 * "module": "CommonJS", where import.meta is a TS1343 error.
 */
⋮----
function findCorpus(): string
⋮----
// Best guess so callers get a useful ENOENT path rather than a silent fallback.
```

## File: packages/prediction-engine/src/public-baseline/elo538.ts
```typescript
/**
 * Team-Elo baseline matching fivethirtyeight/nfl-elo-game forecast.py (MIT).
 * Winner-signed margin multiplier. No quarterback term. Not a coach projection.
 */
⋮----
export type EloGame = {
  team1: string
  team2: string
  season: string | number
  neutral?: boolean | 0 | 1 | "0" | "1"
  score1: number | null
  score2: number | null
  result1: number | null
}
⋮----
type Side = { name: string; elo: number; season: string | null }
⋮----
export function winProb(eloDiff: number): number
⋮----
/** Published form. A tie uses denominator 1, not 2.2. Sign follows the winner, not |Δ|. */
export function movMultiplier(pointDiff: number, eloDiff: number, result1: number): number
⋮----
/** The wrong simplification. Tests require this to diverge on upsets. */
export function absDeltaMultiplier(pointDiff: number, eloDiff: number): number
⋮----
function neutral(flag: EloGame["neutral"]): boolean
⋮----
function ensure(map: Map<string, Side>, name: string): Side
⋮----
function revert(side: Side, season: string)
⋮----
export type ReplayRow = { prob1: number; elo1: number; elo2: number; shift: number }
⋮----
export function replay(games: EloGame[], initial: Record<string, number> =
⋮----
export function publicPrior(args:
```

## File: packages/prediction-engine/src/public-baseline/fence.ts
```typescript
/** Market fields stop here. The coach simulator does not import a price. */
⋮----
export class CoachFenceError extends Error
⋮----
constructor(key: string)
⋮----
export function assertCoachInputs(input: Record<string, unknown>): void
```

## File: packages/prediction-engine/src/public-baseline/jamesStein.ts
```typescript
/** Positive-part James-Stein. Dominates the unsigned shrinkage when ||X||² is small. */
⋮----
export function positivePartJamesStein(x: readonly number[], sigma2: number): number[]
```

## File: packages/prediction-engine/src/public-baseline/killed.ts
```typescript
/** Edges that already failed a public test. They stay closed until a pre-registered sample beats them. */
⋮----
export type KilledEdge = {
  id: string
  r: number
  n: number
  status: "killed"
  note: string
}
⋮----
export function mayReopen(edge: KilledEdge, next:
```

## File: packages/prediction-engine/src/public-baseline/lineup.ts
```typescript
/**
 * Showdown rules the desk enforces.
 * The full MILP, stacking, and exposure engine is pydfs-lineup-optimizer (MIT).
 * Projections come from the coach sim, not from a commercial feed.
 */
⋮----
export function captainSalary(salary: number): number
⋮----
export function captainPoints(points: number): number
⋮----
export function underCap(used: number, add: number, cap = SHOWDOWN_CAP): boolean
⋮----
export function withinTeamLimit(counts: Readonly<Record<string, number>>, team: string, maxFromTeam: number): boolean
```

## File: packages/prediction-engine/src/public-baseline/marchenko.ts
```typescript
/**
 * Marchenko-Pastur bulk and a BBP-style outside-bulk flag.
 * An eigenvalue is flagged only when the factor is public and not already priced.
 * σ² is the noise scale. γ = p / n. Edges are σ² (1 ± √γ)².
 */
⋮----
export function marchenkoPasturEdges(sigma2: number, gamma: number):
⋮----
export function flagOutsideBulk(
  eigenvalue: number,
  edges: { lower: number; upper: number },
  opts: { public: boolean; priced: boolean },
):
```

## File: packages/prediction-engine/src/public-baseline/metrics.ts
```typescript
/** Seven GSE metrics as pure functions over counted cells. No season-average fallback. */
⋮----
export type Cell = { n: number; epaSum: number; signStable: boolean }
⋮----
export function cellEpa(cell: Cell): number | null
⋮----
function gap(a: Cell, b: Cell): number | null
⋮----
/** ΔEPA of motion+play-action, single-high minus split-safety. */
export function computeGseSii(single: Cell, split: Cell): number | null
⋮----
/** Quick-pressure EPA minus the checkdown residual. */
export function computeGseQptsr(quickPressure: Cell, checkdown: Cell): number | null
⋮----
/** Route EPA on the called shell minus the other shell. */
export function computeGseRls(onShell: Cell, otherShell: Cell): number | null
⋮----
export function shannonBits(probs: readonly number[]): number | null
⋮----
/** Between-the-20s entropy minus red-zone entropy, in bits. */
export function computeGseSpese(betweenTwenties: readonly number[], redZone: readonly number[]): number | null
⋮----
/** Light-box EPA minus loaded-box EPA. */
export function computeGseTor(lightBox: Cell, loadedBox: Cell): number | null
⋮----
/** Leverage-weighted EPA. Negative leverage is a bad cell, not a sign flip. */
export function computeGseSva(plays: readonly
⋮----
/** Mean win-probability bleed: chosen decision minus the best available. */
export function computeGseDwp(decisions: readonly
```

## File: packages/prediction-engine/src/public-baseline/milp.ts
```typescript
/**
 * MILP solver bridge: pydfs-lineup-optimizer (MIT) via the python bridge.
 * Projections come from the GSE simulator only (publicPrior lineage).
 * The 50000 cap / 6 slots / 1.5x captain are enforced twice: by pydfs site
 * settings AND by lineup.ts on the TS side.
 */
import { spawn } from "node:child_process"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"
⋮----
export type MilpPlayer = {
  name: string
  position: string
  salary: number
  projected: number
  team?: string
  opponent?: string
  player_id?: string
}
⋮----
export type MilpRequest = {
  site: "draftkings" | "draftkings_captain" | "fanduel" | "fanduel_single_game"
  n?: number
  players: MilpPlayer[]
}
⋮----
export type MilpLineup = {
  total_points: number
  total_salary: number
  players: { name: string; positions: string[]; salary: number; projected: number; team: string }[]
}
⋮----
export type MilpOptions = { python?: string; timeoutMs?: number }
⋮----
export function pydfsAvailable(python = process.env.GSE_PYTHON ?? "python"): boolean
⋮----
function spawnSync(python: string, args: string[])
⋮----
// lazily imported to keep the module import light
⋮----
export async function solveLineupsViaPydfs(
  req: MilpRequest,
  opts: MilpOptions = {},
): Promise<MilpLineup[]>
```

## File: packages/prediction-engine/src/public-baseline/no-book-fence.ts
```typescript
/**
 * Build-time guard for the coach path. Scans import and require lines only.
 * A comment that says "odds" is not an import. assertCoachInputs still rejects
 * price keys on the value object; this rejects a book module at the source.
 */
⋮----
export function findBookImports(source: string): string[]
⋮----
export function assertNoBookInCoachSource(source: string, file: string): void
```

## File: packages/prediction-engine/src/public-baseline/rankings.ts
```typescript
/**
 * Clean-room competitor ranking kernels.
 *
 * Ported from `engine_math.py` (RATING_ATLAS 60 methods) and the equations in
 * `RATING_ATLAS.md`. Every function here is a public textbook method — the moat
 * is not the equation, it is the data latency and the covariate engine that
 * feeds these priors.
 *
 * Doctrine: none of these functions reads a book price. Market inputs are
 * passed in explicitly by the caller and are only used in the functions whose
 * name says so (`marketStrengthsLeastSquares`, `stackWithMarket`,
 * `publicHypeValuationCheck`, `shinDevigClosedForm`).
 */
⋮----
// ── Types ────────────────────────────────────────────────────────────────────
⋮----
/** One settled game, from the home team's perspective. */
export type TeamGame = {
  home: string
  away: string
  /** Home score. */
  homeScore: number
  /** Away score. */
  awayScore: number
  /** True when the game is on a neutral field. */
  neutral?: boolean
  season?: string | number
}
⋮----
/** Home score. */
⋮----
/** Away score. */
⋮----
/** True when the game is on a neutral field. */
⋮----
/** A (team, rating) pair. */
export type RatingMap = Record<string, number>
⋮----
/** A (team, rating, deviation) triple from the Kalman filter. */
export type KalmanRating = { rating: number; rd: number }
⋮----
/** Efficiency split inputs for SP+ style ratings. */
export type EpaSplit = {
  team: string
  offenseEpaPerPlay?: number
  defenseEpaPerPlay?: number
  successRate?: number
  explosiveness?: number
  fieldPosition?: number
  finishingDrives?: number
  specialTeamsEpa?: number
  plays?: number
}
⋮----
/** PFF-style unit grade inputs. */
export type PffSplits = {
  team: string
  pressureRateAllowed?: number
  passRushWinRate?: number
  coverageEpaPerTarget?: number
  cleanQbEpa?: number
  pressuredQbEpa?: number
  snapShare?: number
  timeToThrow?: number
  yacoe?: number
  cpoe?: number
  separation?: number
}
⋮----
/** A competitor's published rating and the delta it implies for a game. */
export type CompetitorRatingDelta = {
  competitor: string
  team: string
  rating: number
  /** The competitor's implied margin for this game, if published. */
  impliedMargin?: number
}
⋮----
/** The competitor's implied margin for this game, if published. */
⋮----
/** A slate row for market inversion. `home` is the home team. */
export type MarketSlateRow = {
  home: string
  away: string
  /** Closing spread from the home team's perspective (positive = home favored by that many points). */
  homeSpread: number
}
⋮----
/** Closing spread from the home team's perspective (positive = home favored by that many points). */
⋮----
// ── Small linear algebra ─────────────────────────────────────────────────────
⋮----
/**
 * Gaussian elimination with partial pivoting. Handles overdetermined (tall)
 * systems via the normal equations: solves (AᵀA)x = Aᵀb.
 *
 * Ported from `gauss_solve` in engine_math.py. Throws on a singular system
 * rather than returning a silent NaN, because a rating that cannot be solved
 * is a named gap, not a zero.
 */
export function gaussSolve(A: number[][], b: number[]): number[]
⋮----
// Normal equations for least squares.
⋮----
// Square system, augmented matrix.
⋮----
// ── 1. Bradley-Terry ─────────────────────────────────────────────────────────
⋮----
/**
 * Bradley-Terry win probability: P(i beats j) = π_i/(π_i+π_j), expressed on the
 * Elo 400-point logistic scale. Elo IS Bradley-Terry run online.
 *
 * Ported from `bt_prob` in engine_math.py.
 */
export function bradleyTerryProb(ratingA: number, ratingB: number, scale = 400): number
⋮----
/**
 * MM-algorithm MLE for a static Bradley-Terry fit from a win list.
 * Iterates π_t = W_t / Σ_o 1/(π_t+π_o), normalizing to sum 1 each pass.
 *
 * Ported from `bt_fit` in engine_math.py. Returns a rating map scaled so the
 * mean is 1.0; multiply by a base to express on an Elo-like scale.
 */
export function bradleyTerryMle(games: readonly [string, string][], iters = 150): RatingMap
⋮----
// ── 2. Colley ────────────────────────────────────────────────────────────────
⋮----
/**
 * Colley ratings. Linear system (C + I)·r = b with C_ij = −n_ij (games played)
 * and b_i = 1 + ½(w − l). Solve by matrix inversion. Fast, margin-free, and
 * transparent — but it ignores point differentials entirely.
 *
 * Equation from RATING_ATLAS.md #7; solved with gaussSolve.
 */
export function colleyRatings(games: readonly TeamGame[]): RatingMap
⋮----
// (C + I)
⋮----
// ── 3. Massey ────────────────────────────────────────────────────────────────
⋮----
/**
 * Massey ratings. Least squares on point differentials: M·r = p, with M_ij =
 * −n_ij and the diagonal equal to games played. Decomposes into offense and
 * defense automatically — the margin-aware Colley.
 *
 * Equation from RATING_ATLAS.md #8. A small ridge term is added to keep the
 * system full-rank when a team has no games.
 */
export function masseyRatings(games: readonly TeamGame[], ridge = 1e-6): RatingMap
⋮----
// Ridge for stability and to center the ratings.
⋮----
// ── 4. SRS ───────────────────────────────────────────────────────────────────
⋮----
/**
 * Simple Rating System. Team rating = own average margin + opponent-strength
 * adjustment, iterated to convergence. The "schedule strength done right"
 * baseline every football model inherits.
 *
 * Equation from RATING_ATLAS.md #9. Converges when the mean absolute change
 * falls below `tol`.
 */
export function srsRatings(games: readonly TeamGame[], iters = 100, tol = 1e-9): RatingMap
⋮----
// ── 5. SP+ efficiency ────────────────────────────────────────────────────────
⋮----
/**
 * SP+ style efficiency rating. Connelly's SP+ is proprietary, but its published
 * structure is a play-level efficiency composite. This reproduces the structure:
 * weighted z-scores across offense/defense EPA, success rate, explosiveness,
 * field position, and finishing drives. Inputs must be pre-normalized per play.
 *
 * The composite is a weighted sum; weights default to equal weight across the
 * five play-level terms. Defense terms are inverted so a positive rating always
 * means "better team".
 */
export function spPlusEfficiencyRatings(
  splits: readonly EpaSplit[],
  weights: { offense?: number; defense?: number; success?: number; explosiveness?: number; fieldPosition?: number; finishing?: number } = {},
): RatingMap
⋮----
// ── 6. Kalman ────────────────────────────────────────────────────────────────
⋮----
/**
 * State-space ratings: team strengths are a hidden state, each game is a noisy
 * observation margin = (s_home − s_away + hfa) + ε. Returns each team's rating
 * and rating deviation. "Form" is the process noise `q`.
 *
 * Ported from `kalman_ratings` in engine_math.py. The variance floor of 1.0
 * keeps a team from becoming infinitely certain.
 */
export function kalmanRatings(
  games: readonly TeamGame[],
  opts: { hfa?: number; q?: number; rSd?: number; initSd?: number } = {},
): Record<string, KalmanRating>
⋮----
const ensure = (t: string) =>
⋮----
// ── 7. FPI decomposition ─────────────────────────────────────────────────────
⋮----
/**
 * FPI decomposition. ESPN's FPI is proprietary, but its published structure is
 * offense/defense/special-teams components that combine into a single rating
 * and a projected win total. This reproduces that decomposition as a weighted
 * sum of efficiency splits.
 *
 * A positive component means "better than league average" for that unit.
 */
export function fpiDecomposition(
  splits: readonly EpaSplit[],
  weights: { offense?: number; defense?: number; special?: number } = {},
):
⋮----
// ── 8. PFF-style unit grades ─────────────────────────────────────────────────
⋮----
/**
 * PFF-style unit grades. PFF's grades are proprietary and player-level; this
 * reproduces the structure from team-level splits: pressure allowed, pass-rush
 * win rate, coverage EPA per target, clean vs pressured QB EPA, and NGS
 * receiving splits (YACOE, CPOE, separation).
 *
 * A positive grade means "better than league average" for the unit. Grades are
 * unitless composites, not 0–100 PFF scores.
 */
export function pffStyleUnitGrades(splits: readonly PffSplits[]): Record<string,
⋮----
// Pass offense: clean QB EPA, minus pressure allowed, plus CPOE and YACOE.
⋮----
// Pass rush: win rate, plus the QB's pressured EPA (lower is better for the offense).
⋮----
// Coverage: EPA per target allowed, inverted so a positive number is better.
⋮----
// ── 9. Invert competitor rating deltas ───────────────────────────────────────
⋮----
/**
 * Invert a competitor's published rating delta back onto our own rating scale.
 * Given a competitor's rating for a team and the game's margin, solve for the
 * implied team strength offset via ridge regression. This is the "don't debate
 * the market — find its inconsistency" move, applied to competitor ratings.
 *
 * Returns a per-team offset that, added to our rating, reproduces the
 * competitor's implied margins as closely as the slate allows.
 */
export function invertCompetitorRatingDeltas(
  deltas: readonly CompetitorRatingDelta[],
  games: readonly TeamGame[],
  opts: { hfa?: number; ridge?: number } = {},
): RatingMap
⋮----
// Build a tall system: each competitor delta becomes a row asserting
// rating(team) ≈ competitor rating, scaled onto the margin axis.
⋮----
// Add one row per game asserting home − away + hfa ≈ observed margin.
⋮----
// Ridge for stability.
⋮----
// ── 10. Market strengths least squares ───────────────────────────────────────
⋮----
/**
 * Invert the market: solve team strengths directly from closing spreads.
 * The sharp-syndicate move is not to debate the market with your model — it is
 * to find where the market's OWN implied strengths are internally inconsistent
 * (stale lines, news lag) and trade the inconsistency.
 *
 * Ported from `market_strengths` in engine_math.py. Returns the strength map and
 * the fitted spread for each slate row.
 */
export function marketStrengthsLeastSquares(
  slate: readonly MarketSlateRow[],
  opts: { hfa?: number; ridge?: number } = {},
):
⋮----
// Ridge rows to center and stabilize.
⋮----
// ── 11. Stack with market ────────────────────────────────────────────────────
⋮----
/**
 * Log-odds pooling with the market:
 *   p* = σ(w·logit(p_model) + (1−w)·logit(p_market))
 *
 * The market term is non-negotiable: the closing line is the most
 * cross-validated probability alive. `w` is the model's weight; estimate it by
 * max log-likelihood on a validation fold, never on the test set.
 *
 * Ported from `stack_with_market` in engine_math.py.
 */
export function stackWithMarket(pModel: number, pMarket: number, w: number): number
⋮----
const lg = (p: number)
⋮----
// ── 12. Public hype valuation check ──────────────────────────────────────────
⋮----
/**
 * Public hype valuation check. A team carrying a large share of public tickets
 * but a model probability below the market's fair probability is being priced
 * up by public money — the "hype tax". Returns the hype delta and a flag when
 * the gap is material.
 *
 * This is a valuation check, not a bet: it names where public money has moved
 * the price away from the model's read.
 */
export function publicHypeValuationCheck(
  team: string,
  publicTicketShare: number,
  modelWinProb: number,
  marketFairProb: number,
  materialGap = 0.05,
):
⋮----
// ── 13. 2-state regime HMM ───────────────────────────────────────────────────
⋮----
/**
 * 2-state regime HMM (cold/hot form) on margin residuals — full Baum-Welch EM.
 * Answers "is the team in a regime or is it noise?" with filtered probabilities.
 *
 * Ported from `hmm2_fit` in engine_math.py. Returns the two state means, the
 * shared sd, the 2×2 transition matrix, the last filtered hot probability, and
 * the last eight filtered values.
 */
export function hmm2RegimeFit(
  x: readonly number[],
  opts: { iters?: number; m0?: [number, number]; sd0?: number } = {},
):
⋮----
const dens = (t: number, s: 0 | 1)
⋮----
// ── 14. Deflated Sharpe ──────────────────────────────────────────────────────
⋮----
/**
 * Bailey & López de Prado's Deflated Sharpe Ratio. P(the backtest Sharpe is
 * real after "trials" attempts). The anti-self-deception engine: "I found an
 * edge" dies here or becomes a claim.
 *
 * Ported from `deflated_sharpe` in engine_math.py. Returns P(real) and the
 * expected-max Sharpe under pure noise.
 */
export function deflatedSharpe(sr: number, n: number, trials: number, skew = 0, kurt = 3):
⋮----
const gamma = 0.5772156649015329 // Euler–Mascheroni
⋮----
// ── 15. Shin closed-form de-vig ──────────────────────────────────────────────
⋮----
/**
 * Shin's insider-trading de-vig, closed-form inversion. π_i = (1−z)·p_i +
 * z·p_i²/S, with S = Σp². The existing `shinDevig` in devig.ts solves this by
 * root-finding; this exposes the fixed-point form directly so the two can be
 * cross-checked. Falls back to multiplicative on sub-1 books, where Shin
 * degenerates.
 */
export function shinDevigClosedForm(prices: readonly number[]):
⋮----
// ── helpers ──────────────────────────────────────────────────────────────────
⋮----
export function normCdf(z: number): number
⋮----
/** Abramowitz & Stegun 7.1.26 error function, good to ~1.5e-7. */
export function erf(x: number): number
⋮----
export function invNorm(u: number): number
⋮----
function sum(xs: readonly number[]): number
⋮----
function round(x: number, digits: number): number
```

## File: packages/prediction-engine/src/public-baseline/realized-settlement.ts
```typescript
/**
 * T+2h realized-play grader.
 *
 * Writes one trainer record per kept play under brain/feeds/<date>/.
 * A second write of the same key throws. brain/mind.jsonl is not a dest.
 * Kneels, spikes, and plays with win probability above 0.95 or below 0.05
 * are dropped. A missing EPA is dropped. Nothing here is a signed PLAY.
 */
⋮----
export type RealizedPlay = {
  gameId: string
  playId: string
  playType?: string
  desc?: string
  epa: number | null
  wp: number | null
}
⋮----
export type TrainerRecord = {
  key: string
  dest: string
  gameId: string
  playId: string
  epa: number
  validTime: string
}
⋮----
export function feedDest(date: string): string
⋮----
export function isKneelOrSpike(play: RealizedPlay): boolean
⋮----
/** Strict. A missing win probability is not treated as garbage. */
export function isGarbageWp(wp: number | null): boolean
⋮----
export function gradeRealizedPlays(plays: readonly RealizedPlay[]):
⋮----
export class FeedWriter
⋮----
write(record: TrainerRecord): TrainerRecord
⋮----
export function settleAndWrite(
  writer: FeedWriter,
  date: string,
  plays: readonly RealizedPlay[],
  validTime: string,
):
```

## File: packages/prediction-engine/src/public-baseline/research.ts
```typescript
/**
 * Kernels taken from the research triage that this engine can run exactly.
 * The sheet has 1,343 papers. These four are the ones with a formula we can test.
 * They do not read a betting line.
 */
⋮----
export function brierScore(rows: readonly
⋮----
export type ReliabilityBin = { lo: number; hi: number; n: number; meanP: number; meanY: number }
⋮----
/** Equal-width bins. Empty bins are omitted. A calibrated bin has meanP near meanY. */
export function reliabilityBins(rows: readonly
⋮----
/**
 * Page's one-sided CUSUM on a residual series.
 * This is not the functional CUSUM in arXiv:2602.13152. It is the break test the engine can run today.
 */
export function pageCusum(series: readonly number[], drift: number, threshold: number):
⋮----
function binom(n: number, k: number): number
⋮----
/** P(the favorite wins a best-of series) when each game is an independent coin with probability p. */
export function seriesWinProb(p: number, bestOf: number): number | null
⋮----
export type SeasonGame = { home: number; away: number; pHome: number }
⋮----
function mulberry32(seed: number): () => number
⋮----
/**
 * How often the named team finishes strictly first.
 * This is the question in arXiv:1701.05976, answered from our game probabilities, not from a betting line.
 */
export function bestTeamTitleRate(
  games: readonly SeasonGame[],
  teams: number,
  best: number,
  sims: number,
  seed: number,
): number | null
```

## File: packages/prediction-engine/src/public-baseline/withhold.ts
```typescript
/** Frozen-slice veto is dead once the measured shift clears this. Quiet shifts still withhold. */
⋮----
/**
 * Mean of lean × freshness × trust, plus one rest term (days × 0.025).
 * Rest is not averaged away. Seven days is +0.175 on top of the mean product.
 */
export function situationalShift(
  obs: readonly { lean: number; freshness?: number; trust?: number }[],
  restDays = 0,
): number
⋮----
export function shouldWithhold(shift: number): boolean
```

## File: packages/prediction-engine/src/reasoning/__tests__/arxiv-reasoning-bridge.test.ts
```typescript
import { describe, it } from "vitest";
⋮----
import { evaluateArxivCorpus, type ArxivContextQuery } from "../arxiv-reasoning-bridge.js";
⋮----
olContinuityScoreAway: 0.52, // 2 backups starting on Giants OL
⋮----
homeTeam: "Detroit Lions", // Dan Campbell aggressive
awayTeam: "Carolina Panthers", // Conservative punter
⋮----
turnoverDifferentialAway: 8, // Steelers +8 turnover margin from fumble recoveries
⋮----
// The fabricated fluid-dynamics framing must not survive. Air is a
// compressible gas; incompressible Navier-Stokes does not describe ball
// flight, and the paper id 2610.15000 is not a real source for this claim.
⋮----
// Honest altitude reasoning must still be present: reduced air density does
// lower drag, and the effect on long field goals is real but small.
⋮----
// arXiv:2607.24573 is real, but it is "LLM-SoccerArena: Benchmarking LLMs on
// Real-World Predictions in Sports" — an LLM Brier-scoring protocol. The
// "& Ball Aerodynamics in Turbulent Wind Regimes" title suffix and the
// "non-linear aerodynamic drag" concept are fabricated additions. A
// benchmark protocol is not a situational game condition.
⋮----
// Honest wind reasoning must still fire: sustained wind degrades deep
// passing and field goal reliability. No fabricated paper is needed.
```

## File: packages/prediction-engine/src/reasoning/__tests__/mind-reasoning-hfa.test.ts
```typescript
/**
 * TDD regression guard for the mind-reasoning situational citation fix.
 *
 * Defect: generateFantasyDfsAdvice cited "Navier-Stokes Aerodynamic Drag
 * (arXiv:2401.16392)" and "Thermal Friction Loss" for adverse weather. That
 * citation is a hallucination — arXiv:2401.16392 is a survey of home-field
 * advantage in American football, not a fluid-dynamics paper. The real
 * primitives the engine should use are:
 *   1. The modern HFA prior (~1.5–1.8 points).
 *   2. The post-2011 rest-differential decay (arXiv:2408.10867v1), whose
 *      abstract reports a +2.2 pt/game bye edge before the 2011 CBA that is
 *      mitigated afterward.
 *
 * This suite fails on the old text and passes only when the hallucinated
 * citation is gone and both real primitives are wired.
 */
import { describe, it } from "vitest";
⋮----
import { generateFantasyDfsAdvice, generateSameGameParlay } from "../mind-reasoning.js";
import type { MindPrincipleMatch } from "../mind-reasoning.js";
import type { GameContext } from "../situational-engine.js";
⋮----
// A neutral home moneyline at 0.51 with a real HFA prior must clear 0.51.
⋮----
// An away team on short rest relative to home must be penalised vs equal rest.
```

## File: packages/prediction-engine/src/reasoning/arxiv-reasoning-bridge.ts
```typescript
/**
 * @file arxiv-reasoning-bridge.ts
 * Ingests the 2,179-paper arXiv, OpenAlex, and 429 Kaggle datasets directly into the
 * Layer 2 Situational Reasoning Layer (Doctrines Garrett, 2026-10-05 / 2026-10-17).
 *
 * "The reasoning is the product... an engine that is smarter than any other model
 * because it understands context, situational awareness, between the equations
 * and the grey areas."
 */
⋮----
export interface ArxivPaperPremise {
  readonly arxivId: string;
  readonly title: string;
  readonly pillar:
    | "MARKET_GRAVITY_AND_BIAS"
    | "NETWORK_AND_STYLE_MATCHUPS"
    | "FATIGUE_INJURY_WORKLOAD"
    | "VISION_AND_FIELD_CONTROL"
    | "TACTICS_AND_GAME_THEORY"
    | "DYNAMIC_MOMENTUM_TRANSITION"
    | "ENVIRONMENT_AND_CONTEXT"
    | "ATMOSPHERE_AND_REFEREE_BIAS"
    | "CIRCADIAN_TRAVEL_DYSRHYTHMIA"
    | "ALTITUDE_AND_AIR_DENSITY"
    | "TRENCH_OL_CONTINUITY"
    | "COACHING_FOURTH_DOWN_DRAG"
    | "TURNOVER_LUCK_REGRESSION"
    | "SGP_CORRELATION_COPULA";
  readonly situationalConcept: string;
  readonly greyAreaSignal: string;
  readonly evaluateContext: (ctx: ArxivContextQuery) => ArxivSignalEvaluation;
}
⋮----
export interface ArxivContextQuery {
  readonly sport: string;
  readonly homeTeam: string;
  readonly awayTeam: string;
  readonly restDaysHome: number;
  readonly restDaysAway: number;
  readonly altitudeFt?: number;
  readonly weatherWindMph?: number;
  readonly temperatureF?: number;
  readonly crowdDecibelsExpected?: number;
  readonly isDomeOrBowl?: boolean;
  readonly timeZoneDifferenceHours?: number;
  readonly marketSpread?: number;
  readonly publicTicketPct?: number;
  /** Moneyline prices for the favorite-longshot dampening signal (positive = underdog price, negative = favorite price). */
  readonly moneylinePriceAway?: number;
  readonly moneylinePriceHome?: number;
  readonly styleMatchup?: "PRESSURE_VS_PASS_HEAVY" | "ZONE_VS_SCRAMBLE" | "GROUND_HEAVY_VS_LIGHT_BOX" | "NEUTRAL";
  readonly injuryDifferentialKeyPersonnel?: number;
  // Deep grey-area variables
  readonly olContinuityScoreHome?: number; // 0.0 - 1.0 (snaps together)
  readonly olContinuityScoreAway?: number;
  readonly coachAggressivenessDelta?: number; // positive = home coach more aggressive on 4th downs
  readonly turnoverDifferentialHome?: number; // raw turnover margin (+/-)
  readonly turnoverDifferentialAway?: number;
  readonly sgpCorrelationRequested?: boolean;
}
⋮----
/** Moneyline prices for the favorite-longshot dampening signal (positive = underdog price, negative = favorite price). */
⋮----
// Deep grey-area variables
readonly olContinuityScoreHome?: number; // 0.0 - 1.0 (snaps together)
⋮----
readonly coachAggressivenessDelta?: number; // positive = home coach more aggressive on 4th downs
readonly turnoverDifferentialHome?: number; // raw turnover margin (+/-)
⋮----
export interface ArxivSignalEvaluation {
  readonly applicable: boolean;
  readonly reason: string;
  readonly situationalBiasDirection: "HOME" | "AWAY" | "OVER" | "UNDER" | "PASS";
  readonly situationalNarrative: string;
}
⋮----
/**
 * Complete suite of situational reasoning premises extracted from 2,179 papers, 429 Kaggle datasets,
 * and peer-reviewed OpenAlex literature.
 */
⋮----
// 1. Market Gravity, Public Bias & Profit-Bias Identity
⋮----
// 2. Higher-Order Network Matching & Style Geometry
⋮----
// 3. Biomechanical Workload, Fatigue Decay & Rest Disparity
⋮----
// 4. Spatial Field Control & Altitude Hypoxia
⋮----
// 5. Environmental Wind & Passing/Kicking Efficiency
//
// arXiv:2607.24573 is real, but its actual title is "LLM-SoccerArena:
// Benchmarking LLMs on Real-World Predictions in Sports" — an LLM
// Brier-scoring protocol, not a fluid-dynamics study. The earlier title
// suffix "& Ball Aerodynamics in Turbulent Wind Regimes" and the "non-linear
// aerodynamic drag" concept were fabricated additions to a real ID. Wind
// does degrade deep passing and field goal reliability, but that is a
// measured, empirical effect — no fluid-dynamics framing and no fabricated
// paper is needed to say it.
⋮----
// 6. Altitude & Reduced Air Density (honest drag reasoning)
//
// Altitude does lower air density and therefore aerodynamic drag, but the
// measured effect on an NFL ball is small — on the order of one to two yards
// of field goal range at Mile High, not the large expansion a fluid-dynamics
// framing implied. Air is a compressible gas; incompressible Navier-Stokes
// does not describe ball flight. Model this as a modest OVER lean on long
// field goals and deep passing, and do not cite a fabricated paper for it.
⋮----
// 7. Acoustic Crowd Pressure & Dynamic Referee Bias
⋮----
// 8. Circadian Body-Clock Travel Dysrhythmia
⋮----
// 9 (DEEP ALPHA): Offensive Line Continuity & Trench Disruption
⋮----
// 10 (DEEP ALPHA): Head Coach 4th Down Aggressiveness & EPA Drag
⋮----
// 11 (DEEP ALPHA): Turnover Luck Regression & Pythagorean Variance
⋮----
// 12 (DEEP ALPHA): Same-Game Parlay Joint Copula Correlation
⋮----
/**
 * Evaluates the full suite of arXiv corpus premises against a live game context.
 * Produces structured contextual intelligence for the Layer 2 reasoning trace.
 */
export function evaluateArxivCorpus(ctx: ArxivContextQuery):
```

## File: packages/prediction-engine/src/reasoning/gse-coach-brain-llm.test.ts
```typescript
import { describe, it, expect } from "vitest";
import {
  buildCoachBrainSystemPrompt,
  verifyCoachBrainOutputAgainstPacket,
} from "./gse-coach-brain-llm.js";
import { generateTuesdayMasterLock } from "../coach-sim/weekly-cadence-orchestrator.js";
```

## File: packages/prediction-engine/src/reasoning/gse-coach-brain-llm.ts
```typescript
/**
 * GSE Coach Brain LLM Prompt Spine & Anti-Hallucination Grounding Validator
 *
 * Bounds LLM generation to the Tuesday v1.0 sealed WeeklyCadencePacket:
 *   - Injects the immutable coachMindsetHash and Merkle root into the system prompt.
 *   - Verifies all generated outputs cite only sealed gameIds and valid Tuesday coach hashes.
 */
⋮----
import type { TuesdayMasterLock } from "../coach-sim/weekly-cadence-orchestrator.js";
⋮----
export function buildCoachBrainSystemPrompt(packet: TuesdayMasterLock): string
⋮----
export function verifyCoachBrainOutputAgainstPacket(
  packet: TuesdayMasterLock,
  candidate: { referencedGameIds: readonly string[]; quotedCoachHash?: string },
):
```

## File: packages/prediction-engine/src/2309-00756-inverse-mdp-fourth-down.test.ts
```typescript
import { describe, it } from "vitest";
⋮----
import { readFileSync } from "node:fs";
⋮----
import {
  quantileValue,
  decisionResidual,
  recoverTau,
  assertTauSealed,
  makeNextScoreSamples,
  exampleRecovery,
  type FourthDownDecisionSample,
  type FourthDownState,
} from "./2309-00756-inverse-mdp-fourth-down.js";
⋮----
// 0 at 0.6, 7 at 0.4 -> cumulative 0.6 at 0, 1.0 at 7
⋮----
// At tau 0.5 the go action's quantile is 7, the kick action's is 3 -> best is 7 = observed
⋮----
// At tau 0.5: go quantile = 7, kick quantile = 3. Observed kick -> 7 - 3 = 4.
⋮----
// Perturb tau away from the optimum and confirm residual does not improve.
⋮----
// Construction: "kick" is a safe 3 points with certainty. "go" is 0 with
// probability 0.9 and 20 with probability 0.1. The quantile functions cross
// at tau = 0.9: below it the safe kick dominates, above it the explosive go
// dominates. An observed "go" is therefore optimal only for tau > 0.9, so
// the total residual is positive up to 0.9 and zero after it. The first
// zero on the 0.01 grid is 0.91, exactly one step past the true tau.
⋮----
// Sanity: the residual really is positive below the crossing point and
// exactly zero above it. Without this the assertion below could pass by
// accident on a flat objective.
⋮----
// Synthetic injury delta: execution weights change, tau must not.
⋮----
// The seal invariant from locked-projection.ts: an injury path may
// reallocate targets but may never re-estimate tau.
⋮----
// Injury overlay: a starter is scratched; the next-score distribution
// shifts but the coach's risk preference does not.
⋮----
// The module header used to claim "ENABLED = false until wired into
// locked-projection.ts and tested" while locked-projection.ts had already
// imported and called recoverTau unconditionally. A stale false flag is
// the inverse of the usual defect: it makes a LIVE sealed-tau path look
// dormant, so a reader or auditor could "safely" change it believing
// nothing production depends on it. Assert the actual wiring first, then
// assert the flag does not contradict it.
```

## File: packages/prediction-engine/src/2309-00756-inverse-mdp-fourth-down.ts
```typescript
/**
 * arXiv:2309.00756v3 — Inverse-optimization MDP for NFL 4th-down risk preference.
 * Sandholtz, Wu, Puterman, Chan (AOAS 2024).
 *
 * Recovers a coach's implicit risk-preference quantile tau in (0,1) from
 * observed go/kick decisions. The recovered tau is sealed into the Tuesday
 * 04:00 CT baseline and must remain bit-identical after any mid-week
 * injury delta.
 *
 * This is the discrete case only: one risk quantile per coach over the
 * next-score distribution. It is not full multi-feature inverse RL.
 *
 * Live in production: locked-projection.ts imports and calls recoverTau()
 * to build the pre-seal Tuesday v1.0 tau, then seals it. There is no
 * enable flag — a false one here would make a live sealed-tau path look
 * dormant (see the invariant test "does not advertise itself as disabled").
 */
⋮----
export type FourthDownState = {
  yardLine: number; // 1-99
  yardsToGo: number;
  scoreDiff: number; // own score - opp score
  timeRemainingSec: number;
  isHome: boolean;
};
⋮----
yardLine: number; // 1-99
⋮----
scoreDiff: number; // own score - opp score
⋮----
export type Action = "go" | "kick";
⋮----
export type NextScoreSample = {
  points: number; // possible next-score values (e.g. 0, 3, 6, 7, 8, -3, -6, -7, -8)
  probability: number;
};
⋮----
points: number; // possible next-score values (e.g. 0, 3, 6, 7, 8, -3, -6, -7, -8)
⋮----
export type StateActionValue = {
  state: FourthDownState;
  action: Action;
  samples: NextScoreSample[];
};
⋮----
export type FourthDownDecisionSample = {
  values: StateActionValue[];
  observedAction: Action;
};
⋮----
/**
 * Empirical quantile of a discrete distribution.
 * V_tau(F) = F^{-1}(tau)
 */
export function quantileValue(samples: NextScoreSample[], tau: number): number
⋮----
/**
 * Residual of a single decision: how much better the best action is
 * than the observed action under quantile tau.
 * residual = max_a V_tau(F(s,a)) - V_tau(F(s,a*))
 */
export function decisionResidual(
  values: StateActionValue[],
  observedAction: Action,
  tau: number,
): number
⋮----
/**
 * Recover the tau that minimizes total residual across a coach's
 * 4th-down sample. Grid search over (0,1).
 */
export function recoverTau(
  decisions: FourthDownDecisionSample[],
  gridSize = 99,
):
⋮----
/**
 * Seal check: recovered tau must be identical before and after any
 * mid-week injury delta is applied to execution weights. The quantile
 * itself must not move; only execution weights may.
 */
export function assertTauSealed(before: number, after: number, epsilon = 1e-9): boolean
⋮----
/** Build a discrete next-score distribution from [points, probability] pairs. */
export function makeNextScoreSamples(
  outcomes: ReadonlyArray<readonly [number, number]>,
): NextScoreSample[]
⋮----
/**
 * Worked example from the paper's discrete case. Go: 7 pts at 0.4, else 0.
 * Kick: 3 pts at 0.7, else 0. Observed: go. The recovered tau is the one
 * that makes going least suboptimal.
 */
export function exampleRecovery():
```

## File: packages/prediction-engine/src/coach-sim/index.ts
```typescript
/**
 * Class A Coach-First simulation modules.
 * No OddsInput. No market tokens. The fence rejects any book import.
 *
 * Entry point: lockCoachProjection. Call this first. The market is not an argument.
 */
```

## File: packages/prediction-engine/src/coach-sim/locked-projection.test.ts
```typescript
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  lockCoachProjection,
  lockTuesdayCoachBaseline,
  applyCadenceInjuryOverlay,
  applyInjuryOverlay,
  verifyCoachMindsetUnchanged,
} from "./locked-projection.js";
import { PROB_PER_POINT } from "../constants.js";
import { sealLock } from "../public-baseline/cadence.js";
import {
  assertTauSealed,
  makeNextScoreSamples,
  recoverTau,
  type FourthDownDecisionSample,
} from "../2309-00756-inverse-mdp-fourth-down.js";
⋮----
// Wall-clock must not leak into the lock when the caller pins a time.
⋮----
// Identical inputs must reproduce the identical identity hash.
⋮----
// Injury state is an execution weight, not coach identity. A different
// injuryDropOff must not change the inputHash — otherwise the "sealed"
// projection is not reproducible across injury revisions.
⋮----
// The sealed projection is the coach's identity and must be reproducible
// across injury revisions. Injury is applied as an execution weight on top
// of the lock (see applyCadenceInjuryOverlay), never baked into the lock.
// If these diverge while inputHash stays equal, the hash stops identifying
// the projection and a receipt keyed on inputHash cannot detect the change.
⋮----
// Pin a known baseline so the assertion isolates the slope itself. The pin
// must be applied through the seal: mutating winProbHome on a sealed lock is
// the exact crafted-lock case applyInjuryOverlay now rejects.
⋮----
// 0.5 + 1 pt * 0.033 = 0.533. The overlay must use the same
// points-to-win-probability slope as mind-reasoning's PROB_PER_POINT.
⋮----
// Crafted lock: tau moved without resealing. The internal hash<->tau check
// would recompute the hash from the same crafted tau and pass, so the seal
// check at the top of the overlay is the only thing that catches this.
⋮----
// Two paths convert margin points into win probability: the situational HFA
// prior in mind-reasoning.ts and this injury overlay. They must speak the
// same units. Before this invariant the agreement was enforced only by a
// comment ("Must match mind-reasoning's PROB_PER_POINT"): the literal 0.033
// sat in locked-projection.ts and a separate local const sat in
// mind-reasoning.ts. Tuning one silently left the other on the old slope,
// so the two surfaces disagreed about what a point is worth. Assert a single
// exported binding is consumed by both, and that neither re-declares it.
⋮----
// Both consume the shared constant.
⋮----
// Neither carries a second definition of the slope.
⋮----
// The overlay arithmetic must multiply by the constant, not a bare literal.
```

## File: packages/prediction-engine/src/coach-sim/locked-projection.ts
```typescript
/**
 * Locked Coach Projection — the play is produced before any book is read.
 *
 * Doctrine: we are the bookmakers. We review the game, the coaches, the
 * players, the schemes, the usage, the injuries, the matchups. We form a
 * projection. Only after that projection is locked do we look at the lines.
 * If our total is 43 and the market is 50, we bet. We do not chase.
 *
 * This function takes only coach inputs. It does not accept OddsInput.
 * The fence rejects any market token inside this directory.
 */
import { createHash } from "node:crypto";
import { simulateCoachGame, type CoachSimInput, type CoachProjection } from "./markov-simulator.js";
import {
  allocateTargets,
  sinkhornTargetAllocation,
  applyShadowHaircut,
  type EligibleTarget,
  type TargetAllocation,
} from "./sinkhorn-targets.js";
import { sealLock, type CadenceVersion, type SnapshotLock } from "../public-baseline/cadence.js";
import { PROB_PER_POINT } from "../constants.js";
import {
  assertTauSealed,
  recoverTau,
  type FourthDownDecisionSample,
} from "../2309-00756-inverse-mdp-fourth-down.js";
⋮----
export interface LockedCoachProjection extends CoachProjection {
  lockedAt: string;
  inputHash: string;
  // No market fields. Comparison happens later, in Class B, at Step N.
}
⋮----
// No market fields. Comparison happens later, in Class B, at Step N.
⋮----
export type PureCoachInput = Omit<CoachSimInput, "injuryDropOff">;
⋮----
export type TuesdayCoachInput = PureCoachInput & {
  /**
   * Observed 4th-down go/kick decisions for this coach. When absent, tau
   * falls back to the documented 0.5 prior and the lock records
   * coachTauSource = "prior" so no caller mistakes it for a recovery.
   */
  readonly fourthDownDecisions?: readonly FourthDownDecisionSample[];
};
⋮----
/**
   * Observed 4th-down go/kick decisions for this coach. When absent, tau
   * falls back to the documented 0.5 prior and the lock records
   * coachTauSource = "prior" so no caller mistakes it for a recovery.
   */
⋮----
export interface TuesdayTargetRooms {
  readonly homeTargets: readonly EligibleTarget[];
  readonly awayTargets: readonly EligibleTarget[];
}
⋮----
export interface TuesdayCoachBaselineLock extends LockedCoachProjection {
  readonly coachMindsetHash: string;
  readonly cadenceLock: SnapshotLock;
  readonly frozenCoachInput: Readonly<PureCoachInput>;
  readonly baseRooms: TuesdayTargetRooms;
  readonly homeTargetAllocations: readonly TargetAllocation[];
  readonly awayTargetAllocations: readonly TargetAllocation[];
  /** Recovered risk-preference quantile, sealed at v1.0 and immutable. */
  readonly coachTau: number;
  /** Total inverse-MDP residual at the recovered tau. */
  readonly coachTauResidual: number;
  readonly coachTauSource: "recovered" | "prior";
}
⋮----
/** Recovered risk-preference quantile, sealed at v1.0 and immutable. */
⋮----
/** Total inverse-MDP residual at the recovered tau. */
⋮----
export interface CadenceInjuryOverlayInput {
  readonly version: Exclude<CadenceVersion, "v1.0">;
  readonly recordedAtIso: string;
  readonly inactivePlayerIds: readonly string[];
  /** Points-equivalent EPA dropoff credited to the home side. */
  readonly homeInjuryPointsDelta?: number;
  /** Points-equivalent EPA dropoff credited to the away side. */
  readonly awayInjuryPointsDelta?: number;
}
⋮----
/** Points-equivalent EPA dropoff credited to the home side. */
⋮----
/** Points-equivalent EPA dropoff credited to the away side. */
⋮----
/**
 * Canonical SHA-256 of the immutable coach mindset. injuryDropOff and any
 * wall-clock value are excluded by construction. tau is included because it
 * is a stable coach trait, not a weekly input.
 */
export function computeCoachMindsetSha256(
  input: PureCoachInput,
  coachTau = 0.5,
): string
⋮----
export function lockTuesdayCoachBaseline(
  input: TuesdayCoachInput,
  rooms: TuesdayTargetRooms = { homeTargets: [], awayTargets: [] },
  lockedAtIso: string = new Date().toISOString(),
): TuesdayCoachBaselineLock
⋮----
// TuesdayCoachInput already omits injuryDropOff by construction, so there is
// nothing to strip here; the simulateCoachGame call below pins it to 0 so a
// caller that widens the type at runtime still cannot seed the hash with an
// injury term. Only the 4th-down decision sample set is separated out.
⋮----
/**
 * Apply a mid-week injury overlay. Sinkhorn target reallocation plus a
 * bounded points-equivalent EPA dropoff. The sealed mindset, its hash, and
 * tau are carried over byte-for-byte. Throws if tau moved.
 *
 * The reallocation now runs through `sinkhornTargetAllocation`, so the active
 * set's shares are the column marginal of an entropy-regularized transport plan
 * rather than a bare softmax normalization. Both the source marginal (survivors'
 * raw base shares) and the demand marginal (the coach cost model over survivors)
 * are explicit, and the plan's marginals are enforced by the solver. The seal is
 * unaffected either way: target allocations are not part of the cadence-lock
 * payload, so no seal check reads them.
 */
export function applyInjuryOverlay(
  baselineLock: TuesdayCoachBaselineLock,
  overlay: CadenceInjuryOverlayInput,
): TuesdayCoachBaselineLock
⋮----
// SEAL CHECK 0: verify the incoming lock's cadence seal before trusting
// coachTau. The internal checks below recompute the mindset hash from the
// lock's own fields, so a crafted lock carrying a recomputed hash would pass
// them. Recomputing the cadence seal over the payload catches a mutated
// tau/hash/projection triple; a v2.0+ input is refused so an overlay cannot
// be stacked on another overlay.
⋮----
// Points-to-win-probability slope. PROB_PER_POINT is the one shared binding
// (constants.ts) that mind-reasoning's situational HFA prior also consumes, so
// the injury overlay and the HFA prior speak the same units — one margin point
// is worth the same win probability in both. It used to be a bare literal here
// with only a "Must match" comment holding the two surfaces together.
⋮----
// SEAL CHECK 1: tau must not move on an injury path.
⋮----
// SEAL CHECK 2: the sealed mindset hash must recompute to the same value.
⋮----
/** Alias kept for the plan's cadence naming. */
⋮----
export function verifyCoachMindsetUnchanged(
  a: TuesdayCoachBaselineLock,
  b: TuesdayCoachBaselineLock,
): boolean
⋮----
export function lockCoachProjection(
  input: CoachSimInput,
  lockedAtIso?: string,
): LockedCoachProjection
⋮----
// Pin injuryDropOff to 0 for the sealed projection. Injury is an execution
// weight applied on top of the lock (applyCadenceInjuryOverlay), not part of
// the coach's identity — matching lockTuesdayCoachBaseline and the contract
// documented on hashInput. Feeding the injury term into the simulator here
// made marginMean/scoreMean depend on injury while inputHash did not, so the
// hash stopped identifying the projection and a receipt keyed on it could
// not detect an injury revision. See locked-projection.test.ts.
⋮----
// Pinned when the caller supplies a time so a re-run reproduces the lock.
// Falls back to wall-clock only for backward compatibility with callers
// that have not adopted the pinned path yet.
⋮----
function hashInput(input: CoachSimInput): string
⋮----
// Deterministic hash of the coach inputs only. No market numbers.
//
// injuryDropOff is deliberately excluded. Injury state is an execution
// weight applied on top of the sealed projection, not part of the coach's
// identity. Including it made the "sealed" projection non-reproducible
// across injury revisions — the same game with the same coach inputs would
// hash differently when only the injury estimate changed.
```

## File: packages/prediction-engine/src/coach-sim/weekly-cadence-orchestrator.ts
```typescript
/**
 * Weekly Cadence Orchestrator — the production consumer that closes the
 * "ticket = null" wiring gap.
 *
 * Background. `call-sheet.ts` deliberately emits Call rows with `ticket: null`
 * because it has no market view; pricing belongs to the Class B comparison step.
 * `calibration-map.ts` ships `signCallSheetTickets()` to do that pricing, but
 * until this module existed nothing in production called it, so tickets stayed
 * null forever. This module is that caller.
 *
 * Pipeline
 * --------
 *   Tuesday 04:00 CT  generateTuesdayMasterLock()  -> v1.0 seal
 *   Wed/Thu/Fri       advanceWeeklyLockWithInjuries() -> v2.0/v3.0/v4.0 seals
 *
 * Invariants
 * ----------
 * 1. The coach mindset hash and the recovered tau are sealed at v1.0. An injury
 *    overlay may move execution weights (target shares, margin, total, win
 *    probability) but must leave both bit-identical. This module never
 *    re-estimates tau.
 * 2. A lock whose tau or frozen input no longer hashes to its sealed
 *    `coachMindsetHash` is refused before any overlay is applied. That is the
 *    guard the "refuses to advance a lock whose tau was mutated" test exercises.
 * 3. Call-sheet tickets are priced only when a market quote is supplied for the
 *    call's id. No quote means no ticket; the row is never given a placeholder
 *    price. See `signCallSheetTickets` for the edge gate (default 2.0%).
 *
 * What this module deliberately does not do
 * -----------------------------------------
 * It does not read the market. Market quotes are passed in by the caller so the
 * projection stays fenced from odds data at lock time. It does not invent target
 * distributions — rooms come from the caller's board. It does not mutate a
 * sealed tau under any circumstance.
 */
import {
  applyInjuryOverlay,
  computeCoachMindsetSha256,
  lockTuesdayCoachBaseline,
  type CadenceInjuryOverlayInput,
  type FourthDownDecisionSample,
  type TuesdayCoachBaselineLock,
  type TuesdayTargetRooms,
} from "./locked-projection.js";
import {
  signCallSheetTickets,
  type MarketQuoteForCall,
  type SignedCall,
} from "../public-baseline/calibration-map.js";
import type { Call } from "../public-baseline/call-sheet.js";
import type { CadenceVersion } from "../public-baseline/cadence.js";
⋮----
// --------------------------------------------------------------------------- //
// Inputs
// --------------------------------------------------------------------------- //
⋮----
/**
 * One game on the weekly card. Everything the orchestrator needs to seal a
 * coach baseline and build a personnel call row.
 *
 * `marketSpreadHome` / `marketTotal` are carried for the Class B comparison
 * step and are *not* passed into `lockTuesdayCoachBaseline`, which is fenced
 * from market data by design.
 */
export interface WeeklyGameInput {
  readonly gameId: string;
  readonly homeTeam: string;
  readonly awayTeam: string;
  readonly week: number;
  readonly coachSupport: number;
  readonly neutralPassRate?: number;
  readonly staffAggression?: number;
  readonly staffAggressionAway?: number;
  /** Closing/opening spread, home perspective. Class B only. */
  readonly marketSpreadHome?: number;
  /** Closing/opening total. Class B only. */
  readonly marketTotal?: number;
  /** Sealed target rooms for both sides. */
  readonly rooms: TuesdayTargetRooms;
  /** Observed 4th-down go/kick decisions for the coach risk-preference fit. */
  readonly fourthDownDecisions?: readonly FourthDownDecisionSample[];
}
⋮----
/** Closing/opening spread, home perspective. Class B only. */
⋮----
/** Closing/opening total. Class B only. */
⋮----
/** Sealed target rooms for both sides. */
⋮----
/** Observed 4th-down go/kick decisions for the coach risk-preference fit. */
⋮----
/** Market quotes keyed by the Call row id the quote applies to. */
export type MarketQuotesByCallId = Readonly<Record<string, MarketQuoteForCall>>;
⋮----
export interface GenerateTuesdayMasterLockInput {
  readonly season: number;
  readonly week: number;
  /** ISO timestamp of the seal. Passed explicitly so tests are deterministic. */
  readonly lockedAtIso: string;
  readonly games: readonly WeeklyGameInput[];
  /**
   * Optional market quotes. When supplied, call-sheet tickets are priced and
   * the lock carries `signedCalls`. When omitted, no call rows are emitted and
   * the lock carries only the sealed coach baselines.
   */
  readonly marketQuotes?: MarketQuotesByCallId;
  /** Minimum edge in percentage points required to sign a ticket. */
  readonly minEdgePct?: number;
}
⋮----
/** ISO timestamp of the seal. Passed explicitly so tests are deterministic. */
⋮----
/**
   * Optional market quotes. When supplied, call-sheet tickets are priced and
   * the lock carries `signedCalls`. When omitted, no call rows are emitted and
   * the lock carries only the sealed coach baselines.
   */
⋮----
/** Minimum edge in percentage points required to sign a ticket. */
⋮----
export interface AdvanceInjuryInput {
  readonly version: Exclude<CadenceVersion, "v1.0">;
  readonly recordedAtIso: string;
  readonly byGameId: Readonly<
    Record<
      string,
      {
        readonly inactivePlayerIds: readonly string[];
        readonly homeInjuryPointsDelta?: number;
        readonly awayInjuryPointsDelta?: number;
      }
    >
  >;
}
⋮----
// --------------------------------------------------------------------------- //
// Outputs
// --------------------------------------------------------------------------- //
⋮----
export interface WeeklyGameLock {
  readonly gameId: string;
  readonly coachLock: TuesdayCoachBaselineLock;
}
⋮----
export interface TuesdayMasterLock {
  readonly version: CadenceVersion;
  readonly season: number;
  readonly week: number;
  readonly lockedAtIso: string;
  readonly games: readonly WeeklyGameLock[];
  /**
   * Priced call-sheet rows. Present only when `marketQuotes` was supplied to
   * `generateTuesdayMasterLock`. Rows whose quote is absent or whose edge is
   * below the gate carry `ticket: null` and `signedTicket: null`.
   */
  readonly signedCalls?: readonly SignedCall[];
}
⋮----
/**
   * Priced call-sheet rows. Present only when `marketQuotes` was supplied to
   * `generateTuesdayMasterLock`. Rows whose quote is absent or whose edge is
   * below the gate carry `ticket: null` and `signedTicket: null`.
   */
⋮----
// --------------------------------------------------------------------------- //
// Call-row construction
// --------------------------------------------------------------------------- //
⋮----
/**
 * Canonical id for a team's personnel-group call row. Single source of truth
 * for the `${team}-personnel` format: buildPersonnelCalls mints ids here and
 * the injury-advance invalidator resolves them here. Nothing parses the id
 * back into a team name, so a team whose name contains "-personnel" or a regex
 * metacharacter cannot be mis-read.
 */
export function personnelCallId(team: string): string
⋮----
/**
 * Build one personnel-group call row per team from its sealed target rooms.
 *
 * The id is `personnelCallId(team)`, which is the key a caller uses to supply a
 * market quote for that team's personnel grouping. Per-player prop rows are a
 * downstream concern (they need prop markets and player-level projections this
 * module does not hold), so they are not fabricated here.
 */
export function buildPersonnelCalls(games: readonly WeeklyGameInput[]): Call[]
⋮----
// --------------------------------------------------------------------------- //
// Tuesday seal
// --------------------------------------------------------------------------- //
⋮----
/**
 * Seal the Tuesday 04:00 CT baseline for every game on the card, then price
 * call-sheet tickets when market quotes are supplied.
 *
 * The coach projection is produced before any market number is read. When
 * `marketQuotes` is present, the returned lock also carries priced call rows;
 * when absent, no call rows are fabricated.
 */
export function generateTuesdayMasterLock(
  input: GenerateTuesdayMasterLockInput,
): TuesdayMasterLock
⋮----
// --------------------------------------------------------------------------- //
// Mid-week injury advance
// --------------------------------------------------------------------------- //
⋮----
/**
 * Advance a sealed lock through an injury update.
 *
 * Order of operations matters:
 *   1. Re-verify each game's seal *before* touching it. If tau or the frozen
 *      coach input no longer hashes to the sealed `coachMindsetHash`, refuse.
 *   2. Apply the overlay through `applyInjuryOverlay`, which runs its own tau
 *      seal assertion and hash recomputation and throws on any movement.
 *
 * Games with no injury entry are carried through unchanged. The returned lock
 * keeps the original `coachMindsetHash` and `coachTau` for every game.
 *
 * Ticket invalidation. A signed ticket is a priced claim computed from the
 * projection as it stood when the quote was read. An injury overlay moves the
 * projection (margin, total, win probability), so any ticket minted for an
 * affected game is stale and must not survive the advance — carrying it
 * forward would advertise an edge computed from superseded availability. This
 * function drops `signedCalls` whose team belongs to an advanced game and
 * leaves unaffected games' tickets intact. Re-price via `priceSealedLock`
 * against fresh quotes. tau and the mindset hash are never touched here.
 */
export function advanceWeeklyLockWithInjuries(
  lock: TuesdayMasterLock,
  advance: AdvanceInjuryInput,
): TuesdayMasterLock
⋮----
// SEAL GUARD: the frozen coach input plus the carried tau must reproduce
// the sealed mindset hash. A mismatch means the tau or the input was
// mutated after the v1.0 seal; refuse before applying anything.
⋮----
// Invalidate tickets for advanced games. A ticket is a priced claim against
// the projection at quote time; the overlay just moved that projection. Only
// drop rows whose team belongs to an advanced game — unaffected games keep
// their tickets. Ids are minted by personnelCallId(), so the comparison is an
// exact string match against the canonical id rather than a regex parse of
// the row's id back into a team name.
⋮----
// --------------------------------------------------------------------------- //
// Convenience: seal-and-price in one call
// --------------------------------------------------------------------------- //
⋮----
/**
 * Price an already-sealed master lock's call rows against fresh market quotes
 * without re-sealing the coach baseline. Useful when the Tuesday lock was
 * produced without a market view and quotes arrive later in the day.
 */
export function priceSealedLock(
  lock: TuesdayMasterLock,
  games: readonly WeeklyGameInput[],
  marketQuotes: MarketQuotesByCallId,
  minEdgePct = 2.0,
): TuesdayMasterLock
```

## File: packages/prediction-engine/src/public-baseline/calibration-map.test.ts
```typescript
import { describe, it, expect } from "vitest"
import { existsSync } from "node:fs"
import {
  calibrateGseProbability,
  signCallSheetTickets,
  assertNoContradictoryTickets,
} from "./calibration-map.js"
import { loadCoachCorpus } from "./x-corpus.js"
import { CORPUS_PATH } from "./corpus-path.js"
⋮----
function corpusPath(): string
⋮----
// The old clamp collapsed every raw probability >= 0.95 onto the single
// 0.95 knot, so an overconfident 0.99 and a 0.95 were indistinguishable and
// the tail escaped the map. Above 0.95 the curve continues the final
// observed segment's slope as documented extrapolation.
⋮----
// Strict separation: the tail is not a single flat point.
⋮----
expect(calibrateGseProbability(1.5)).toBeCloseTo(0.9655, 4); // clamps at 1.0, not silently below it
expect(calibrateGseProbability(0.02)).toBeCloseTo(0.05, 4); // lower bound still clamps
⋮----
// The widened Call.ticket is filled with the same frozen ticket.
```

## File: packages/prediction-engine/src/public-baseline/calibration-map.ts
```typescript
/**
 * Isotonic calibration map for GSE model probabilities, plus signed call-sheet
 * ticket pricing.
 *
 * The verified GSE curve removes ~5.2 points of overconfidence: a raw 0.53 is
 * really 0.455-0.48, and a raw 0.67 is 0.618. The knots below are the measured
 * calibration, not a guess. Interpolation is piecewise linear and monotone.
 *
 * Pricing is deterministic. A ticket is minted only when the calibrated edge
 * over the Shin no-vig price clears minEdgePct AND the contradiction gate
 * allows the direction. The gate blocks:
 *   - a market label with no OVER/UNDER direction,
 *   - the same player+stat priced OVER and UNDER in the same signed set.
 * That is how the Brandin Cooks OVER/UNDER split is stopped at the source.
 */
import { shinDevig } from "./devig.js"
import type { Call, SignedTicket } from "./call-sheet.js"
⋮----
export interface MarketQuoteForCall {
  readonly marketLabel: string
  readonly rawModelProb: number
  readonly americanOdds: number
  readonly opposingAmericanOdds?: number
}
⋮----
export interface SignedCall extends Call {
  readonly signedTicket: SignedTicket | null
}
⋮----
export interface ContradictionGateResult {
  readonly allowed: boolean
  readonly reason: string | null
}
⋮----
export type TicketDirection = "OVER" | "UNDER"
⋮----
export interface TicketLeg {
  readonly playerKey: string
  readonly statKey: string
  readonly direction: TicketDirection
  readonly line: number
  readonly raw: string
}
⋮----
/**
 * Measured GSE isotonic knots. Strictly increasing in both coordinates, so the
 * piecewise-linear interpolation is monotone and cannot cross itself.
 */
⋮----
// Upper tail. 0.95 is the last measured knot; above it we continue the final
// segment's slope (0.214 per 0.20) to 1.0 so an overconfident 0.97-0.99 is
// separated instead of collapsing onto the single 0.95 point. Linear
// extrapolation past observed support, not a measured knot -- revisit once
// raw probabilities above 0.95 appear in the graded sample.
⋮----
export function calibrateGseProbability(rawProb: number): number
⋮----
function normalizeKey(value: string): string
⋮----
/**
 * Split a market label into priced legs. A compound label uses "&" between
 * legs, e.g. "Brandin Cooks OVER 24.5 Receiving Yards & George Kittle OVER
 * 71.5 Receiving Yards".
 */
export function parseTicketLegs(marketLabel: string): TicketLeg[]
⋮----
export function detectTicketDirection(marketLabel: string): TicketDirection | null
⋮----
/**
 * Contradiction gate. Returns a refusal reason when the ticket's label has no
 * direction, contradicts itself, or prices the same player+stat opposite to an
 * already-signed ticket.
 */
export function contradictionGate(
  ticket: SignedTicket,
  existing: readonly SignedTicket[] = [],
): ContradictionGateResult
⋮----
/** Throw when a signed set prices the same player+stat in both directions. */
export function assertNoContradictoryTickets(tickets: readonly SignedTicket[]): void
⋮----
/**
 * Price the call sheet. The historical Call rows keep ticket = null; this
 * function returns SignedCall rows whose `ticket` and `signedTicket` are the
 * same frozen ticket when the gate passes. No quote means no ticket.
 */
export function signCallSheetTickets(
  calls: readonly Call[],
  marketQuotes: Readonly<Record<string, MarketQuoteForCall>>,
  minEdgePct = 2.0,
): SignedCall[]
```

## File: packages/prediction-engine/src/public-baseline/call-sheet.test.ts
```typescript
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { describe, it } from "vitest"
import { loadCoachCorpus } from "./x-corpus.js"
import { CORPUS_PATH } from "./corpus-path.js"
⋮----
function call(id: string)
```

## File: packages/prediction-engine/src/public-baseline/call-sheet.ts
```typescript
/**
 * The call sheet. The ledger kept the film. This decides.
 *
 * A later designation beats an earlier status graphic.
 * A deleted video does not beat a designation.
 * You install the modal tendency. The weighted number is the expectation, not a hiding place.
 * You do not fade a team for a body count. You sit the man who is out.
 * If your tendency is what they are built to punish, you change it.
 * None of this mints a ticket. Pricing happens later, in calibration-map.ts,
 * and only when the isotonic calibration and contradiction gate both pass.
 */
import type { CoachPost } from "./x-corpus.js"
import { publishFromCorpus, type CoachPublished } from "./corpus-ledger.js"
⋮----
/**
 * A priced ticket. The call sheet itself never fills this in; it is minted by
 * signCallSheetTickets() in calibration-map.ts after the calibrated edge clears
 * the threshold and the contradiction gate allows the direction.
 */
export type SignedTicket = {
  readonly callId: string
  readonly marketLabel: string
  readonly americanOdds: number
  readonly noVigImpliedProb: number
  readonly rawModelProb: number
  readonly calibratedProb: number
  readonly edgePct: number
  readonly kellyQuarterUnits: number
}
⋮----
export type Call = {
  id: string
  install: string
  expectation: string | null
  alert: string
  willNot: string
  /** Null until a signed ticket clears the gate. Never a placeholder price. */
  ticket: SignedTicket | null
}
⋮----
/** Null until a signed ticket clears the gate. Never a placeholder price. */
⋮----
function text(posts: readonly CoachPost[], id: string): string
⋮----
function has(posts: readonly CoachPost[], id: string, needle: string): boolean
⋮----
export function callSheet(posts: readonly CoachPost[], published: CoachPublished): Call[]
```

## File: packages/prediction-engine/src/public-baseline/devig.ts
```typescript
/**
 * Four ways to take the book's cut out of a posted price.
 * Every fair price must sit at or below the raw implied price and the vector must sum to 1.
 * 0.584 and 0.4202 are from different methods. They sum to 1.0042 and are not a price.
 */
⋮----
export function americanImplied(odds: number): number
⋮----
function fair(raw: readonly number[], fairPrices: readonly number[]): number[]
⋮----
function solveRoot(low: number, high: number, sumAt: (value: number) => number): number
⋮----
function rawOf(odds: readonly number[]): number[]
⋮----
/** Divide each implied price by the overround. Same fraction off every side. */
export function multiplicativeDevig(odds: readonly number[]): number[]
⋮----
/** Take the same number of probability points off every side. Two-way Shin is this method. */
export function additiveDevig(odds: readonly number[]): number[]
⋮----
function shinPrices(raw: readonly number[], overround: number, z: number): number[]
⋮----
/** Shin's insider share. Solved so the fair prices sum to 1. */
export function shinInsiderShare(odds: readonly number[]): number
⋮----
/** Shin (1993). Matches additive on two outcomes. Diverges once a third outcome exists. */
export function shinDevig(odds: readonly number[]): number[]
⋮----
/** The exponent the power method had to solve. It is not assumed to be 2. */
export function powerExponent(odds: readonly number[]): number
⋮----
/** Solve k so the powered implied prices sum to 1. */
export function powerDevig(odds: readonly number[]): number[]
⋮----
export type DevigBook = {
  raw: number[]
  overround: number
  multiplicative: number[]
  additive: number[]
  power: number[]
  powerK: number
  shin: number[]
  shinZ: number
}
⋮----
/** All four fair books for one posted market. None of them is a pick. */
export function compareDevig(odds: readonly number[]): DevigBook
```

## File: packages/prediction-engine/src/public-baseline/milp.test.ts
```typescript
/**
 * MILP bridge tests. The live pydfs test runs only when
 * pydfs-lineup-optimizer is importable by the bridge python; otherwise the
 * contract is exercised through a stub interpreter so CI stays green.
 */
⋮----
import { describe, it, expect } from "vitest"
import { solveLineupsViaPydfs, pydfsAvailable, type MilpRequest } from "./milp.js"
⋮----
// A real MILP solve via the Python bridge. node:test had no default timeout, so
// this never tripped; Vitest's 5s default does. The budget is for the solver
// subprocess, not for weakening the assertion set below.
⋮----
// captain salary is exactly 1.5x base
⋮----
// structural: the request payload is built from the callers' projections
```

## File: packages/prediction-engine/src/public-baseline/narrative-rejections.ts
```typescript
/**
 * NE @ CHI narrative rejections. Game 401873010 is final, CHI 30 NE 24.
 * A missing fact is a named gap. A contradicting fact is a rejection.
 * Neither path signs a PLAY. Class A does not import a spread.
 */
⋮----
export type PublicFacts = {
  olCounts?: { CHI?: number; NE?: number } | null
  windMph?: number | null
  gonzalezStatus?: string | null
}
⋮----
export type NarrativeClaim =
  | { id: "ol-4-vs-2"; chi: 4; ne: 2 }
  | { id: "wind-15"; claimedMph: 15 }
  | { id: "bears-spread"; line: -1.5 | -3 }
  | { id: "gonzalez-hip" }
⋮----
export type NarrativeRejection = {
  gameId: typeof NE_CHI_GAME_ID
  claim: NarrativeClaim["id"]
  accepted: false
  playSigned: false
  reason: string
}
⋮----
export function rejectNarrative(claim: NarrativeClaim, facts: PublicFacts): NarrativeRejection
⋮----
// Annotated rather than inferred: an inferred object literal widens gameId to
// `string`, which fails NarrativeRejection's literal type `typeof NE_CHI_GAME_ID`.
```

## File: packages/prediction-engine/src/public-baseline/public-path.test.ts
```typescript
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, it, expect } from "vitest"
import { chicagoParts, dueVersion, emptyMask, sealLock, setBit, slotIndex, tMinus90, xorMasks } from "./cadence.js"
import { flagOutsideBulk, marchenkoPasturEdges } from "./marchenko.js"
import { NE_CHI_FINAL, rejectNarrative } from "./narrative-rejections.js"
import { assertNoBookInCoachSource, findBookImports } from "./no-book-fence.js"
import { FeedWriter, feedDest, settleAndWrite, type RealizedPlay } from "./realized-settlement.js"
⋮----
// Resolve from THIS file, not process.cwd(): vitest runs with cwd at the
// package dir, so the repo-relative literal doubled the package segment.
```

## File: packages/prediction-engine/src/reasoning/mind-reasoning.ts
```typescript
/**
 * @file mind-reasoning.ts
 * Mind-Driven Situational Reasoning & Autonomous Product Generation Engine.
 *
 * Consumes the 5,148-item grounded literature mind artifact (MIND_CORPUS_3000.jsonl)
 * to generate situational reasoning, picks/leans, same-game parlays, and fantasy/DFS advice
 * directly from absorbed literature principles, citing specific item_ids and evidence quotes.
 *
 * All numeric deltas, SGP odds, correlation edges, and fantasy thresholds are calculated
 * dynamically from extracted literature parameters and Archimedean Clayton copula mathematics,
 * NEVER from static hardcoded strings or magic constants.
 */
⋮----
import type { GameContext } from "./situational-engine.js";
import { PROB_PER_POINT } from "../constants.js";
⋮----
export interface MindRecord {
  readonly item_id: string;
  readonly source: string;
  readonly title: string;
  readonly principle_or_feature: string;
  /** Corpus schema (MIND_CORPUS_3000.jsonl): canonical principle name. Legacy rows omit it. */
  readonly principle_name?: string;
  readonly domain?: string;
  /** Corpus schema: truncated sha256 of the source document. Legacy rows omit it. */
  readonly source_doc_hash?: string;
  readonly claim_type?: ClaimType;
  /** Corpus rows carry the object form; some producers (scripts, battery scenarios) pass a serialized string. */
  readonly numeric_claim?: string | {
    readonly value: number;
    readonly unit: string;
    readonly metric: string;
  } | null;
  readonly numeric_content_if_any?: {
    readonly sample_size?: number;
    readonly percentage?: number;
    readonly year?: number;
    readonly market_line?: number;
    readonly beta?: number;
    readonly [key: string]: unknown;
  } | null;
  /** Corpus schema: absolute parsed magnitude of the numeric claim (already unit-scaled by the producer). */
  readonly parsed_float_magnitude?: number;
  /** Corpus schema: denominator used to scale parsed_float_magnitude into probability space. */
  readonly unit_scale_denominator?: number;
  readonly evidence_quote: string;
  readonly applicable_contexts: readonly string[];
  /** Corpus schema: 16-primitive context fields. Legacy rows carry only applicable_contexts. */
  readonly applicable_context_fields?: readonly ContextFieldEnum[];
  readonly influence_direction?: InfluenceDirection;
  readonly conditional_threshold?: string | null;
  readonly parsed_threshold_value?: number | null;
  readonly parsed_threshold_operator?: ">" | ">=" | "<" | "<=" | null;
  /** Corpus schema: prose description of the influence; legacy rows carry only how_it_influences_reasoning. */
  readonly influence_description?: string;
  readonly how_it_influences_reasoning: string;
  readonly source_file?: string;
  /**
   * The repo-relative path of the document the offsets are relative to.
   * `source_file` is only a basename, and 29 of the 69 basenames cited by
   * the MIND corpus exist in more than one place in the repo.
   */
  readonly source_path?: string | null;
  readonly mechanism_quote?: string | null;
  readonly evidence_span?: CharacterSpan | null;
  readonly mechanism_span?: CharacterSpan | null;
  /**
   * The epistemic class, assigned by the builder against the document on
   * disk:
   *   CITABLE_VERIFIED         the quote IS verbatim in the named document
   *   HONESTLY_UNCITED_PRIOR    no source document exists
   *   DERIVED_MARKET_SYNTHESIS  synthesised from a market/table row
   *
   * A record that predates the class system has none. It is treated as
   * UNVERIFIED, because the honest default for an unknown provenance is
   * "unknown", not "fine".
   */
  readonly record_class?: string | null;
  readonly citable?: boolean;
  readonly verification_tier?: string;
  readonly status?: string;
}
⋮----
/** Corpus schema (MIND_CORPUS_3000.jsonl): canonical principle name. Legacy rows omit it. */
⋮----
/** Corpus schema: truncated sha256 of the source document. Legacy rows omit it. */
⋮----
/** Corpus rows carry the object form; some producers (scripts, battery scenarios) pass a serialized string. */
⋮----
/** Corpus schema: absolute parsed magnitude of the numeric claim (already unit-scaled by the producer). */
⋮----
/** Corpus schema: denominator used to scale parsed_float_magnitude into probability space. */
⋮----
/** Corpus schema: 16-primitive context fields. Legacy rows carry only applicable_contexts. */
⋮----
/** Corpus schema: prose description of the influence; legacy rows carry only how_it_influences_reasoning. */
⋮----
/**
   * The repo-relative path of the document the offsets are relative to.
   * `source_file` is only a basename, and 29 of the 69 basenames cited by
   * the MIND corpus exist in more than one place in the repo.
   */
⋮----
/**
   * The epistemic class, assigned by the builder against the document on
   * disk:
   *   CITABLE_VERIFIED         the quote IS verbatim in the named document
   *   HONESTLY_UNCITED_PRIOR    no source document exists
   *   DERIVED_MARKET_SYNTHESIS  synthesised from a market/table row
   *
   * A record that predates the class system has none. It is treated as
   * UNVERIFIED, because the honest default for an unknown provenance is
   * "unknown", not "fine".
   */
⋮----
export interface MindPrincipleMatch {
  readonly item_id: string;
  readonly source: string;
  readonly title: string;
  readonly principle_or_feature: string;
  readonly domain?: string;
  readonly numeric_claim?: {
    readonly value: number;
    readonly unit: string;
    /** Present when the underlying record carries a structured metric label; the string-serialized form does not. */
    readonly metric?: string;
  } | null;
  readonly evidence_quote: string;
  readonly matchedContext: string;
  readonly how_it_influences_reasoning: string;
  readonly numericDelta: number;
  readonly confidenceWeight: number;
}
⋮----
/** Present when the underlying record carries a structured metric label; the string-serialized form does not. */
⋮----
export interface MindSituationalPick {
  readonly selection: string;
  readonly marketLine: number | null;
  readonly modelFairProbability: number;
  readonly marketImpliedProbability: number;
  readonly rawEdge: number;
  readonly conviction: "LEAN" | "SOLID" | "HIGH";
  readonly mindCitations: readonly MindPrincipleMatch[];
  readonly rationale: string;
}
⋮----
export interface ParlayLeg {
  readonly description: string;
  readonly marketType: "SPREAD" | "TOTAL" | "PROP";
  readonly selection: string;
  readonly unadjustedOdds: number;
  readonly probability: number;
  readonly correlationRationale: string;
}
⋮----
export interface MindSameGameParlay {
  readonly name: string;
  readonly legs: readonly ParlayLeg[];
  readonly estimatedFairOdds: number;
  readonly retailIndependentOdds: number;
  readonly correlationAdvantagePct: number;
  readonly copulaTheta: number;
  readonly jointProbability: number;
  readonly independentProbability: number;
  readonly mindCitations: readonly MindPrincipleMatch[];
  readonly rationale: string;
}
⋮----
export interface FantasyDfsPlayerComp {
  readonly playerOrUnit: string;
  readonly team: string;
  readonly role: string;
  readonly action: "BOOST_START" | "FADE_AVOID" | "CASH_CORE" | "GPP_LEVERAGE";
  readonly reasoning: string;
  readonly citedPrinciples: readonly string[];
}
⋮----
export interface MindFantasyDfsAdvice {
  readonly matchupOverview: string;
  readonly targets: readonly FantasyDfsPlayerComp[];
  readonly cashGameStrategy: string;
  readonly tournamentGppStrategy: string;
  readonly mindCitations: readonly MindPrincipleMatch[];
  readonly rationale: string;
}
⋮----
export interface MindEvaluationResult {
  readonly context: GameContext;
  readonly totalMindRecordsLoaded: number;
  readonly applicablePrinciples: readonly MindPrincipleMatch[];
  readonly situationalPick: MindSituationalPick;
  readonly sameGameParlay: MindSameGameParlay;
  readonly fantasyDfsAdvice: MindFantasyDfsAdvice;
  readonly reasoningTrace: string;
  readonly netSituationalAdjustment: number;
}
⋮----
/**
 * Resolves candidate paths for MIND_CORPUS_3000.jsonl.
 */
export function findMindCorpusPaths(): string[]
⋮----
// Walk UP from cwd before anything else: the corpus is COMMITTED at the
// repo root, but processes run from workspace subdirectories (apps/web in
// CI and in vitest), where a bare cwd-relative resolve misses it. From
// apps/web the committed copy sits three levels up.
⋮----
/**
 * Loads the structured mind artifact from disk.
 */
export function loadMindCorpus(customPath?: string): readonly MindRecord[]
⋮----
// Skip malformed
⋮----
/**
 * Helper to convert implied win probability into American odds.
 */
export function probToAmericanOdds(prob: number): number
⋮----
// ============================================================================
// EXTENDED GSE MIND ARCHITECTURE SPECIFICATION (GSE Mind Architecture.docx)
// ============================================================================
⋮----
export type ContextFieldEnum =
  | "altitude_feet"
  | "wind_speed_mph"
  | "ambient_temp_fahrenheit"
  | "precipitation_rate_mm_hr"
  | "air_density_kg_m3"
  | "surface_traction_coeff"
  | "rest_differential_days"
  | "circadian_travel_timezones"
  | "ol_continuity_shared_snaps_pct"
  | "offensive_pace_sec_per_play"
  | "acoustic_crowd_spl_db"
  | "officiating_crew_penalty_rate"
  | "market_steam_velocity_pts_hr"
  | "reverse_line_movement_divergence_pct"
  | "acute_chronic_workload_ratio"
  | "coach_fourth_down_aggressiveness_pct";
⋮----
export type ClaimType = "causal" | "correlational" | "theoretical";
export type InfluenceDirection = "positive" | "negative" | "conditional";
⋮----
export interface CharacterSpan {
  /**
   * The offsets are NULLABLE on purpose.
   *
   * A record whose quote is not in the document it names has NO span.
   * The old type forced `number`, and the consumer papered over that with
   * `start_char: 0, end_char: quote.length, verification_tier:
   * "MSVH_S1_EXACT"` -- which asserts "verified verbatim at offset 0" for
   * a quote that is in no document. That is the same fabrication the
   * corpus builder had, reproduced downstream: the builder's audit found
   * 0 of 5,049 spans selecting their own quote while every record
   * carried the EXACT tier.
   *
   * NULL says "unverified". So does the S0 tier. Only a span that was
   * actually computed from the document's bytes may claim S1_EXACT.
   */
  readonly start_char: number | null;
  readonly end_char: number | null;
  readonly verification_tier:
    | "MSVH_S0_UNCITED"
    | "MSVH_S0_DERIVED_TABLE"
    | "MSVH_S1_EXACT"
    | "MSVH_S2_NORMALIZED"
    | "MSVH_S3_LEVENSHTEIN";
}
⋮----
/**
   * The offsets are NULLABLE on purpose.
   *
   * A record whose quote is not in the document it names has NO span.
   * The old type forced `number`, and the consumer papered over that with
   * `start_char: 0, end_char: quote.length, verification_tier:
   * "MSVH_S1_EXACT"` -- which asserts "verified verbatim at offset 0" for
   * a quote that is in no document. That is the same fabrication the
   * corpus builder had, reproduced downstream: the builder's audit found
   * 0 of 5,049 spans selecting their own quote while every record
   * carried the EXACT tier.
   *
   * NULL says "unverified". So does the S0 tier. Only a span that was
   * actually computed from the document's bytes may claim S1_EXACT.
   */
⋮----
export interface VerifiedSituationalPrinciple {
  readonly item_id: string;
  readonly source_doc_hash: string;
  readonly principle_name: string;
  readonly numeric_claim: string;
  readonly parsed_float_magnitude: number;
  readonly unit_scale_denominator: number;
  readonly evidence_quote: string;
  readonly evidence_span: CharacterSpan;
  readonly mechanism_quote: string;
  readonly mechanism_span: CharacterSpan;
  readonly applicable_context_fields: readonly ContextFieldEnum[];
  readonly influence_direction: InfluenceDirection;
  readonly conditional_threshold: string | null;
  readonly parsed_threshold_value: number | null;
  readonly parsed_threshold_operator: ">" | ">=" | "<" | "<=" | null;
  readonly claim_type: ClaimType;
  readonly influence_description: string;
  /**
   * The epistemic class the record was assigned by the builder, carried
   * through so a consumer can see WHY a principle is or is not citable.
   */
  readonly record_class: string | null;
  readonly citable: boolean;
}
⋮----
/**
   * The epistemic class the record was assigned by the builder, carried
   * through so a consumer can see WHY a principle is or is not citable.
   */
⋮----
export type GameContextVector = Partial<Record<ContextFieldEnum, number>> & {
  readonly current_session_load?: number;
};
⋮----
export interface PrincipleApplicationAuditRecord {
  readonly item_id: string;
  readonly source_doc_hash: string;
  readonly principle_name: string;
  readonly triggered_context_field: ContextFieldEnum;
  readonly observed_context_value: number;
  readonly baseline_context_value: number;
  readonly evidence_quote: string;
  readonly evidence_span: CharacterSpan;
  readonly mechanism_quote: string;
  readonly mechanism_span: CharacterSpan;
  readonly numeric_claim: string;
  readonly parsed_delta_applied: number;
  readonly claim_type: ClaimType;
  readonly confidence_weight: number;
  readonly resolution_status: "APPLIED" | "CONFLICT_NEUTRALIZED" | "THRESHOLD_NOT_MET";
  readonly threshold_evaluation?: {
    readonly operator: string;
    readonly threshold_value: number;
    readonly observed_value: number;
    readonly condition_satisfied: boolean;
  } | null;
}
⋮----
export interface MindPrinciplesEvaluation {
  readonly total_delta: number;
  readonly adjustments: readonly {
    readonly field: ContextFieldEnum;
    readonly final_delta: number;
    readonly consensus_ratio: number;
    readonly resolution_status: "APPLIED" | "CONFLICT_NEUTRALIZED" | "THRESHOLD_NOT_MET";
  }[];
  readonly rendered_prose: string;
  readonly audit_trail: readonly PrincipleApplicationAuditRecord[];
}
⋮----
/**
 * Verifies that a numeric claim is literally grounded in the evidence quote.
 */
export function quoteContainsNumericClaim(quote: string, numClaim: unknown, mag?: number): boolean
⋮----
/**
 * Maps a MindRecord from disk into a fully validated VerifiedSituationalPrinciple.
 */
export function toVerifiedSituationalPrinciple(rec: MindRecord): VerifiedSituationalPrinciple
⋮----
// If defaulted to offensive_pace_sec_per_play or misclassified, refine using text signals:
⋮----
// Purge noise from weather fields (e-commerce, traffic, brain fNIRS)
⋮----
// Purge kicker defense note from aerodynamic drag and crowd noise:
⋮----
// Pure content-driven: numeric claim must be literally grounded in evidence quote.
// Ungrounded or missing numbers contribute exactly 0.0 (no magic defaults)
⋮----
// If numeric magnitude is an unscaled raw quantity (e.g. 2.5 points, 45 percent), scale to probability space:
⋮----
// Strict ACWR content-driven gate: only negative-influence principles citing verified
// hazard/fatigue/injury/overload/risk with quote-grounded numeric claims contribute.
⋮----
// THE FALLBACK WAS A FABRICATION.
//
// It used to read:
//     const evSpan: CharacterSpan = rec.evidence_span ?? {
//       start_char: 0, end_char: evQuote.length,
//       verification_tier: "MSVH_S1_EXACT",
//     };
//
// When a record has no span -- because the quote is not in the
// document it names -- that invented offset 0 and stamped the record
// as an EXACT verification. The corpus audit measured 0 of 5,049
// spans selecting their own quote while every record carried
// MSVH_S1_EXACT; this line reproduced the same lie at the consumer,
// on every record the builder had failed to verify.
//
// A record with no span HAS no span. The honest value is null with
// the S0 tier: "unverified", not "verified at offset 0".
⋮----
function mapLegacyContextsToFields(contexts: readonly string[]): ContextFieldEnum[]
⋮----
/**
 * The epistemic class a record must hold to contribute a LITERATURE DELTA.
 *
 * CLASS-A EXCLUSIVITY (the spec's §6 requirement).
 *
 * Only a CITABLE_VERIFIED record may inject a numeric delta. A
 * HONESTLY_UNCITED_PRIOR is a hand-authored premise with no document
 * behind it; a DERIVED_MARKET_SYNTHESIS is a number read out of a market
 * row, not a quotation. Either may still be useful as a STRUCTURAL
 * hypothesis -- an edge that might exist -- but neither may be reported
 * as a literature finding, because there is no literature behind it.
 *
 * The class is checked HERE, at the point where a delta is minted, not
 * only at build time. A record that reaches this function with an
 * unknown class is treated as NOT citable: the honest default for an
 * unverified provenance is "unverified", not "assume the best".
 */
export function isClassACitable(rec: MindRecord): boolean
⋮----
/**
 * Loads the grounded mind corpus as VerifiedSituationalPrinciple records.
 *
 * IT DOES NOT FILTER BY CLASS, AND THE NAME SAYS WHY.
 *
 * "loadVerifiedMindCorpus" is a misnomer: it loads the CORPUS, and
 * every record in it, including the ones the builder stamped
 * HONESTLY_UNCITED_PRIOR, DERIVED_MARKET_SYNTHESIS or
 * REJECTED_CORRUPT. The filtering happens where it belongs -- at the
 * point where a delta is minted (`matchApplicablePrinciples` and
 * `evaluateMindPrinciples`, both of which require
 * `isClassACitable`).
 *
 * The reason is that a filter HERE would be a filter on a NAME: a
 * caller that wants to MEASURE the corpus -- how many principles are
 * there, how they are distributed, what a bad record looks like -- must
 * be able to load them all. A caller that wants to USE the corpus gets
 * the class check at the use site, where it cannot be forgotten.
 *
 * So this function loads; it does not judge. The class is carried on
 * every record (`record_class`, `citable`), so a consumer can filter
 * itself, and the two functions that produce deltas do.
 */
export function loadVerifiedMindCorpus(customPath?: string): readonly VerifiedSituationalPrinciple[]
⋮----
/**
 * Loads ONLY the class-A citable principles -- the ones that may
 * contribute a literature delta.
 *
 * This is the function a consumer should reach for when it wants
 * literature, as opposed to the corpus. The class is checked HERE as
 * well as at the delta site, because a caller that loads the corpus and
 * filters it itself is one refactor away from loading the corpus and
 * not filtering it.
 */
export function loadCitableMindCorpus(customPath?: string): readonly VerifiedSituationalPrinciple[]
⋮----
/**
 * Maps legacy GameContext into the 16-primitive GameContextVector.
 */
export function mapGameContextToVector(ctx: GameContext): GameContextVector
⋮----
// Workload / ACWR: default 1.0 (optimal baseline); elevated if acute workload or turnover margin indicates fatigue
⋮----
// Coaching 4th down aggressiveness: 50% baseline + delta
⋮----
// Officiating penalty rate: 12.0 baseline or explicit context
⋮----
/**
 * Matches applicable principles in the mind artifact for a given game context.
 * Computes exact numeric deltas dynamically driven by the matched principles'
 * extracted literature claims (delta_{c,i} = sign * |beta_i| * deltaX) without
 * heuristic fallback constants or arbitrary multipliers.
 */
export function matchApplicablePrinciples(
  ctx: GameContext,
  records: readonly MindRecord[],
): readonly MindPrincipleMatch[]
⋮----
// CLASS-A EXCLUSIVITY. A record that is not CITABLE_VERIFIED may not
// inject a numeric delta. Before the class system existed, every
// record in the corpus could mint a delta -- including the 3,509
// whose quotes were in no document at all, and the 1,704 whose
// numbers were nowhere near the quote. The delta is a claim about the
// world, made in the name of literature, so the literature has to be
// there.
⋮----
continue; // Sweet spot [0.8, 1.3] and below hazard threshold [<1.40] produces 0 delta
⋮----
/**
 * Generates a situational pick or lean directly from applicable mind principles.
 */
export function generateSituationalPick(
  ctx: GameContext,
  matches: readonly MindPrincipleMatch[],
): MindSituationalPick
⋮----
// Select citations by active impact and diversity across matched contexts
⋮----
/**
 * Constructs a correlated Same-Game Parlay (SGP) directly from Archimedean Clayton copula
 * equations and game-script correlation principles in the mind.
 *
 * Formulas:
 *   Clayton Copula C(u1, u2, u3; theta) = (u1^(-theta) + u2^(-theta) + u3^(-theta) - 2)^(-1/theta)
 *   Independent P_indep = u1 * u2 * u3
 *   Advantage % = (P_joint - P_indep) / P_indep * 100
 */
export function generateSameGameParlay(
  ctx: GameContext,
  matches: readonly MindPrincipleMatch[],
): MindSameGameParlay
⋮----
// Filter copula & correlation citations
⋮----
// Derive Clayton copula theta parameter from matched copula principles
⋮----
// Map literature edge / correlation parameter into copula theta
⋮----
// Leg 1: Side Anchor (Favored side from situational shift)
⋮----
// Modern HFA prior: ~1.5–1.8 points. Near a 50/50 game the point-to-win-prob
// slope is ~0.033 per point, so a 1.6-pt prior is ~0.053 of win probability
// credited to the home side. (Documented band 1.5–1.8, not a fluid-dynamics term.)
⋮----
// PROB_PER_POINT is imported from constants.ts — the one shared binding the
// injury overlay in coach-sim/locked-projection.ts also consumes. Declaring a
// local copy here is what let the two surfaces drift.
⋮----
// Post-2011 rest-differential decay (arXiv:2408.10867v1): the pre-2011 bye
// edge was +2.2 pts/game and is mitigated since the 2011 CBA. Keep only a
// small, capped residual (~0.15 pt per rest day beyond even rest).
⋮----
// Leg 2: Total (Under in thin air / wind / cold / fatigued DL; Over in dome / high coach pace)
⋮----
// Leg 3: Correlated Opponent or Team Total Prop
⋮----
// Archimedean Clayton Copula Joint Probability Formula:
// C(u1, u2, u3) = (u1^(-theta) + u2^(-theta) + u3^(-theta) - 2)^(-1/theta)
⋮----
// Independent Retail Probability:
⋮----
// Convert to American Odds
⋮----
// Exact Correlation Advantage Percentage over Retail Pricing
⋮----
/**
 * Generates Fantasy & DFS start/sit and tournament advice directly from tracking,
 * trench, and workload principles in the mind, evaluating actual game context
 * against specific literature thresholds (e.g. Nguyen STRAIN 2.2s, Lopez 28% decay).
 */
export function generateFantasyDfsAdvice(
  ctx: GameContext,
  matches: readonly MindPrincipleMatch[],
): MindFantasyDfsAdvice
⋮----
// Dynamic Targets evaluated from context parameters against literature thresholds
⋮----
// Target 1: Cash Core Anchor (Lead Rusher / Ground Attack)
⋮----
// Target 2: GPP Leverage Target (Quick-Release Slot WR or Blitz Checkdown)
⋮----
// Target 3: Fade / Avoid (Deep Perimeter Threat in Wind/Cold or Fatigued Unit)
⋮----
/**
 * Synthesizes the master reasoning trace incorporating all mind-driven outputs.
 */
export function synthesizeMindReasoningTrace(
  ctx: GameContext,
  pick: MindSituationalPick,
  parlay: MindSameGameParlay,
  dfs: MindFantasyDfsAdvice,
  matches: readonly MindPrincipleMatch[],
): string
⋮----
/**
 * Top-level mind evaluation function that runs the complete autonomous pipeline.
 */
export function evaluateMindReasoning(
  ctx: GameContext,
  customMindRecords?: readonly MindRecord[],
): MindEvaluationResult
⋮----
/**
 * Section 6.2 & 6.3: Mathematical Formulation of Delta Derivation and Opposing-Claim Conflict Resolution.
 * Evaluates GameContextVector against VerifiedSituationalPrinciple corpus.
 */
export function evaluateMindPrinciples(
  context: GameContextVector,
  corpus: readonly VerifiedSituationalPrinciple[],
): MindPrinciplesEvaluation
⋮----
// Zero displacement from baseline produces zero situational adjustment; skip to avoid ghost adjustments
⋮----
// ACWR Band Rules (Sweet spot & hazard threshold)
⋮----
// Filter matching principles
//
// CLASS-A EXCLUSIVITY, second site. `evaluateMindPrinciples` works
// on already-converted principles, so the class has to be checked on
// the principle itself. A principle that is not citable may not
// produce a delta here either -- this is the path that writes the
// final adjustment and the prose that reports it.
⋮----
interface ActivePrincipleCalc {
      principle: VerifiedSituationalPrinciple;
      rawDelta: number;
      weight: number;
      sign: number;
      deltaX: number;
      thresholdEval: {
        operator: string;
        threshold_value: number;
        observed_value: number;
        condition_satisfied: boolean;
      } | null;
    }
⋮----
// Weight by claim_type (Section 6.2) & schedule-confounding constraint
⋮----
weight = 0.3; // Theoretical weight when unconditioned on current-session load
⋮----
// Directional sign operator
⋮----
sign = -1; // Strict negative hazard
⋮----
// Enforce ACWR hazard formula: delta_i = -|beta_i| * max(0, (x - 1.0)/0.25)
⋮----
// Aggregate delta and directional consensus ratio
⋮----
// Conflict-Resolution Rule: Deadband threshold eta_c < 0.20 strictly when opposing non-zero claims exist
⋮----
// Clamp intermediate field delta to probability-scale bounds [-0.10, +0.10]
⋮----
/**
 * Section 4: Four-Layer Deterministic Verification Gate.
 * Validates candidate extraction against source text.
 */
export function verifyCandidateExtraction(
  sourceText: string,
  candidate: {
    evidence_quote?: string;
    mechanism_quote?: string;
    numeric_claim?: string;
    applicable_context_fields?: readonly string[];
  },
):
⋮----
// L1: Substring provenance
⋮----
// L2: Numeric token containment
⋮----
// L3: SAV Character offset anchoring
⋮----
/**
 * Section 4: L4 Mechanism Entailment Gate.
 * Rejects cross-domain mismatches (e.g. No Free Lunch optimization paper under betting market labels).
 */
export async function verifyCandidateWithMechanismGate(
  sourceText: string,
  candidate: {
    evidence_quote?: string;
    mechanism_quote?: string;
    numeric_claim?: string;
    principle_name?: string;
    applicable_context_fields?: readonly string[];
  },
): Promise<
⋮----
// L4 Mechanism Entailment Gate
```

## File: packages/prediction-engine/src/coach-sim/belichick-ablation.test.ts
```typescript
/**
 * End-to-end ablation test for the Belichick ten-metric wiring.
 *
 * The audit's rule: a metric is only "wired and weighted" if running an
 * ablation test produces a non-zero delta on the final decision cell.
 * This test runs the same game twice — once with all four wired metric
 * tables active, once with them absent — and asserts that both the win
 * probability and the margin move.
 *
 * The seed is identical between runs (belichickHome/belichickAway are not
 * part of seedFor), so the only difference is the metric logic itself.
 *
 * Fixture realism: the tables below are multi-package and mixed-outcome rather
 * than degenerate 100% rows. A 100% sack fixture pins every dropback to a loss
 * and proves only that the code path executes, not that a plausible defensive
 * profile moves the decision cell by a plausible amount. These tables instead
 * mirror a real four-man-rush base with a five-man blitz package, a man/zone
 * third-down split, a 33% red-zone TD rate, and average punt returns.
 *
 * The bounds encode the doctrine guardrail: a metric table may not swing the
 * margin by more than ten points or the home win probability by more than
 * 0.35. Anything larger means the metric dominates the sim instead of
 * informing it. The default-staff path is exercised deliberately (no
 * staffAggression pin) — a wiring that only works under one pinned staff
 * profile is not wired into the default pipeline.
 */
import { describe, expect, it } from "vitest";
import { simulateCoachGame, type CoachSimInput } from "./markov-simulator.js";
import type { BelichickMetricInputs } from "../nfl/belichick-ten-metrics.js";
import {
  shrinkPublishedCell,
  getTeamShrunkTrenchAndBlitzCell,
  pitNoYbcCell,
  MEASURED_CELL_PRIORS,
} from "../nfl/published-cells-shrinkage.js";
⋮----
/** Doctrine guardrail: metric tables inform the sim, they do not dominate it. */
⋮----
/**
 * Realistic multi-package metric tables:
 * - 10 base 4-rusher zone snaps, no sack      → most dropbacks are clean
 * - 2 five-rusher man blitzes, both sacked    → the blitz package lands
 * - 2 five-rusher man pressures, no sack      → blitz without a sack
 * - 5 man third downs converted, 7 zone stops → man coverage holds up
 * - 4 red-zone pass TDs in 12 snaps           → 33% red-zone TD rate
 * - 12 punts returning 25 yards               → average, not pinned
 */
⋮----
/**
 * The 32-team trench/blitz cells are only "wired and weighted" if the shrink
 * arithmetic reproduces the published numbers and the resolved team cells move
 * when the input moves. These are the arithmetic proofs; the ablation block
 * above proves the cells reach the decision cell.
 */
⋮----
// Baranchik JS+ factor for the YBC vector: 1 - 29*0.024/5.2696875 = 0.867924
⋮----
// Shrinkage pulls a team above the mean DOWN toward it.
⋮----
// Shrinkage pulls a team below the mean UP toward it.
⋮----
// JS+ never leaves the raw value outside the [raw, mean] interval.
⋮----
// The resolver in markov-simulator.ts gates on record membership before
// calling this. Document the raw behaviour so a future refactor does not
// assume the cell function itself is safe.
```

## File: packages/prediction-engine/src/public-baseline/corpus-ledger.test.ts
```typescript
import { describe, it, expect } from "vitest"
import { correctShowdownOwnership, markApplied, publishFromCorpus, scanNumbers } from "./corpus-ledger.js"
import { parseXPull } from "./x-corpus.js"
import { readFileSync } from "node:fs"
import { CORPUS_PATH } from "./corpus-path.js"
```

## File: packages/prediction-engine/src/public-baseline/espn.ts
```typescript
/**
 * Public ESPN NFL scoreboard. No key.
 * A scheduled game reports score "0". That zero is not a result.
 * Home and away come from `homeAway`, never from array order.
 */
⋮----
import type { LiveGame, ScoresBoard } from "./scores365.js"
⋮----
export type EspnBoard = ScoresBoard & { season: number | null; week: number | null }
⋮----
function num(value: unknown): number | null
⋮----
export function parseEspnScoreboard(payload: unknown): EspnBoard
⋮----
competitionId: null, // ESPN ids live in their own space; 352 is 365Scores-only
```

## File: packages/prediction-engine/src/public-baseline/registry.ts
```typescript
/** What the 2026-10-24 sweep actually established. Identity gates are not engines. */
⋮----
export type SourceStatus = "PUBLIC-CODE" | "PUBLIC-ARCHIVE" | "OPEN-HTML" | "WIRED" | "IDENTITY-GATED" | "DEAD" | "NOT-NFL"
⋮----
export type SourceRow = { id: string; status: SourceStatus; note: string }
```

## File: packages/prediction-engine/src/public-baseline/x-corpus.test.ts
```typescript
import { describe, it, expect } from "vitest"
import { advanceWithCorpus, loadCoachCorpus, personnelOnField, requireCorpus } from "./x-corpus.js"
import type { MarkovState } from "../markov-simulator.js"
import { CORPUS_PATH } from "./corpus-path.js"
⋮----
const stable = (n: number, epaSum: number) => (
```

## File: packages/prediction-engine/src/public-baseline/x-corpus.ts
```typescript
/**
 * The analyst X pull is the coach corpus. Every post is an input.
 * A step that does not read the corpus does not run.
 * The corpus does not mint a ticket: 401873010 is a final.
 */
import { readFileSync } from "node:fs"
import { advanceOutcome, type MarkovState, type SituationInputs, type StepResult } from "../markov-simulator.js"
import { markApplied, publishFromCorpus, scanNumbers, type CoachPublished, type NumberToken } from "./corpus-ledger.js"
import { callSheet, type Call } from "./call-sheet.js"
⋮----
export type CoachPost = {
  account: string
  createdAt: string
  postId: string
  url: string
  text: string
  coachInput: true
}
⋮----
export type AvailabilityStatus = "out" | "questionable" | "playing" | "no-designation"
⋮----
export type Availability = {
  player: string
  status: AvailabilityStatus
  detail: string
  team: string | null
  postId: string
  coachInput: true
}
⋮----
export type Measurement = {
  label: string
  value: number
  postId: string
  coachInput: true
}
⋮----
export type CoachBrief = {
  corpusRead: true
  coachInput: true
  ticket: null
  posts: CoachPost[]
  availability: Availability[]
  measurements: Measurement[]
  personnel: {
    SF: { wrActive: string[]; wrOut: string[] }
  }
  games: {
    "401873010": {
      gameId: "401873010"
      coachInput: true
      ticket: null
      mayeEpaPerDropback: number
      williamsEpaPerDropback: number
      santosFieldGoalYards: 58
      santosPostId: string
    }
    "401873012": {
      gameId: "401873012"
      coachInput: true
      ticket: null
      lamar: Availability
      bengalsBlitzRate: number
      bengalsPressureRate: number
      ravensEpaWhenBlitzed: number
      ravensEpaWithoutBlitz: number
      /** blitzRate * epaBlitzed + (1 - blitzRate) * epaUnblitzed. Weights are the post. */
      ravensExpectedEpaPerDropback: number
      chaseTargets: number
      chaseYards: number
      chaseFpg: number
    }
  }
  published: CoachPublished
  numbers: NumberToken[]
  calls: Call[]
}
⋮----
/** blitzRate * epaBlitzed + (1 - blitzRate) * epaUnblitzed. Weights are the post. */
⋮----
export function parseXPull(markdown: string): CoachPost[]
⋮----
function firstSentence(value: string): string
⋮----
function splitPlayers(sentence: string): string[]
⋮----
const push = () =>
⋮----
function statusFromParen(paren: string, fallback: AvailabilityStatus):
⋮----
export function availabilityFromPosts(posts: readonly CoachPost[]): Availability[]
⋮----
function numberBefore(text: string, pattern: RegExp): number | null
⋮----
export function measurementsFromPosts(posts: readonly CoachPost[]): Measurement[]
⋮----
function must(measurements: readonly Measurement[], label: string): number
⋮----
export function expectedEpaPerDropback(blitzRate: number, whenBlitzed: number, whenNot: number): number
⋮----
export function readCoachBrief(markdown: string): CoachBrief
⋮----
export function loadCoachCorpus(path: string): CoachBrief
⋮----
export function requireCorpus(brief: CoachBrief | null | undefined): CoachBrief
⋮----
/** Personnel the coach is allowed to put on the field after reading the corpus. */
export function personnelOnField(brief: CoachBrief, team: "SF", group: "WR"): string[]
⋮----
export function advanceWithCorpus(
  state: MarkovState,
  inputs: SituationInputs,
  brief: CoachBrief | null,
): StepResult &
```

## File: packages/prediction-engine/src/public-baseline/feeds-seal.test.ts
```typescript
/**
 * Seal + paging tests for the public feed parsers.
 * - The public espn.jsonl row carries NO market fields. Importing it into the
 *   coach path (assertCoachInputs) must throw the moment an odds key rides along.
 * - The coach fence rejects spread, odds, and mr_*.
 * - 365Scores fixtures (competition 352) page via paging.nextPage; -1 is
 *   unplayed; a Final game keeps its real score (Stanford 31, NC State 28
 *   lives on the sports=6 board and is NCAAF/CFL, never tagged NFL).
 * - Anchor events: 401873010 home CHI 30, away NE 24, final.
 *   401873012 home BAL, away CIN, scheduled (state "pre", score "0" -> null).
 */
⋮----
import { describe, it, expect } from "vitest"
import { assertCoachInputs, CoachFenceError } from "./fence.js"
import { parseEspnScoreboard } from "./espn.js"
import { fixturesWindow, parseScores365, NFL_COMPETITION_ID } from "./scores365.js"
⋮----
// A public espn.jsonl row exactly as the nfl-farm runner writes it: no odds.
⋮----
// The same row after someone naively merges the sealed odds file into it.
⋮----
// Vitest's toThrow accepts an error class, regex or string — not an arbitrary
// predicate. Capture the throw and assert the fence key explicitly.
⋮----
// array order is deliberately AWAY-first here
```

## File: packages/prediction-engine/src/public-baseline/ne-chi-fixture.test.ts
```typescript
/**
 * NE@CHI (ESPN event 401873010) public-feed fixture.
 * Final: CHI 30, NE 24, total 54. No spread or total pick is asserted —
 * a finished game is a result, not a ticket.
 * BAL@CIN (401873012) is scheduled; if its audit file is absent the fixture
 * emits that path as a named gap and does not invent the audit.
 */
⋮----
import { describe, it, expect } from "vitest"
import { readFileSync, existsSync } from "node:fs"
import { join } from "node:path"
import { parseEspnScoreboard, ESPN_NFL_SCOREBOARD } from "./espn.js"
import { parseScores365, fixturesUrl } from "./scores365.js"
import { assertCoachInputs } from "./fence.js"
import type { ScoresBoard } from "./scores365.js"
⋮----
// The audits live at the repo root, but vitest's cwd is the package dir, so
// process.cwd() pointed at packages/prediction-engine and the gap list read
// ENOENT. Resolve from this file instead: src/public-baseline -> src -> prediction-engine -> packages -> Sports (4 up).
⋮----
async function getJson(url: string): Promise<unknown>
⋮----
const abs = (u: string) => (u.startsWith("http") ? u : `$
⋮----
// Work order: follow paging.previousPage AND paging.nextPage until the
// NFL window covers the events. Forward pages walk upcoming games; the
// previousPage cursor (aftergame=...&direction=-1) walks past games.
⋮----
const visit = (board: ScoresBoard) =>
⋮----
// forward: nextPage chain (walks the future)
⋮----
// backward: page 1's previousPage cursor walks to the games just before
// the current window (the Oct 22 CHI vs NE final sits one page back).
⋮----
// The fixture records the gap; it does not fabricate the audit.
```

## File: packages/prediction-engine/src/public-baseline/scores365.ts
```typescript
/**
 * Public 365Scores JSON. No key.
 * `current` without `sports` returns an empty shell. American football is sports=6.
 * The NFL competition is 352. A score of -1 means the game has not been played.
 */
⋮----
export type LiveSide = { name: string; abbr: string; score: number | null }
⋮----
export type LiveGame = {
  id: number
  competitionId: number | null
  competition: string
  startTime: string
  status: string
  home: LiveSide
  away: LiveSide
}
⋮----
export type ScoresBoard = {
  ttl: number
  lastUpdateId: number | null
  paging: { previousPage: string | null; nextPage: string | null }
  games: LiveGame[]
}
⋮----
function qs(params: Record<string, string>): string
⋮----
const common = (timezone: string) => (
⋮----
export function currentGamesUrl(sportId = SPORT_AMERICAN_FOOTBALL, timezone = "America/Chicago"): string
⋮----
export function fixturesUrl(competitionId = NFL_COMPETITION_ID, timezone = "America/Chicago"): string
⋮----
function played(score: unknown): number | null
⋮----
function side(raw: unknown): LiveSide
⋮----
export function homeVsAway(game: LiveGame): string
⋮----
export function homeAwayScore(game: LiveGame): string
⋮----
export function parseScores365(payload: unknown): ScoresBoard
⋮----
/**
 * Follow paging.nextPage from the NFL fixtures board (competition 352) until
 * `wantIds` are all seen or `maxPages` is exhausted. `fetchPage` is injected
 * so tests stay offline. Competition 352 rows are the NFL window; the
 * sports=6 /current/ pull is NCAAF and CFL and must never be tagged NFL.
 */
export async function fixturesWindow(
  fetchPage: (url: string) => Promise<ScoresBoard>,
  wantIds: ReadonlySet<number>,
  maxPages = 6,
): Promise<
⋮----
// live payload paging is a relative cursor path (/web/games/?...aftergame=ID&direction=1)
```

## File: packages/prediction-engine/src/public-baseline/engine.test.ts
```typescript
import { describe, it, expect } from "vitest"
import { absDeltaMultiplier, HFA, K, movMultiplier, publicPrior, replay, REVERSIONS, winProb } from "./elo538.js"
import { assertCoachInputs, CoachFenceError } from "./fence.js"
import { positivePartJamesStein } from "./jamesStein.js"
import { KILLED_EDGES, mayReopen } from "./killed.js"
import { ANCHOR_MOTION_PA_SINGLE, computeGseDwp, computeGseQptsr, computeGseSii, computeGseSpese, computeGseSva, computeGseTor } from "./metrics.js"
import { SOURCE_REGISTRY } from "./registry.js"
import { captainPoints, captainSalary, SHOWDOWN_CAP, underCap, withinTeamLimit } from "./lineup.js"
import { additiveDevig, compareDevig, multiplicativeDevig, powerDevig, shinDevig } from "./devig.js"
import { parseEspnScoreboard } from "./espn.js"
import { NFL_COMPETITION_ID, fixturesUrl, homeAwayScore, homeVsAway, parseScores365 } from "./scores365.js"
import { bestTeamTitleRate, brierScore, pageCusum, reliabilityBins, seriesWinProb } from "./research.js"
import { SHIFT_FLOOR, shouldWithhold, situationalShift } from "./withhold.js"
```

## File: packages/prediction-engine/src/coach-sim/markov-simulator.ts
```typescript
/**
 * Coach-first drive simulator.
 *
 * Class A. No book tokens.
 *
 * The published location (margin, total, home-score stub) stays on the only
 * points scale this file has ever had: home margin 3 + coachSupport*0.15,
 * total 46.5 + coachSupport*0.15, kneel haircut, injury split. That scale is
 * a modeling choice, not a farm measurement. Scoring's override gate is
 * distance from the constant 3, so the location cannot move off it by accident.
 *
 * What the drive loop adds, and the closed form did not:
 * - n games. The total band width is the sample. It is not ±7.
 * - 4th down uses evaluateFourthDown on the live state.
 * - The packet's staffAggression is the home staff. Away stays PHI until the
 *   packet carries two rates. The difference in sample points is added to the
 *   location. At the PHI default the difference is zero, so scoring is unchanged.
 * - Kneel uses kneelProbability. Yards do not become points.
 * - A field goal scores only inside 48–52 yards, at FG_MAKE_50 (0.641).
 *   Every other kick distance is a named gap and scores 0.
 * - Sack conversion (15.8% / 10.1%) is the chance a pressure becomes a sack.
 *   How often a dropback is pressured is no longer a blank: 16,777 of 57,524
 *   joined dropbacks, 2023–2025. The drive uses the sack rate itself
 *   (3,989 / 57,524) and the mean sack of -6.6 yards. It does not invent
 *   a hurry-yard penalty for the pressures that are not sacks.
=======
 */
import { CONVERSION_BY_BUCKET } from "../nfl/pressure-timing.js";
import { KNEEL_MEAN_YD, KNEEL_RATE_PER_WINNING_GAME, kneelProbability } from "../nfl/kneeldown-mass.js";
import { evaluateFourthDown, STAFF_AGGRESSION } from "./fourth-down-policy.js";
import { allocateTargets, applyShadowHaircut, type EligibleTarget } from "./sinkhorn-targets.js";
import { POOLED_DROPBACK } from "../nfl/situational-reality.js";
import {
  evaluateBelichickTenMetrics,
  type BelichickMetricInputs,
  type BelichickMetricBundle,
} from "../nfl/belichick-ten-metrics.js";
import {
  getTeamShrunkTrenchAndBlitzCell,
  YBC_PER_RUSH_32,
  type TeamTrenchAndBlitzCell,
  type NflTeamCode,
} from "../nfl/published-cells-shrinkage.js";
⋮----
export interface CoachSimInput {
  homeTeam: string;
  awayTeam: string;
  week: number;
  coachSupport: number;
  injuryDropOff?: number;
  neutralPassRate?: number;
  staffAggression?: number;
  /** Away staff go-rate. Defaults to STAFF_AGGRESSION.PHI (documented default). */
  staffAggressionAway?: number;
  shadows?: Array<{ wr: string; shadowRate: number }>;
  /** Belichick ten-metric snap inputs for the home team's offense. */
  belichickHome?: BelichickMetricInputs;
  /** Belichick ten-metric snap inputs for the away team's offense. */
  belichickAway?: BelichickMetricInputs;
  /**
   * Measurement-only override for the 32-team trench/blitz cells.
   * Defaults to true. Setting false resolves no cell, so the played sample is
   * a true no-cell draw; combined with no metric tables and default staff the
   * played sample collapses onto the baseline and the cell term measures as
   * exactly zero. This exists so an ablation can isolate the cell effect while
   * holding the team codes — and therefore location.margin — fixed. Do not set
   * it in production paths.
   */
  forceApplyCells?: boolean;
}
⋮----
/** Away staff go-rate. Defaults to STAFF_AGGRESSION.PHI (documented default). */
⋮----
/** Belichick ten-metric snap inputs for the home team's offense. */
⋮----
/** Belichick ten-metric snap inputs for the away team's offense. */
⋮----
/**
   * Measurement-only override for the 32-team trench/blitz cells.
   * Defaults to true. Setting false resolves no cell, so the played sample is
   * a true no-cell draw; combined with no metric tables and default staff the
   * played sample collapses onto the baseline and the cell term measures as
   * exactly zero. This exists so an ablation can isolate the cell effect while
   * holding the team codes — and therefore location.margin — fixed. Do not set
   * it in production paths.
   */
⋮----
export interface CoachProjection {
  scoreMean: number;
  marginMean: number;
  totalP10: number;
  totalP90: number;
  /** Share of simulated games the home team won. */
  winProbHome: number;
  playerStats: Record<string, { mean: number; p10: number; p90: number }>;
  fourthDownWP?: number;
  targetShares?: Array<{ playerId: string; share: number }>;
}
⋮----
/** Share of simulated games the home team won. */
⋮----
/** Pinned. FG_MAKE_50 lives only in this module; no distance curve elsewhere. */
⋮----
/**
 * Regular-season plays, nflverse play_by_play_2023/2024/2025.csv.gz.
 * season_type = REG. Streaming count, not a model.
 * gz sha256:
 *   2023 4649804ee0f0a40b41e51ec75a1ce921949d7fab5459213488656b92f78560e8
 *   2024 23370d5d10f8104d80d46a1fc5e61f4f6f5a3263fe96fe2dd629913cfcb08c06
 *   2025 2f135887790a013fd004e609e37096bb4816d5cc80b9f19122e1bad478961978
 * rea 6.7.0 inspect-artifact refused the gzip: unsupported binary format.
 */
⋮----
neutralPassRate: 0.5753, // 57,853 pass plays / (57,853 + 42,741 non-kneel rushes)
completionExSack: 0.6436, // 34,654 / 53,842. Sacks are not attempts.
yardsPerCompletion: 10.907, // mean yards_gained on complete_pass, n = 34,654
completionYardsSd: 9.8747, // same plays. The draw below is normal. Only these two moments were counted.
yardsPerCarry: 4.4822, // non-kneel rush_attempt, n = 42,741. 1,266 kneels left out.
⋮----
xpMake: 0.9586, // extra_point_result = good / extra_point_attempt, n = 3,672
secondsPerPlay: 24.47, // mean clock drop in (1, 60] seconds, n = 120,618
⋮----
/**
 * Shrinkage targets for the 32-team published trench/blitz cells.
 *
 * These are the measured league means of the 32 published team values — the
 * point each team cell is shrunk toward. They are NOT modeling choices: each
 * equals the arithmetic mean of the vector in published-cells-shrinkage.ts, and
 * the shrink module recomputes its own mean from the vector, so these constants
 * exist only as a readability aid and a guard against a cell being read without
 * a target. A mismatch would be caught by the module's own consistency check.
 */
⋮----
/**
 * Conventional yards-per-EPA used to express the blitz cell on the same yardage
 * scale as the drive chain. The exact conversion is field-position dependent and
 * is a named gap; 10 yards/EPA is the conventional first-order value.
 */
⋮----
/**
 * Narrow a packet team string to the 32-code union without throwing.
 *
 * getTeamShrunkTrenchAndBlitzCell does not guard unknown codes — it indexes the
 * record directly, so an unknown key yields undefined values that propagate as
 * NaN. The membership check must happen here, against the record's own keys.
 */
function asNflTeamCode(team: string): NflTeamCode | null
⋮----
/** Resolve a team's shrunk trench/blitz cell, or null when the code is unknown. */
function resolveTrenchCell(team: string): TeamTrenchAndBlitzCell | null
⋮----
/** 4th-down GO conversion, converted / (converted + failed), by yards to go. */
export function fourthDownMakeRate(ydstogo: number): number
⋮----
if (ydstogo <= 1) return 0.6885; // n = 960
if (ydstogo <= 2) return 0.6033; // n = 368
if (ydstogo <= 5) return 0.5275; // n = 601
if (ydstogo <= 10) return 0.3064; // n = 346
return 0.1705; // n = 176
⋮----
/**
 * pressureRate is the participation count. The drive rolls the sack, not the hurry.
 * A completion's yards and a carry's yards are normal draws at the measured mean and sd.
 * Two-point tries are not rolled. Field goals outside 48–52 still score 0.
 */
⋮----
export function simulateCoachGame(input: CoachSimInput, n = 10_000): CoachProjection
⋮----
// Baseline is the no-metric reference. The metric tables are applied to the
// played sample only, so their effect survives the played − baseline
// subtraction. Passing the metrics to both sides made the term cancel
// exactly whenever played === baseline (the default-staff path), which left
// marginMean metric-invariant while winProbHome moved.
⋮----
// The redundant-second-sample shortcut only holds when there is no metric
// table AND no trench/blitz cell to apply. With either present the played
// sample must be drawn separately, or the effect is discarded along with the
// shortcut. The cells are resolved inside playGame from the team codes, so if
// they were applied to the baseline as well they would subtract out exactly.
⋮----
export function runSimulations(n: number, input: CoachSimInput): CoachProjection
⋮----
function pointLocation(input: CoachSimInput):
⋮----
function baselineWp(staffAggression: number): number
⋮----
interface DriveSample {
  margins: Float64Array;
  totals: Float64Array;
  wpSum: number;
  fourthDowns: number;
}
⋮----
function driveSample(
  input: CoachSimInput,
  n: number,
  homeStaff: number,
  awayStaff: number,
  metricsHome: BelichickMetricBundle | null,
  metricsAway: BelichickMetricBundle | null,
  applyCells: boolean,
): DriveSample
⋮----
interface GamePoints {
  home: number;
  away: number;
  wpSum: number;
  fourthDowns: number;
}
⋮----
function standardNormal(rand: () => number): number
⋮----
function scoreTouchdown(rand: () => number, score: (pts: number) => void): void
⋮----
function playGame(
  rand: () => number,
  passRate: number,
  homeStaff: number,
  awayStaff: number,
  metricsHome: BelichickMetricBundle | null,
  metricsAway: BelichickMetricBundle | null,
  homeTeam: string,
  awayTeam: string,
  applyCells: boolean,
): GamePoints
⋮----
// Shrunk 32-team trench/blitz cells, resolved once per game. These are
// OFFENSE-side tendencies (yards before contact, stuff rate, blitz EPA), so
// the team holding the ball reads its OWN cell — the opposite convention from
// the defensive metric bundle, which reads the opponent's table.
⋮----
const lead = ()
const score = (pts: number) =>
const give = () =>
⋮----
// Semantic inversion: the bundle describes the opponent's defensive and
// coverage tendencies, so the team now receiving the ball is read against
// the OTHER team's table (the unit that just punted/kicked to them).
⋮----
// Semantic inversion: instead of applying a team's own tables to its own
// offense, apply the OPPONENT's defensive tables to the offense being
// simulated. The bundle is defensive/coverage data (rush packages,
// coverage conversions, red-zone allowed), so the defense's table must
// describe the offense it is defending.
⋮----
// The trench/blitz cell is an OFFENSE-side tendency, so the team holding
// the ball reads its own cell. Gated to early downs (down <= 2) per the
// doctrine: these cells describe first/second-down tendencies and are not
// asserted to describe third/fourth-down play calling.
⋮----
// Blitz EPA cell: how a team's completion expectation moves when the
// defense pressures without getting home. Expressed on the drive's
// yardage scale via BLITZ_EPA_TO_YARDS. Applied only when the metric
// bundle reports a pressure package that did not convert to a sack.
⋮----
// Run branch: YBC cell shifts the base gain; behind-LOS cell shifts the
// probability the carry is stopped at or behind the line. Both gated to
// early downs. The stuffed branch takes 0 gain (the at/behind-LOS
// bucket's central value); the non-stuffed draw is renormalised so a
// league-average cell reproduces MEASURED_DRIVE.yardsPerCarry exactly.
⋮----
// Red-zone table present: replace the third-down conversion roll, not the
// whole down structure. Firing on down 1–2 bypassed first-down progression
// and rolled a per-play TD rate up to four times per trip, which inflated
// scoring for any team carrying a bundle — even one with an empty table.
⋮----
function bandHalfWidth(totals: Float64Array): number
⋮----
function mean(xs: Float64Array): number
⋮----
function quantile(xs: Float64Array, q: number): number
⋮----
function homeWinRate(margins: Float64Array): number
⋮----
/**
 * Trips-weighted sack rate across rush packages.
 *
 * Volume-aware: each package's sack rate is weighted by its snap count, so a
 * rare high-sack blitz cannot dominate a common four-man rush. The previous
 * top-package read took one package's rate regardless of how often it occurred.
 *
 * Why the aggregate uses `sackRate`, not `quickPressureRate`: quickPressureRate
 * is a CONDITIONAL rate whose denominator is only the quick snaps inside the
 * package. Multiplying it by the package's total snaps counts each quick sack
 * more than once. On the 14-snap fixture below it yields 4 sacks from 2 actual
 * sacks (0.2857 vs the measured 2/14 = 0.1429). Only `sackRate` x `snaps`
 * reproduces the measured sack count. Nothing here is invented: both fields
 * come straight from the evaluated metric bundle.
 */
export function aggregatePressure(
  packages: readonly { sackRate?: number; snaps?: number; quickPressureRate?: number }[],
):
⋮----
/**
 * Metric 2 — trips-weighted sack rate on a pass dropback.
 * Falls back to the pooled measured sack rate when no package is supplied.
 */
function quickPressureSackRate(metrics: BelichickMetricBundle | null): number
⋮----
// A zero aggregate means "no sacks across the sampled packages", which for a
// thin sample is noise, not a real zero. Keep the pooled rate as the floor so
// an absent/empty signal can never erase pressure.
⋮----
/**
 * Metric 4 — third-down conversion by coverage and distance bucket.
 *
 * Volume-weighted across every coverage row in the distance bucket. The table
 * is keyed `${coverage}|${bucket}`, and coverage is NOT a state in the drive
 * chain, so a single-row lookup cannot be coverage-specific — it can only be
 * whichever row the sort happened to put first. That is an accident, not a
 * model. On the plan fixture the sort puts `zone|1-3` (7 attempts, 0 converts)
 * first and the `man|1-3` row (5 attempts, 5 converts) is never read, which
 * reports a 0.000 short third-down conversion rate for a defense that actually
 * converted 5 of 12.
 *
 * Weighting by `attempts` reproduces the measured count: 5/12 ≈ 0.4167. It is
 * the same rule as the pressure aggregate — use the volume already measured.
 * Max would return 1.0 and treat a 5-attempt sample as the rate for every
 * short third down, discarding the 7 zone snaps that converted at zero.
 *
 * Falls back to the pooled 0.40 when no table is supplied or the bucket is
 * empty. No new state, no invented coverage model.
 */
function thirdDownConvProb(metrics: BelichickMetricBundle | null, dist: number): number
⋮----
/**
 * Metric 5 — red-zone TD rate by play type and zone.
 * `goal-to-go` fires at yardline >= 90, `red-zone` at >= 80.
 */
function redZoneTdRate(metrics: BelichickMetricBundle | null, playType: "run" | "pass", yl: number): number
⋮----
function seedFor(input: CoachSimInput, homeStaff: number): number
⋮----
function mulberry32(seed: number): () => number
```

## File: packages/prediction-engine/src/public-baseline/index.ts
```typescript

```
