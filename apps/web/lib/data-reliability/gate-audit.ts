/**
 * Readiness Gate Audit loader (B2).
 *
 * Pure READ of the live readiness gates + the real DB counts that decide
 * whether a gate "qualifies" yet. Powers the cockpit /cockpit/gates surface.
 *
 * HONESTY CONTRACT:
 *   - This module FLIPS NOTHING. Env-driven gates are owner-only; this only
 *     reports their current state and a recommendation.
 *   - No fabricated counts. Counts come from real loaders; when a signal isn't
 *     wired we surface it as "unknown" rather than zero (a DB error degrades to
 *     null, shown as "unknown", never a fake green).
 *   - Founder-gated gates (calibration / derived-model history) are marked
 *     distinctly from simple env-flip gates: they require a MODEL_VERSION bump
 *     + audit trail, not just an env change.
 */

import { db } from "@sports/db";
import { getReadinessGates } from "@sports/prediction-engine";

/** How a gate is unlocked operationally. */
export type GateKind = "env-flip" | "founder-gated";

/** Recommendation verdict for the audit table. */
export type GateRecommendation =
  | "qualifies"
  | "blocked"
  | "founder-gated"
  | "unknown";

export interface GateAuditRow {
  /** Stable id for keys. */
  readonly id: string;
  /** Human gate name (matches the env var family). */
  readonly name: string;
  /** The env var that drives the gate (or the readiness field for derived ones). */
  readonly envVar: string;
  /** Plain-English requirement the gate represents. */
  readonly requirement: string;
  /** Current live satisfaction — flag state and/or count, in plain English. */
  readonly currentState: string;
  /** Whether the underlying flag is currently ON. */
  readonly enabled: boolean;
  /** env-flip vs founder-gated (calibration / model). */
  readonly kind: GateKind;
  /** Verdict. */
  readonly recommendation: GateRecommendation;
  /** One-line recommendation text for the operator. */
  readonly recommendationText: string;
}

export interface GateAuditReport {
  readonly generatedAt: string;
  readonly rows: readonly GateAuditRow[];
  /** Real counts read for the audit (null = unknown / not wired). */
  readonly counts: {
    readonly canonicalSettled: number | null;
    readonly learningEligibleSettled: number | null;
    readonly minSettledForLearning: number;
  };
}

/** Count canonical (non-bootstrap), settled, published picks — the public record spine. */
async function countCanonicalSettled(): Promise<number | null> {
  return db.pick
    .count({
      where: {
        result: { in: ["WIN", "LOSS", "PUSH", "VOID"] },
        isPublished: true,
        isBootstrap: false,
        NOT: { modelVersion: "v5.0.0-seed" },
      },
    })
    .catch(() => null);
}

/** Count settled snapshots already marked eligibleForLearning — the calibration spine. */
async function countLearningEligible(): Promise<number | null> {
  return db.pick
    .count({
      where: {
        result: { in: ["WIN", "LOSS", "PUSH", "VOID"] },
        isBootstrap: false,
        signalSnapshot: { is: { eligibleForLearning: true } },
      },
    })
    .catch(() => null);
}

function onOff(enabled: boolean): string {
  return enabled ? "ENABLED" : "disabled";
}

/**
 * Build the full gate-audit report. Reads live gates + real counts; never
 * mutates any flag.
 */
