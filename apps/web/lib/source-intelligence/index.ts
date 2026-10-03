/**
 * Source Intelligence Layer (Phase 5)
 *
 * Every publish-ready artifact (pick, promotion, content draft, daily brief)
 * must declare which sources back it. This module is the single source of
 * truth for:
 *
 *   - SourceCategory       — the categories of evidence we track
 *   - SourceFreshness      — TTL classification
 *   - SourceEvidence       — typed shape of an individual evidence record
 *   - SourceCoverageReport — the aggregate computed for an artifact
 *   - PublishReadiness     — the readiness verdict
 *
 * Design choices:
 *   - Pure functions. The module never reads the DB directly; callers pass
 *     in evidence they have already loaded. This keeps the module testable
 *     without a database and avoids surprising network calls.
 *   - No automatic mutation. Reports are computed on demand. The
 *     `SourceCoverageReport` Prisma model exists as an audit log so we can
 *     reconstruct why a publishing decision was made, but the live decision
 *     always recomputes from current evidence.
 *   - Categories carry both a *soft* and a *hard* TTL. Aging evidence yields
 *     a HOLD; stale evidence is treated as missing.
 *
 * Relationship to the other two source-scoring modules (deliberately NOT
 * merged — each answers a different question):
 *   - This module: per-ARTIFACT freshness/coverage gate over ephemeral
 *     evidence lists; no persistence.
 *   - lib/data-sources/source-confidence.ts — per-SOURCE-TYPE static/structural
 *     trust (rights + wiring + cost); time-invariant.
 *   - lib/sources/source-reliability.ts — per-source rolling OPERATIONAL
 *     telemetry score (uptime/freshness/agreement/schema/latency).
 */

export type SourceCategory =
  | "ODDS"
  | "INJURY_NEWS"
  | "WEATHER"
  | "TEAM_SCHEDULE"
  | "PLAYER_STATS"
  | "TEAM_STATS"
  | "BOOK_PROMO_TERMS"
  | "PLATFORM_POLICY"
  | "PERFORMANCE_SUMMARY"
  | "MODEL_SNAPSHOT";

export type ArtifactKind = "PICK" | "PROMOTION" | "BRIEF" | "CONTENT_DRAFT";

export type FreshnessStatus =
  | "FRESH"
  | "AGING"
  | "STALE"
  | "MISSING"
  | "CONTRADICTORY";

export type ReadinessStatus =
  | "PUBLISH_READY"
  | "HOLD"
  | "REVIEW"
  | "BLOCKED";

export interface FreshnessBudget {
  /** Below this age (ms), evidence is FRESH. */
  readonly softTtlMs: number;
  /** Below this age (ms), evidence is AGING. Above it, STALE. */
  readonly hardTtlMs: number;
}

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

// Per-category TTL budgets. These are deliberately conservative — picks and
// promotions both gate on the strictest applicable category.
export const FRESHNESS_BUDGETS: Readonly<Record<SourceCategory, FreshnessBudget>> = {
  ODDS:                { softTtlMs: 30 * MIN, hardTtlMs: 4 * HOUR },
  INJURY_NEWS:         { softTtlMs: 6 * HOUR,  hardTtlMs: 24 * HOUR },
  WEATHER:             { softTtlMs: 6 * HOUR,  hardTtlMs: 24 * HOUR },
  TEAM_SCHEDULE:       { softTtlMs: 7 * DAY,   hardTtlMs: 30 * DAY },
  PLAYER_STATS:        { softTtlMs: 1 * DAY,   hardTtlMs: 7 * DAY },
  TEAM_STATS:          { softTtlMs: 1 * DAY,   hardTtlMs: 7 * DAY },
  BOOK_PROMO_TERMS:    { softTtlMs: 7 * DAY,   hardTtlMs: 30 * DAY },
  PLATFORM_POLICY:     { softTtlMs: 30 * DAY,  hardTtlMs: 90 * DAY },
  PERFORMANCE_SUMMARY: { softTtlMs: 1 * DAY,   hardTtlMs: 7 * DAY },
  MODEL_SNAPSHOT:      { softTtlMs: 7 * DAY,   hardTtlMs: 30 * DAY },
};

/**
 * SourceEvidence — typed shape of a single source record. The `value` field is
 * intentionally `unknown` here; concrete callers (odds ingestion, injury feed)
 * supply their own shape.
 */
export interface SourceEvidence {
  readonly category: SourceCategory;
  readonly sourceId: string;
  readonly fetchedAt: Date;
  readonly trustScore: number; // 0..100; 100 = official, 0 = blocked
  readonly contradicts?: readonly string[]; // sourceIds this evidence contradicts
  readonly notes?: string;
}

