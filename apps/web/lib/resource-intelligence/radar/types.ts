/**
 * R&D Radar — types (Resource Intelligence 2.0).
 *
 * The radar turns founder-verified innovation snapshots (GitHub trending
 * windows + targeted references) into governed Adoption Dossiers. It extends
 * the existing resource-intelligence vocabulary — dispositions, risk posture,
 * gated-leak isolation — rather than inventing a parallel one.
 *
 * Non-negotiables encoded here and in policy.ts:
 *   - Scores are advisory. A blocked security/license/rights condition
 *     overrides any score.
 *   - There is no install path. The most actionable outcome is a governed
 *     prototype-behind-a-flag recommendation; approval always stays with
 *     the owner.
 *   - Quarantine and owner-review items surface as counts and dossiers,
 *     never as implement-now work.
 *   - Same input → same output. No network, no clocks, no randomness.
 */

import type { ResourceDisposition } from "../types";

// ─── Observation (one repo seen in one window) ────────────────────────────────

export type RadarWindow = "daily" | "weekly" | "monthly" | "targeted";

/** Normalized adoption posture — free-text CSV postures reduce to these. */
export type RadarPosture =
  | "OBSERVE"
  | "REFERENCE_ONLY"
  | "ADOPT_PATTERNS"
  | "PROTOTYPE"
  | "PILOT"
  | "OWNER_REVIEW"
  | "QUARANTINE"
  | "REJECT";

export type RadarRisk = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | "BLOCKED";

export type RadarSourceKind =
  | "GITHUB_TRENDING"
  | "PRIMARY_REPO"
  | "OWNER_SCREENSHOT"
  | "MANUAL";

export interface RepoRadarObservation {
  /** Stable id: `${window}:${normalizedRepository}`. */
  readonly id: string;
  readonly window: RadarWindow;
  /** Raw repository string as observed (preserved verbatim). */
  readonly repository: string;
  /** Deterministic identity: lowercased owner/name, or `concept:<slug>`. */
  readonly normalizedRepository: string;
  /** Snapshot date (YYYY-MM-DD). Observations never carry invented times. */
  readonly observedAt: string;
  /** null = unknown at snapshot time. Never invented. */
  readonly totalStars: number | null;
  readonly trendGain: number | null;
  readonly language: string | null;
  /** SPDX-ish string, "VERIFY" (unconfirmed), or null (unknown). */
  readonly license: string | null;
  readonly category: string;
  /** Why this matters to GSE — analyst note, labeled as a claim. */
  readonly gseMapping: string;
  /** Raw posture text from the research packet (preserved). */
  readonly proposedPosture: string;
  readonly normalizedPosture: RadarPosture;
  readonly risk: RadarRisk;
  /** Analyst rationale — labeled as a claim, not an observed fact. */
  readonly reason: string;
  readonly sourceKind: RadarSourceKind;
}

export interface RadarSnapshot {
  readonly schemaVersion: 1;
  readonly observedAt: string;
  readonly sourceFile: string;
  readonly sourceSha256: string;
  readonly observationCount: number;
  readonly observations: readonly RepoRadarObservation[];
}

// ─── Scoring (advisory only) ──────────────────────────────────────────────────

/** Eleven dimensions, each 0–5. Deterministic from the observation alone. */
export interface RadarScore {
  readonly strategicFit: number;
  readonly novelty: number;
  readonly momentum: number;
  readonly maturity: number;
  readonly maintenance: number;
  readonly security: number;
  readonly licenseClarity: number;
  readonly rightsPrivacyFit: number;
  readonly integrationCost: number;
  readonly reversibility: number;
  readonly evidenceQuality: number;
  /** Sum of the above (0–55). ADVISORY — never overrides a block. */
  readonly total: number;
  /** True when a blocked condition makes the total meaningless. */
  readonly blockedOverride: boolean;
}

// ─── Dossier (one per normalized repository) ──────────────────────────────────

/**
 * Facts vs claims: numbers observed from the trending snapshot are facts
 * (about popularity only); everything a repository says about itself, and
 * every analyst mapping, is a claim until GSE reproduces it.
 */
export interface AdoptionDossier {
  readonly normalizedRepository: string;
  readonly displayName: string;
  readonly windows: readonly RadarWindow[];
  readonly observations: readonly RepoRadarObservation[];
  /** Most restrictive normalized posture across observations. */
  readonly posture: RadarPosture;
  /** Highest risk across observations. */
  readonly risk: RadarRisk;
  readonly license: string | null;
  /** True when the license is unknown or unverified ("VERIFY"/null). */
  readonly licenseUnverified: boolean;
  /**
   * The existing resource-intelligence disposition this dossier maps to,
   * AFTER policy caps (blocked → quarantine; critical → owner review;
   * unverified license can never be implementable).
   */
  readonly effectiveDisposition: ResourceDisposition;
  /** Why this is relevant to GSE (labeled claim). */
  readonly whyRelevant: string;
  /** Why it is NOT ready to adopt today (policy output, always non-empty). */
  readonly whyNotReady: readonly string[];
  readonly score: RadarScore;
  /** True once the newest observation is older than the freshness horizon. */
  readonly stale: boolean;
  readonly sourceKinds: readonly RadarSourceKind[];
}

// ─── Feed (what the cockpit surface reads) ────────────────────────────────────

export interface RadarFeed {
  readonly snapshotDate: string;
  readonly sourceSha256: string;
  readonly totalObservations: number;
  readonly totalDossiers: number;
  readonly byWindow: Readonly<Record<RadarWindow, number>>;
  readonly byPosture: Readonly<Record<RadarPosture, number>>;
  /** Gated items surface as COUNTS only — never as actionable lists. */
  readonly gatedCounts: { readonly ownerReview: number; readonly quarantine: number };
  /**
   * Pattern-mining and prototype candidates that survived every policy cap.
   * By construction contains no quarantine/owner-review item. Contains no
   * install action — each entry names the experiment, not a dependency.
   */
  readonly recommendedExperiments: readonly {
    readonly normalizedRepository: string;
    readonly displayName: string;
    readonly posture: RadarPosture;
    readonly experiment: string;
    readonly scoreTotal: number;
  }[];
  readonly staleDossiers: readonly string[];
  /** All dossiers, most actionable first (for the read-only table). */
  readonly dossiers: readonly AdoptionDossier[];
}
