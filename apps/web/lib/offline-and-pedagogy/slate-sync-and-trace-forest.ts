/**
 * Offline-first SealedSlate synchronization (hoodiehq/hoodie pattern),
 * Trace Forest concept explainer (HKUDS/DeepTutor pattern), and deterministic
 * operator challenge checks (freeCodeCamp + Docmost patterns).
 */

export interface OfflineSlateSnapshot {
  readonly slateKey: string;
  readonly version: number;
  readonly updatedAtIso: string;
  readonly packetSha256: string;
}

export interface SlateSyncVerdict {
  readonly winner: "LOCAL" | "REMOTE";
  readonly resolved: OfflineSlateSnapshot;
  readonly conflictDetected: boolean;
}

/**
 * Reconciles cached local and server slate packets monotonically by version and timestamp.
 */
export function reconcileOfflineSlateCache(
  local: OfflineSlateSnapshot,
  remote: OfflineSlateSnapshot,
): SlateSyncVerdict {
  if (remote.version > local.version) {
    return {
      winner: "REMOTE",
      resolved: remote,
      conflictDetected: local.packetSha256 !== remote.packetSha256,
    };
  }
  if (local.version > remote.version) {
    return {
      winner: "LOCAL",
      resolved: local,
      conflictDetected: local.packetSha256 !== remote.packetSha256,
    };
  }
  const sameHash = local.packetSha256 === remote.packetSha256;
  if (!sameHash && remote.updatedAtIso >= local.updatedAtIso) {
    return {
      winner: "REMOTE",
      resolved: remote,
      conflictDetected: true,
    };
  }
  return {
    winner: "LOCAL",
    resolved: local,
    conflictDetected: !sameHash,
  };
}

export interface TraceForestNode {
  readonly nodeId: string;
  readonly label: string;
  readonly parentIds: readonly string[];
  readonly plainEnglishSummary: string;
  readonly masteryLevel: 1 | 2 | 3;
}

/**
 * Returns the plain-English Trace Forest curriculum explaining core matchup drivers.
 */
export function buildDeepTutorTraceForest(): readonly TraceForestNode[] {
  return [
    {
      nodeId: "neutral-proe",
      label: "Pass Rate Over Expected (PROE)",
      parentIds: [],
      plainEnglishSummary:
        "Measures whether a play-caller throws more often than league baseline in neutral scripts.",
      masteryLevel: 1,
    },
    {
      nodeId: "cover1-rate",
      label: "Single-High Man Frequency",
      parentIds: [],
      plainEnglishSummary:
        "Tracks how often a defense plays tight man coverage with one deep safety.",
      masteryLevel: 1,
    },
    {
      nodeId: "pressure-to-sack",
      label: "Pressure-to-Sack Conversion",
      parentIds: ["neutral-proe", "cover1-rate"],
      plainEnglishSummary:
        "Evaluates whether pass rush disruption ends drives with sacks or gets neutralized by quick throws.",
      masteryLevel: 2,
    },
  ];
}

export interface OnboardingChallengeSpec {
  readonly id: string;
  readonly requiredPatterns: readonly string[];
  readonly forbiddenPatterns: readonly string[];
}

export interface OnboardingChallengeResult {
  readonly id: string;
  readonly passed: boolean;
  readonly missing: readonly string[];
  readonly forbiddenHits: readonly string[];
}

/**
 * Deterministically grades operator runbook/curriculum snippets without external runners.
 */
export function evaluateOnboardingCurriculumChallenge(
  spec: OnboardingChallengeSpec,
  submission: string,
): OnboardingChallengeResult {
  const missing = spec.requiredPatterns.filter((p) => !submission.includes(p));
  const forbiddenHits = spec.forbiddenPatterns.filter((p) => submission.includes(p));
  return {
    id: spec.id,
    passed: missing.length === 0 && forbiddenHits.length === 0,
    missing,
    forbiddenHits,
  };
}
