/**
 * The GSE PRICE Method — the single typed source of truth for the methodology.
 *
 * The platform's intelligence is documented in two human-facing places: the system
 * compendium (docs/compendium/GSE_SYSTEM_COMPENDIUM.md) and the public /methodology
 * page. A paper drifts from the code the moment a weight changes and nobody updates
 * the prose. This module is the fix: it encodes the method — the five named pillars,
 * the thirteen score components with their exact ranges, and the flagship GSE Score
 * formula — as TYPED DATA the doc, the page, and the drift-guard test all read from.
 *
 * The numbers here are written as LITERALS that mirror what the doc prints, and each
 * is tagged with the `constants.ts` field it must equal. `gse-method-spec.test.ts`
 * asserts every literal equals the real constant, so the paper cannot silently go
 * stale: change a weight without updating the spec (and therefore the doc) and the
 * test fails. Proof-over-promises, applied to documentation itself.
 *
 * This module invents no math. It NAMES machinery that already runs in scoring.ts /
 * game-context.ts and points at it by file:line.
 */

import { WEIGHTS, GRADE_THRESHOLDS, MIN_PUBLISH_CONFIDENCE, PREMIUM_CONFIDENCE_THRESHOLD } from "./constants.js";

// ─────────────────────────────────────────────
// The five PRICE pillars
// ─────────────────────────────────────────────

export type PillarLetter = "P" | "R" | "I" | "C" | "E";
export type WireStatus =
  | "LIVE"      // priced into the published score today
  | "GATED"     // live, but behind an operational maturity flag
  | "PARTIAL"   // some sub-parts live, some R&D
  | "RND";      // built, surfaced or shadowed, NOT moving the score

export interface PricePillar {
  readonly letter: PillarLetter;
  readonly name: string;
  /** One jargon-free sentence — safe for customer copy. */
  readonly tagline: string;
  /** What it does, in a clause. */
  readonly what: string;
  /** Representative source files. */
  readonly files: readonly string[];
  readonly status: WireStatus;
}

/**
 * P-R-I-C-E: a memory hook for the five pillars (fitting for an odds/market product).
 * The runtime pipeline order is Read → Score(R+I+C+E) → Gate(P); PRICE is the mnemonic.
 * Every letter maps 1:1 to code that already runs — branding, not invented theory.
 */
export const PRICE_PILLARS: readonly PricePillar[] = [
  {
    letter: "P",
    name: "Proof",
    tagline: "Can we prove, after the fact, that we were right — without asking you to trust us?",
    what:
      "Closing-line-value grading, Wilson confidence intervals, isotonic calibration, tamper-evident per-pick receipts, pre-kickoff slate Merkle commitments, readiness gates, and the public-claim compiler.",
    files: [
      "clv.ts",
      "clv-capture.ts",
      "model-limitations.ts (wilsonInterval)",
      "probability-calibration.ts",
      "calibration-apply.ts",
      "pick-proof-receipt.ts",
      "slate-commitment.ts",
      "proof-of-record.ts",
      "readiness.ts",
      "apps/web/lib/claims/public-claim-compiler.ts",
    ],
    status: "LIVE",
  },
  {
    letter: "R",
    name: "Read",
    tagline: "What does the market actually believe, once the bookmaker's cut is removed?",
    what:
      "De-vig via Shin's method, a MEDIAN consensus across books, and the Market Gravity Index (conviction × quality).",
    files: ["shin-devig.ts", "market-read.ts", "scoring.ts:185-219 (consensus)"],
    status: "LIVE",
  },
  {
    letter: "I",
    name: "Integrity",
    tagline: "Is the data good enough — fresh, broad, and trustworthy — to act on at all?",
    what:
      "A data-quality score (coverage + freshness + market breadth) applied as a penalty, plus the bootstrap → canonical gating that keeps unproven history out of the math.",
    files: ["game-context.ts:260-307 (computeDataQuality)", "platform-config.ts", "readiness.ts"],
    status: "LIVE",
  },
  {
    letter: "C",
    name: "Context",
    tagline: "What real situational signals reinforce or undercut the read?",
    what:
      "Line movement, rest / back-to-back, ATS form, head-to-head, venue form, cross-market agreement, schedule stress, and an uncertainty penalty for conflicting signals.",
    files: ["game-context.ts:58-245"],
    status: "PARTIAL", // ATS / H2H / venue form gated by DERIVED_MODEL_HISTORY_ENABLED
  },
  {
    letter: "E",
    name: "Edge",
    tagline: "How much pricing advantage is genuinely on the table?",
    what:
      "Fair probability minus offered probability, normalized to the public Edge Index (0-100). An independent Edge Engine (Kalshi / Elo / Poisson / ML estimators) is surfaced but priced=false — it does not move the score yet.",
    files: ["scoring.ts:248-301 (edge)", "scoring.ts:54-79 (toEdgeIndex)", "edge-engine.ts (weight 0)"],
    status: "PARTIAL", // book-derived edge LIVE; independent estimators R&D
  },
];