/** Per-category required coverage for each artifact kind. */
export const REQUIRED_COVERAGE: Readonly<Record<ArtifactKind, readonly SourceCategory[]>> = {
  PICK: ["ODDS", "TEAM_SCHEDULE", "MODEL_SNAPSHOT"],
  PROMOTION: ["BOOK_PROMO_TERMS", "PLATFORM_POLICY"],
  BRIEF: ["ODDS", "TEAM_SCHEDULE"],
  CONTENT_DRAFT: ["PLATFORM_POLICY"],
};

/** Categories that, when contradictory, block publish-ready outright. */
const HARD_CONTRADICTION_CATEGORIES: ReadonlySet<SourceCategory> = new Set([
  "BOOK_PROMO_TERMS",
  "PLATFORM_POLICY",
]);

export interface CategoryStatus {
  readonly category: SourceCategory;
  readonly status: FreshnessStatus;
  readonly bestEvidenceId: string | null;
  readonly bestTrustScore: number;
  readonly ageMs: number | null;
}

export interface BlockerSummary {
  readonly code:
    | "MISSING_CATEGORY"
    | "STALE_CATEGORY"
    | "CONTRADICTORY_CATEGORY"
    | "LOW_TRUST_ONLY"
    | "AGING_CATEGORY";
  readonly category: SourceCategory;
  readonly message: string;
}

export interface PublishReadinessReport {
  readonly artifactKind: ArtifactKind;
  readonly artifactId: string;
  readonly generatedAt: Date;
  readonly readiness: ReadinessStatus;
  readonly qualityScore: number; // 0..100
  readonly categories: readonly CategoryStatus[];
  readonly blockers: readonly BlockerSummary[];
  readonly rationale: string;
}

/**
 * Classify a single evidence record's freshness status against the per-
 * category budget. `now` is injected so tests are deterministic.
 */
export function classifyFreshness(
  evidence: SourceEvidence,
  now: Date
): FreshnessStatus {
  const budget = FRESHNESS_BUDGETS[evidence.category];
  const age = now.getTime() - evidence.fetchedAt.getTime();
  if (age < 0) return "FRESH";
  if (age <= budget.softTtlMs) return "FRESH";
  if (age <= budget.hardTtlMs) return "AGING";
  return "STALE";
}

/**
 * Collapse a list of evidence records into the best per-category status.
 * Returns one CategoryStatus per *required* category for the artifact —
 * categories with no evidence map to MISSING.
 */
export function summarizeCategories(
  artifactKind: ArtifactKind,
  evidence: readonly SourceEvidence[],
  now: Date
): readonly CategoryStatus[] {
  const required = REQUIRED_COVERAGE[artifactKind];
  const byCategory = new Map<SourceCategory, SourceEvidence[]>();
  for (const e of evidence) {
    if (!byCategory.has(e.category)) byCategory.set(e.category, []);
    byCategory.get(e.category)!.push(e);
  }

  const out: CategoryStatus[] = [];
  for (const category of required) {
    const list = byCategory.get(category) ?? [];
    if (list.length === 0) {
      out.push({
        category,
        status: "MISSING",
        bestEvidenceId: null,
        bestTrustScore: 0,
        ageMs: null,
      });
      continue;
    }

    // Detect contradiction: any evidence in this category that flags another
    // evidence in this category as contradicted.
    const ids = new Set(list.map((e) => e.sourceId));
    const contradicted = list.some(
      (e) => (e.contradicts ?? []).some((id) => ids.has(id))
    );

    if (contradicted) {
      out.push({
        category,
        status: "CONTRADICTORY",
        bestEvidenceId: list[0]!.sourceId,
        bestTrustScore: Math.max(...list.map((e) => e.trustScore)),
        ageMs: now.getTime() - list[0]!.fetchedAt.getTime(),
      });
      continue;
    }

    // Pick the freshest, highest-trust evidence.
    const ranked = [...list].sort((a, b) => {
      const ageA = now.getTime() - a.fetchedAt.getTime();
      const ageB = now.getTime() - b.fetchedAt.getTime();
      if (ageA !== ageB) return ageA - ageB;
      return b.trustScore - a.trustScore;
    });
    const best = ranked[0]!;
    out.push({
      category,
      status: classifyFreshness(best, now),
      bestEvidenceId: best.sourceId,
      bestTrustScore: best.trustScore,
      ageMs: now.getTime() - best.fetchedAt.getTime(),
    });
  }
  return out;
}

/**
 * Map per-category statuses into the overall readiness verdict and the
 * concrete list of blockers. Pure function over a small state space.
 */