export async function loadGateAudit(now: Date = new Date()): Promise<GateAuditReport> {
  const gates = getReadinessGates();
  const [canonicalSettled, learningEligibleSettled] = await Promise.all([
    countCanonicalSettled(),
    countLearningEligible(),
  ]);
  const minSettledForLearning = gates.minSettledPicksForLearning;

  const rows: GateAuditRow[] = [];

  // ── PUBLIC_PICKS_ENABLED ──────────────────────────────────────────────────
  rows.push({
    id: "public-picks",
    name: "PUBLIC_PICKS_ENABLED",
    envVar: "PUBLIC_PICKS_ENABLED",
    requirement:
      "Expose /api/picks + daily slate to the public. Requires data-quality, " +
      "safety, and public-claim gates to pass first.",
    currentState: `${onOff(gates.canExposePublicPicks)} (env flag)`,
    enabled: gates.canExposePublicPicks,
    kind: "env-flip",
    recommendation: gates.canExposePublicPicks ? "qualifies" : "blocked",
    recommendationText: gates.canExposePublicPicks
      ? "Already enabled."
      : "Owner gate. Confirm freshness kill-switch + public-claim review, then owner may flip.",
  });

  // ── CANONICAL_HISTORY_ENABLED ─────────────────────────────────────────────
  rows.push({
    id: "canonical-history",
    name: "CANONICAL_HISTORY_ENABLED",
    envVar: "CANONICAL_HISTORY_ENABLED",
    requirement:
      "Mark new picks/game-logs as canonical (not isBootstrap). Enable only " +
      "after verifying ingestion quality and opening-line accuracy.",
    currentState:
      `${onOff(gates.canPersistCanonicalHistory)} (env flag) · ` +
      (canonicalSettled == null
        ? "canonical settled: unknown (count unavailable)"
        : `canonical settled picks: ${canonicalSettled}`),
    enabled: gates.canPersistCanonicalHistory,
    kind: "env-flip",
    recommendation: gates.canPersistCanonicalHistory ? "qualifies" : "blocked",
    recommendationText: gates.canPersistCanonicalHistory
      ? "Already enabled — new picks accrue to canonical history."
      : "Owner may flip after confirming ingestion + opening-line accuracy.",
  });

  // ── DERIVED_MODEL_HISTORY_ENABLED (founder-gated) ─────────────────────────
  {
    const target = 50; // 50+ settled games/sport per platform-config phase 3
    const haveCanonical = canonicalSettled;
    const qualifies = gates.canUseDerivedHistory;
    rows.push({
      id: "derived-history",
      name: "DERIVED_MODEL_HISTORY_ENABLED",
      envVar: "DERIVED_MODEL_HISTORY_ENABLED",
      requirement:
        "Feed ATS/H2H/venue form into scoring. Requires CANONICAL_HISTORY_ENABLED " +
        "and ~50+ canonical settled games per sport — it changes what the model scores on.",
      currentState:
        `${onOff(gates.canUseDerivedHistory)} (env flag) · ` +
        (haveCanonical == null
          ? "canonical settled: unknown"
          : `canonical settled picks: ${haveCanonical}`),
      enabled: gates.canUseDerivedHistory,
      kind: "founder-gated",
      recommendation: qualifies
        ? "qualifies"
        : haveCanonical == null
          ? "unknown"
          : "founder-gated",
      recommendationText: qualifies
        ? "Already enabled — canonical form feeds scoring."
        : haveCanonical == null
          ? "Canonical settled count unavailable — resolve count before judging."
          : `Founder-gated: changes model inputs. Needs CANONICAL_HISTORY on + ~${target}+ canonical settled/sport (have ${haveCanonical} total) before owner activation.`,
    });
  }

  // ── PERFORMANCE_STATS_ENABLED ─────────────────────────────────────────────
  rows.push({
    id: "performance-stats",
    name: "PERFORMANCE_STATS_ENABLED",
    envVar: "PERFORMANCE_STATS_ENABLED",
    requirement:
      "Expose /api/performance publicly. Blocks bootstrap-era win rates from " +
      "appearing as production metrics.",
    currentState:
      `${onOff(gates.canExposePerformanceStats)} (env flag) · ` +
      (canonicalSettled == null
        ? "canonical settled: unknown"
        : `canonical settled picks: ${canonicalSettled}`),
    enabled: gates.canExposePerformanceStats,
    kind: "env-flip",
    recommendation: gates.canExposePerformanceStats ? "qualifies" : "blocked",
    recommendationText: gates.canExposePerformanceStats
      ? "Already enabled."
      : "Owner may flip once a representative canonical sample exists (don't expose bootstrap rates).",
  });

  // ── FEATURED_PICK_PROMOTION_ENABLED ───────────────────────────────────────
  rows.push({
    id: "featured-promotion",
    name: "FEATURED_PICK_PROMOTION_ENABLED",
    envVar: "FEATURED_PICK_PROMOTION_ENABLED",
    requirement:
      "Allow isFeatured=true on new picks (prominent UI placement). Enable only " +
      "after grade thresholds are calibrated against real historical win rates.",
    currentState: `${onOff(gates.canPromoteFeaturedPicks)} (env flag)`,
    enabled: gates.canPromoteFeaturedPicks,
    kind: "env-flip",
    recommendation: gates.canPromoteFeaturedPicks ? "qualifies" : "blocked",
    recommendationText: gates.canPromoteFeaturedPicks
      ? "Already enabled."
      : "Owner may flip after grade thresholds are calibrated vs real win-rate data.",
  });

  // ── OUTCOME_LEARNING_ENABLED ──────────────────────────────────────────────
  {
    const haveCanonical = canonicalSettled;
    const qualifiesByCount =
      haveCanonical != null && haveCanonical >= minSettledForLearning;
    rows.push({
      id: "outcome-learning",
      name: "OUTCOME_LEARNING_ENABLED",
      envVar: "OUTCOME_LEARNING_ENABLED",
      requirement:
        `Mark settled canonical snapshots eligibleForLearning (data collection only — ` +
        `does NOT change scoring). Needs ≥${minSettledForLearning} canonical settled picks.`,
      currentState:
        `${onOff(gates.canLearnFromOutcomes)} (env flag) · ` +
        (haveCanonical == null
          ? "canonical settled: unknown"
          : `canonical settled: ${haveCanonical} / ${minSettledForLearning} needed`) +
        " · " +
        (learningEligibleSettled == null
          ? "already-eligible: unknown"
          : `already-eligible snapshots: ${learningEligibleSettled}`),
      enabled: gates.canLearnFromOutcomes,
      kind: "env-flip",
      recommendation: gates.canLearnFromOutcomes
        ? "qualifies"
        : haveCanonical == null
          ? "unknown"
          : qualifiesByCount
            ? "qualifies"
            : "blocked",
      recommendationText: gates.canLearnFromOutcomes
        ? "Already enabled — settled canonical snapshots are flagged for learning."
        : haveCanonical == null
          ? "Canonical settled count unavailable — resolve before judging."
          : qualifiesByCount
            ? "Qualifies — owner may flip (data collection only; scoring unchanged)."
            : `Blocked: needs ${minSettledForLearning - haveCanonical} more canonical settled picks.`,
    });
  }

  // ── CALIBRATION_ADJUSTMENTS_ENABLED (founder-gated) ───────────────────────
  {
    const haveEligible = learningEligibleSettled;
    const countOk = haveEligible != null && haveEligible >= 100;
    rows.push({
      id: "calibration-adjustments",
      name: "CALIBRATION_ADJUSTMENTS_ENABLED",
      envVar: "CALIBRATION_ADJUSTMENTS_ENABLED",
      requirement:
        "Wire the isotonic calibrator into confidence + the public reliability " +
        "diagram (confidence becomes calibrated win probability). Requires the " +
        "audited MODEL_VERSION sequence: ≥100 learning-eligible picks, held-out " +
        "calibratedEce ≤ rawEce, MODEL_VERSION bump + CalibrationProposal audit entry.",
      currentState:
        `${onOff(gates.canApplyCalibrationAdjustments)} (env flag) · ` +
        (haveEligible == null
          ? "learning-eligible: unknown"
          : `learning-eligible picks: ${haveEligible} / 100 needed`),
      enabled: gates.canApplyCalibrationAdjustments,
      kind: "founder-gated",
      recommendation: gates.canApplyCalibrationAdjustments
        ? "qualifies"
        : "founder-gated",
      recommendationText: gates.canApplyCalibrationAdjustments
        ? "Already enabled (audited activation sequence presumed complete)."
        : countOk
          ? "Founder-gated: count met, but still requires MODEL_VERSION bump + held-out ECE validation + CalibrationProposal audit before owner flip."
          : haveEligible == null
            ? "Founder-gated: requires MODEL_VERSION bump + audit. Learning-eligible count unavailable."
            : `Founder-gated: requires MODEL_VERSION bump + audit. Needs ${100 - haveEligible} more learning-eligible picks before the sequence can even begin.`,
    });
  }

  // ── PUBLIC_BLOG_ENABLED ───────────────────────────────────────────────────
  rows.push({
    id: "public-blog",
    name: "PUBLIC_BLOG_ENABLED",
    envVar: "PUBLIC_BLOG_ENABLED",
    requirement:
      "Let the content-publishing worker generate posts. When off, generation is " +
      "skipped entirely. Enable only once there is a representative public record to write about.",
    currentState: `${onOff(gates.canPublishContent)} (env flag)`,
    enabled: gates.canPublishContent,
    kind: "env-flip",
    recommendation: gates.canPublishContent ? "qualifies" : "blocked",
    recommendationText: gates.canPublishContent
      ? "Already enabled — content worker generates posts."
      : "Owner may flip once there is a representative canonical record worth publishing about.",
  });

  // ── FORCE_NO_BET_IF_STALE ─────────────────────────────────────────────────
  rows.push({
    id: "force-no-bet-if-stale",
    name: "FORCE_NO_BET_IF_STALE",
    envVar: "FORCE_NO_BET_IF_STALE",
    requirement:
      "Stale-data kill switch: auto-suppress the public picks surface when the " +
      "latest successful ingestion is stale (240m SLA). Lets PUBLIC_PICKS be lifted safely.",
    currentState: `${onOff(gates.forceNoBetIfStale)} (env flag)`,
    enabled: gates.forceNoBetIfStale,
    kind: "env-flip",
    recommendation: gates.forceNoBetIfStale ? "qualifies" : "blocked",
    recommendationText: gates.forceNoBetIfStale
      ? "Already enabled — public surface suppresses on stale data."
      : "Owner may flip to harden the public surface against stale slates (recommended before PUBLIC_PICKS).",
  });

  return {
    generatedAt: now.toISOString(),
    rows,
    counts: {
      canonicalSettled,
      learningEligibleSettled,
      minSettledForLearning,
    },
  };
}
