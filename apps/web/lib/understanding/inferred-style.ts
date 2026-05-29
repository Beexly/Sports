/**
 * Inferred Style — observed-behavior model surfaced as 'Galaxy observes'.
 *
 * Pure function. Cookie-only. Disabled by default. The /profile panel
 * is the explicit opt-in.
 *
 * Constitution: privacy posture is cookie-only (Pillar D decision).
 * No DB writes. No telemetry escalation. Overrides always win over
 * inference.
 */

export const STYLE_OPT_IN_COOKIE = "gse_style_opt_in";
export const STYLE_OVERRIDE_COOKIE = "gse_style_override";
export const STYLE_OBSERVATIONS_COOKIE = "gse_style_obs";

export type InferredStyleTrait =
  | "evidence-skipper"
  | "process-grader"
  | "correlation-aware"
  | "no-bet-respecter"
  | "post-loss-cautious";

export interface StyleObservations {
  /** Total evidence-drawer opens, capped. */
  readonly evidenceOpens: number;
  /** Total pick-card viewings, capped. */
  readonly pickViews: number;
  /** Total autopsy grade-acks, capped. */
  readonly autopsyGrades: number;
  /** Total parlay-MRI runs, capped. */
  readonly parlayMriRuns: number;
  /** Total no-bet list views, capped. */
  readonly noBetViews: number;
  /** Last loss timestamp if any. */
  readonly lastLossAt: string | null;
}

const OBS_CAP = 1000;

export const EMPTY_OBSERVATIONS: StyleObservations = {
  evidenceOpens: 0,
  pickViews: 0,
  autopsyGrades: 0,
  parlayMriRuns: 0,
  noBetViews: 0,
  lastLossAt: null,
};

export interface InferredStyleResult {
  readonly enabled: boolean;
  readonly traits: ReadonlyArray<InferredStyleTrait>;
  readonly overrides: ReadonlyArray<InferredStyleTrait>;
  /** Combined view: traits union overrides. */
  readonly effective: ReadonlyArray<InferredStyleTrait>;
  readonly explanation: string;
}

function ratio(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return numerator / denominator;
}

/** Pure inference. No side effects. */
export function inferStyle(
  optIn: boolean,
  observations: StyleObservations,
  overrides: ReadonlyArray<InferredStyleTrait>,
  now = new Date(),
): InferredStyleResult {
  if (!optIn) {
    return {
      enabled: false,
      traits: [],
      overrides: [...overrides],
      effective: [...overrides],
      explanation: "Inferred style is off. Galaxy observes nothing until you opt in.",
    };
  }

  const traits = new Set<InferredStyleTrait>();

  // Evidence-skipper: many pick views, few evidence opens
  if (observations.pickViews >= 10 && ratio(observations.evidenceOpens, observations.pickViews) < 0.2) {
    traits.add("evidence-skipper");
  }

  // Process-grader: autopsy grade rate is high
  if (observations.autopsyGrades >= 5) {
    traits.add("process-grader");
  }

  // Correlation-aware: parlay-MRI runs are non-trivial
  if (observations.parlayMriRuns >= 3) {
    traits.add("correlation-aware");
  }

  // No-bet-respecter: no-bet view rate is high relative to pick views
  if (observations.noBetViews >= 5 && ratio(observations.noBetViews, observations.pickViews + 1) >= 0.3) {
    traits.add("no-bet-respecter");
  }

  // Post-loss-cautious: recent loss within last 24h
  if (observations.lastLossAt) {
    const lossAt = new Date(observations.lastLossAt).getTime();
    if (!Number.isNaN(lossAt) && now.getTime() - lossAt < 24 * 60 * 60_000) {
      traits.add("post-loss-cautious");
    }
  }

  const inferred = [...traits];
  const overrideSet = new Set<InferredStyleTrait>(overrides);
  const effective = [...new Set<InferredStyleTrait>([...inferred, ...overrideSet])];

  const explanation =
    inferred.length === 0
      ? "Galaxy is observing but has not inferred a stable style yet."
      : `Inferred traits: ${inferred.join(", ")}.`;

  return {
    enabled: true,
    traits: inferred,
    overrides: [...overrideSet],
    effective,
    explanation,
  };
}

/** Cap observation counters defensively. */
export function capObservations(obs: StyleObservations): StyleObservations {
  return {
    evidenceOpens: Math.min(OBS_CAP, Math.max(0, obs.evidenceOpens)),
    pickViews: Math.min(OBS_CAP, Math.max(0, obs.pickViews)),
    autopsyGrades: Math.min(OBS_CAP, Math.max(0, obs.autopsyGrades)),
    parlayMriRuns: Math.min(OBS_CAP, Math.max(0, obs.parlayMriRuns)),
    noBetViews: Math.min(OBS_CAP, Math.max(0, obs.noBetViews)),
    lastLossAt: obs.lastLossAt,
  };
}