// ─────────────────────────────────────────────
// The thirteen score components (the confidence sum)
// ─────────────────────────────────────────────

export interface ScoreComponentSpec {
  readonly key: string;
  readonly label: string;
  readonly pillar: PillarLetter;
  readonly min: number;
  readonly max: number;
  /** WEIGHTS.* field the `max` must equal (when a constant pins it). */
  readonly maxConst?: keyof typeof WEIGHTS;
  /** WEIGHTS.* field the `min` must equal (when a constant pins it). */
  readonly minConst?: keyof typeof WEIGHTS;
  /** True when the component is symmetric (±maxConst): min must equal −max. */
  readonly symmetric?: boolean;
  readonly source: string;
  readonly status: WireStatus;
}

/**
 * The components summed (plus GSE_BASELINE, then clamped 0-100) to produce the live
 * confidence — see scoring.ts:456-464. Order matches the source. Every `*Const`
 * literal is asserted equal to the real WEIGHTS field by the drift-guard test.
 */
export const SCORE_COMPONENTS: readonly ScoreComponentSpec[] = [
  { key: "consensusScore",      label: "Market consensus",       pillar: "R", min: 0,   max: 30,  maxConst: "CONSENSUS_COMPONENT_MAX",     source: "scoring.ts:185-219",     status: "LIVE" },
  { key: "marketDepthScore",    label: "Market depth",           pillar: "R", min: 0,   max: 20,  maxConst: "MARKET_DEPTH_COMPONENT_MAX",  source: "scoring.ts:225-242",     status: "LIVE" },
  { key: "edgeComponentScore",  label: "Edge (pricing advantage)", pillar: "E", min: 0, max: 25,  maxConst: "EDGE_COMPONENT_MAX",          source: "scoring.ts:248-301",     status: "LIVE" },
  { key: "volatilityPenalty",   label: "Volatility penalty",     pillar: "I", min: -15, max: 0,   minConst: "VOLATILITY_PENALTY_MAX",      source: "scoring.ts:307-343",     status: "LIVE" },
  { key: "lineMovementScore",   label: "Line movement",          pillar: "C", min: -15, max: 15,  maxConst: "LINE_MOVEMENT_COMPONENT_MAX", symmetric: true, source: "game-context.ts:58-118", status: "LIVE" },
  { key: "restAdvantageScore",  label: "Rest advantage",         pillar: "C", min: -10, max: 10,  source: "game-context.ts:129-180", status: "LIVE" },
  { key: "historicalFormScore", label: "ATS form",               pillar: "C", min: -10, max: 10,  source: "game-context.ts:191-245", status: "GATED" },
  { key: "dataQualityPenalty",  label: "Data-quality penalty",   pillar: "I", min: -20, max: 0,   source: "game-context.ts:260-307 → scoring.ts", status: "LIVE" },
  { key: "headToHeadScore",     label: "Head-to-head",           pillar: "C", min: -5,  max: 5,   maxConst: "HEAD_TO_HEAD_COMPONENT_MAX",  symmetric: true, source: "game-context.ts", status: "GATED" },
  { key: "venueFormScore",      label: "Venue form",             pillar: "C", min: -5,  max: 5,   maxConst: "VENUE_FORM_COMPONENT_MAX",    symmetric: true, source: "game-context.ts", status: "GATED" },
  { key: "uncertaintyPenalty",  label: "Uncertainty penalty",    pillar: "I", min: -8,  max: 0,   minConst: "UNCERTAINTY_PENALTY_MAX",     source: "game-context.ts", status: "LIVE" },
  { key: "crossMarketScore",    label: "Cross-market agreement", pillar: "E", min: -3,  max: 4,   maxConst: "CROSS_MARKET_AGREE_BONUS",    minConst: "CROSS_MARKET_DISAGREE_PENALTY", source: "game-context.ts", status: "LIVE" },
  { key: "scheduleStressScore", label: "Schedule stress",        pillar: "C", min: -5,  max: 5,   maxConst: "SCHEDULE_STRESS_COMPONENT_MAX", symmetric: true, source: "game-context.ts", status: "LIVE" },
];

