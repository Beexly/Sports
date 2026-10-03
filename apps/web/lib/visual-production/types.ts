/**
 * Visual Production — types for the governed Higgsfield/visual-asset pipeline.
 *
 * Doctrine: "Generate atmosphere. Render truth." AI-generated media may create
 * cinematic atmosphere, metaphor, and mood. It must NEVER contain fake odds,
 * fake live labels, readable claims, sportsbook/casino imagery, real team/league
 * logos, player likenesses, or hype. Final truth (claims, stats, labels,
 * disclosures) is always app-rendered on top. Generation is BLOCKED by default
 * and requires explicit owner spend approval.
 *
 * Pure types — no network, no spend.
 */

export type VisualProvider = "code-native" | "higgsfield" | "stock" | "other";
export type VisualMediaKind = "still" | "motion";

/** Where the asset is in its lifecycle. Nothing is generated without approval. */
export type VisualAssetStatus =
  | "planned" // designed only — prompt + plan exist, nothing generated
  | "owner_review" // awaiting owner decision to spend
  | "approved" // owner approved spend; ready to generate when enabled
  | "generated" // produced; awaiting compliance/overlay review
  | "published" // live on a surface with app-rendered truth overlay
  | "rejected"; // failed review — never ships

/** Priority bands (spec): what level of production each score unlocks. */
export type ProductionBand =
  | "code_native_only" // 0–59: build it in CSS/WebGL, do not generate
  | "cheap_stillframes" // 60–74
  | "cheap_motion_test" // 75–84
  | "higgsfield_final_candidate" // 85–94
  | "premium_campaign_candidate"; // 95–100

export interface VisualApprovalStates {
  readonly productTruthVerified: boolean;
  readonly complianceReviewed: boolean;
  readonly rightsReviewed: boolean;
  readonly overlayPlanned: boolean;
  readonly reducedMotionPlanned: boolean;
  readonly ownerSpendApproved: boolean;
}

export interface VisualAsset {
  readonly id: string;
  readonly surface: string; // route/component it serves, e.g. "/" hero
  readonly title: string;
  /** The product truth this atmosphere supports (never invented). */
  readonly productTruth: string;
  /** The visual metaphor — mood only, no claims. */
  readonly metaphor: string;
  readonly mediaKind: VisualMediaKind;
  readonly provider: VisualProvider;
  /** Generation prompt (atmosphere/metaphor only). */
  readonly prompt: string;
  /** Negative prompt — the bans, always present. */
  readonly negativePrompt: string;
  /** What the APP renders on top (the truth layer). */
  readonly overlayPlan: string;
  readonly complianceNotes: string;
  readonly rightsNotes: string;
  /** Static/CSS equivalent that preserves meaning for reduced-motion + LCP. */
  readonly reducedMotionFallback: string;
  readonly mobileCropPlan: string;
  /** How many surfaces/uses this asset will serve (reuse gate needs >= 4). */
  readonly plannedReuseCount: number;
  readonly reusePlan: string;
  /** Provenance/labeling plan (how we mark it AI-generated atmosphere). */
  readonly provenancePlan: string;
  /** 0–100 worthiness score driving the production band. */
  readonly priorityScore: number;
  readonly status: VisualAssetStatus;
  readonly approvals: VisualApprovalStates;
}

/** Negative-prompt floor every asset must include (the hard bans). */
export const NEGATIVE_PROMPT_FLOOR =
  "no text, no words, no numbers, no odds, no betting slips, no sportsbook or casino imagery, " +
  "no real team logos, no league logos, no player likenesses, no broadcast footage, no jerseys with " +
  "real marks, no fire, money-bag, or hype symbols, no UI, no watermarks, no captions";