export function readinessFromCategories(
  artifactKind: ArtifactKind,
  categories: readonly CategoryStatus[]
): { readiness: ReadinessStatus; blockers: readonly BlockerSummary[] } {
  const blockers: BlockerSummary[] = [];

  for (const cat of categories) {
    if (cat.status === "MISSING") {
      blockers.push({
        code: "MISSING_CATEGORY",
        category: cat.category,
        message: `Required source category ${cat.category} has no evidence.`,
      });
    } else if (cat.status === "STALE") {
      blockers.push({
        code: "STALE_CATEGORY",
        category: cat.category,
        message: `Required source category ${cat.category} is stale (exceeded hard TTL).`,
      });
    } else if (cat.status === "AGING") {
      blockers.push({
        code: "AGING_CATEGORY",
        category: cat.category,
        message: `Required source category ${cat.category} is aging (exceeded soft TTL).`,
      });
    } else if (cat.status === "CONTRADICTORY") {
      blockers.push({
        code: "CONTRADICTORY_CATEGORY",
        category: cat.category,
        message: `Required source category ${cat.category} has contradictory evidence.`,
      });
    } else if (cat.bestTrustScore < 50) {
      blockers.push({
        code: "LOW_TRUST_ONLY",
        category: cat.category,
        message: `Required source category ${cat.category} only has low-trust evidence (trust < 50).`,
      });
    }
  }

  // Categorize the readiness verdict from the strongest blocker present.
  let readiness: ReadinessStatus = "PUBLISH_READY";

  const hardContradictions = blockers.some(
    (b) =>
      b.code === "CONTRADICTORY_CATEGORY" &&
      HARD_CONTRADICTION_CATEGORIES.has(b.category)
  );
  const anyMissing = blockers.some((b) => b.code === "MISSING_CATEGORY");
  const anyStale = blockers.some((b) => b.code === "STALE_CATEGORY");
  const anyContradictory = blockers.some(
    (b) => b.code === "CONTRADICTORY_CATEGORY"
  );
  const anyAging = blockers.some((b) => b.code === "AGING_CATEGORY");
  const anyLowTrust = blockers.some((b) => b.code === "LOW_TRUST_ONLY");

  if (hardContradictions || anyMissing) {
    readiness = artifactKind === "PROMOTION" ? "BLOCKED" : "HOLD";
  } else if (anyStale) {
    readiness = "HOLD";
  } else if (anyContradictory || anyLowTrust) {
    readiness = "REVIEW";
  } else if (anyAging) {
    readiness = "REVIEW";
  }

  return { readiness, blockers };
}

/**
 * Quality score is a deterministic 0..100 derived from per-category status.
 * Categories at FRESH=100, AGING=60, STALE=20, CONTRADICTORY=10, MISSING=0.
 * Trust score weights the categorical score.
 */
function categoryScore(c: CategoryStatus): number {
  let base = 0;
  switch (c.status) {
    case "FRESH":
      base = 100;
      break;
    case "AGING":
      base = 60;
      break;
    case "STALE":
      base = 20;
      break;
    case "CONTRADICTORY":
      base = 10;
      break;
    case "MISSING":
      base = 0;
      break;
  }
  if (c.bestEvidenceId === null) return 0;
  const trust = Math.max(0, Math.min(100, c.bestTrustScore));
  return Math.round((base * 0.7) + (trust * 0.3));
}

export function computeQualityScore(
  categories: readonly CategoryStatus[]
): number {
  if (categories.length === 0) return 0;
  const sum = categories.reduce((acc, c) => acc + categoryScore(c), 0);
  return Math.round(sum / categories.length);
}

export interface BuildReportInput {
  readonly artifactKind: ArtifactKind;
  readonly artifactId: string;
  readonly evidence: readonly SourceEvidence[];
  readonly now?: Date;
}

/**
 * Build a `PublishReadinessReport` from typed evidence. This is the public
 * entry point for callers — pass in the evidence you've loaded for the
 * artifact, get back a readiness verdict + structured blockers.
 */
export function buildPublishReadinessReport(
  input: BuildReportInput
): PublishReadinessReport {
  const now = input.now ?? new Date();
  const categories = summarizeCategories(
    input.artifactKind,
    input.evidence,
    now
  );
  const { readiness, blockers } = readinessFromCategories(
    input.artifactKind,
    categories
  );
  const qualityScore = computeQualityScore(categories);

  const rationale = buildRationale(input.artifactKind, categories, blockers);

  return {
    artifactKind: input.artifactKind,
    artifactId: input.artifactId,
    generatedAt: now,
    readiness,
    qualityScore,
    categories,
    blockers,
    rationale,
  };
}

function buildRationale(
  kind: ArtifactKind,
  categories: readonly CategoryStatus[],
  blockers: readonly BlockerSummary[]
): string {
  if (blockers.length === 0) {
    return `${kind} has full coverage across ${categories.length} required source categor${categories.length === 1 ? "y" : "ies"}.`;
  }
  const lines = blockers.map((b) => `- ${b.code} (${b.category}): ${b.message}`);
  return `${kind} cannot publish until the following are resolved:\n${lines.join("\n")}`;
}