/** The fixed baseline added before clamping — a literal in scoring.ts:461. */
export const GSE_BASELINE = 10;

// ─────────────────────────────────────────────
// The flagship GSE Score formula (provenance-haircut over confidence)
// ─────────────────────────────────────────────

/** Bumped when the GSE Score formula changes (independent of MODEL_VERSION). */
export const GSE_SCORE_VERSION = "g1.0.0";

/**
 * The GSE Score = round(confidence × M), where M is a provenance multiplier in
 * [floor, floor+range] = [0.80, 1.00]. M = floor + range · P, and P (0..1) is how
 * provably we can stand behind the pick — the ONE dimension the additive confidence
 * sum does not already contain. The weights below sum to 1.0 (P is capped at 1.0).
 */
export const GSE_SCORE_FORMULA = {
  version: GSE_SCORE_VERSION,
  baseline: GSE_BASELINE,
  multiplierFloor: 0.8,
  multiplierRange: 0.2,
  provenanceWeights: {
    /** A tamper-evident PickProofReceipt was frozen at publish (before kickoff). */
    proofReceipt: 0.34,
    /** The pick is included under a published pre-kickoff slate Merkle root. */
    slateCommitment: 0.33,
    /** The pick is canonical (not bootstrap) AND its odds were within the freshness SLA. */
    canonicalAndFresh: 0.33,
  },
  /** Confidence floor to publish at all, and the PREMIUM floor — mirrors constants.ts. */
  publishFloor: MIN_PUBLISH_CONFIDENCE,
  premiumFloor: PREMIUM_CONFIDENCE_THRESHOLD,
} as const;

// ─────────────────────────────────────────────
// Grade thresholds (mirrored for the doc; asserted == GRADE_THRESHOLDS)
// ─────────────────────────────────────────────

export interface GradeThresholdSpec {
  readonly grade: "ELITE_PLAY" | "STRONG_PLAY" | "SOLID_PLAY";
  readonly confidence: number;
  readonly edge: number;
}

export const GRADE_LADDER: readonly GradeThresholdSpec[] = [
  { grade: "ELITE_PLAY",  confidence: GRADE_THRESHOLDS.ELITE_PLAY.confidence,  edge: GRADE_THRESHOLDS.ELITE_PLAY.edge },
  { grade: "STRONG_PLAY", confidence: GRADE_THRESHOLDS.STRONG_PLAY.confidence, edge: GRADE_THRESHOLDS.STRONG_PLAY.edge },
  { grade: "SOLID_PLAY",  confidence: GRADE_THRESHOLDS.SOLID_PLAY.confidence,  edge: GRADE_THRESHOLDS.SOLID_PLAY.edge },
];

// ─────────────────────────────────────────────
// Live-now vs. roadmap registry (the honesty ledger)
// ─────────────────────────────────────────────

export type CapabilityStatus =
  | "PRICED"            // moves the published score today
  | "SURFACED_UNPRICED" // shown/persisted but weight 0
  | "RND_BLOCKED"       // built, blocked on a missing source / gate
  | "BUILT_NOT_WIRED"   // code complete, deliberately not activated
  | "PLANNED";          // described, not yet built

export interface CapabilityRow {
  readonly name: string;
  readonly status: CapabilityStatus;
  readonly detail: string;
  readonly source?: string;
}

/**
 * The consolidated, honest separation between what scores today and what does not.
 * Consumed by the compendium's §12 and the /methodology "Live-now vs. Roadmap" band.
 */
export const LIVE_VS_ROADMAP: readonly CapabilityRow[] = [
  { name: "Market consensus, depth, book-edge, line movement, rest, schedule, cross-market, uncertainty", status: "PRICED", detail: "Summed into the published confidence today.", source: "scoring.ts:456-464" },
  { name: "ATS form, head-to-head, venue form", status: "PRICED", detail: "Live once DERIVED_MODEL_HISTORY_ENABLED is on; gated until canonical history exists.", source: "game-context.ts" },
  { name: "Independent Edge Engine (Kalshi exchange)", status: "SURFACED_UNPRICED", detail: "Compared to the book's fair value and shown in the glass box; weight 0 (priced=false) until a founder-gated MODEL_VERSION step.", source: "edge-engine.ts" },
  { name: "Probability calibration (isotonic / Brier / ECE)", status: "BUILT_NOT_WIRED", detail: "Activates only at sample ≥100 with non-worsening ECE; until then confidence stays a heuristic, never shown as a win probability.", source: "calibration-apply.ts" },
  { name: "Poisson independent estimator", status: "RND_BLOCKED", detail: "Refuses to run without real team scoring rates (no fabricated λ).", source: "poisson.ts / team-rates.ts" },
  { name: "Elo / ML independent estimators", status: "RND_BLOCKED", detail: "Measurement and scaffold only; not fed into the edge engine until calibration proves them.", source: "elo-backtest.ts / ml-estimator.ts" },
  { name: "Public performance & CLV stats", status: "BUILT_NOT_WIRED", detail: "Gated by PERFORMANCE_STATS_ENABLED + a settled-sample floor; bootstrap picks excluded so nothing is cherry-picked.", source: "readiness.ts / public-claim-compiler.ts" },
  { name: "Affiliate payout ledger", status: "BUILT_NOT_WIRED", detail: "Double-entry accounting complete and tested; activation (Prisma + UI) is a deliberate later step.", source: "apps/web/lib/affiliate/ledger.ts" },
  { name: "Real-time email & push alerts (Elite)", status: "PLANNED", detail: "Described in the tier matrix; delivery not yet implemented.", source: "—" },
  { name: "Content auto-publish", status: "BUILT_NOT_WIRED", detail: "Draft composition + gates exist; the worker ships with a hard kill switch ON (manual approval only).", source: "workers/content-publishing" },
];

export interface MethodSpec {
  readonly method: string;
  readonly pipeline: readonly string[];
  readonly pillars: readonly PricePillar[];
  readonly components: readonly ScoreComponentSpec[];
  readonly baseline: number;
  readonly score: typeof GSE_SCORE_FORMULA;
  readonly grades: readonly GradeThresholdSpec[];
  readonly roadmap: readonly CapabilityRow[];
}

/** The whole method, as one object the doc / page / tests read from. */
export const GSE_METHOD: MethodSpec = {
  method: "The GSE PRICE Method",
  pipeline: ["Read the board", "Score the math", "Gate the slate"],
  pillars: PRICE_PILLARS,
  components: SCORE_COMPONENTS,
  baseline: GSE_BASELINE,
  score: GSE_SCORE_FORMULA,
  grades: GRADE_LADDER,
  roadmap: LIVE_VS_ROADMAP,
};
