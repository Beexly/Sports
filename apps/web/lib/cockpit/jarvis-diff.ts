/**
 * Jarvis Assessment Diff
 *
 * Pure helper that compares two JarvisAssessments and returns the list
 * of changes between them. Useful for:
 *   - Operator alerts ("ingestion just flipped to RED")
 *   - Trend display ("3 sectional changes since the last assessment")
 *   - Audit logs that highlight what moved
 *
 * No I/O. Deep-comparison is intentionally limited to the fields the
 * cockpit cares about — full JSON diffing is overkill and produces too
 * much noise on cosmetic shape changes.
 */

import type { JarvisAssessment, JarvisHealth, JarvisLaunchStatus } from "@/lib/cockpit/jarvis";

export interface JarvisDiffField {
  readonly key: string;
  readonly previous: string | number | null;
  readonly current: string | number | null;
}

export interface JarvisDiff {
  /** True when at least one field differs. */
  readonly hasChanges: boolean;
  /** True when the launchStatus changed. */
  readonly launchStatusChanged: boolean;
  /** Sectional status changes (label + previous + current). */
  readonly sectionalChanges: readonly JarvisDiffField[];
  /** Warning-count changes (safety, missing-phase, external-config, actions). */
  readonly warningCountChanges: readonly JarvisDiffField[];
  /** New safety warnings that appeared in current but not previous. */
  readonly newSafetyWarnings: readonly string[];
  /** Safety warnings that cleared between previous and current. */
  readonly clearedSafetyWarnings: readonly string[];
  /** New external config keys that became required. */
  readonly newExternalConfig: readonly string[];
  /** External config keys that were resolved. */
  readonly clearedExternalConfig: readonly string[];
}

function sectionalFields(a: JarvisAssessment): Array<[string, JarvisHealth]> {
  return [
    ["publicSurfaceStatus", a.publicSurfaceStatus],
    ["customerDashboardStatus", a.customerDashboardStatus],
    ["picksStatus", a.picksStatus],
    ["performanceStatus", a.performanceStatus],
    ["cockpitStatus", a.cockpitStatus],
    ["historicalPickStatus", a.historicalPickStatus],
    ["ingestionStatus", a.ingestionStatus],
    ["settlementStatus", a.settlementStatus],
    ["canonicalHistoryStatus", a.canonicalHistoryStatus],
    ["bootstrapStatus", a.bootstrapStatus],
    ["signalCoverageStatus", a.signalCoverageStatus],
  ];
}

function setDiff<T>(prev: readonly T[], curr: readonly T[]): { added: T[]; removed: T[] } {
  const prevSet = new Set(prev);
  const currSet = new Set(curr);
  const added = curr.filter((x) => !prevSet.has(x));
  const removed = prev.filter((x) => !currSet.has(x));
  return { added, removed };
}

// Compares two Jarvis assessments and returns operator-readable drift.
export function diffJarvis(
  previous: JarvisAssessment | null,
  current: JarvisAssessment
): JarvisDiff {
  if (previous === null) {
    // First assessment — treat every section as "new" for clarity.
    const initial: JarvisDiff = {
      hasChanges: true,
      launchStatusChanged: true,
      sectionalChanges: sectionalFields(current).map(([key, value]) => ({
        key,
        previous: null,
        current: value,
      })),
      warningCountChanges: [
        { key: "safetyWarnings", previous: 0, current: current.safetyWarnings.length },
        { key: "missingPhaseWarnings", previous: 0, current: current.missingPhaseWarnings.length },
        { key: "externalConfigWarnings", previous: 0, current: current.externalConfigWarnings.length },
        { key: "recommendedNextActions", previous: 0, current: current.recommendedNextActions.length },
      ],
      newSafetyWarnings: current.safetyWarnings,
      clearedSafetyWarnings: [],
      newExternalConfig: current.externalConfigWarnings,
      clearedExternalConfig: [],
    };
    return initial;
  }

  const sectionalChanges: JarvisDiffField[] = [];
  const prevSectional = sectionalFields(previous);
  const currSectional = sectionalFields(current);
  for (let i = 0; i < currSectional.length; i++) {
    const [key, currVal] = currSectional[i]!;
    const prevVal = prevSectional[i]![1];
    if (prevVal !== currVal) {
      sectionalChanges.push({ key, previous: prevVal, current: currVal });
    }
  }

  const warningCountChanges: JarvisDiffField[] = [];
  const counts: Array<[string, number, number]> = [
    ["safetyWarnings", previous.safetyWarnings.length, current.safetyWarnings.length],
    ["missingPhaseWarnings", previous.missingPhaseWarnings.length, current.missingPhaseWarnings.length],
    ["externalConfigWarnings", previous.externalConfigWarnings.length, current.externalConfigWarnings.length],
    ["recommendedNextActions", previous.recommendedNextActions.length, current.recommendedNextActions.length],
  ];
  for (const [key, p, c] of counts) {
    if (p !== c) warningCountChanges.push({ key, previous: p, current: c });
  }

  const safety = setDiff(previous.safetyWarnings, current.safetyWarnings);
  const ext = setDiff(previous.externalConfigWarnings, current.externalConfigWarnings);

  const launchChanged = previous.launchStatus !== current.launchStatus;
  const hasChanges =
    launchChanged ||
    sectionalChanges.length > 0 ||
    warningCountChanges.length > 0 ||
    safety.added.length > 0 ||
    safety.removed.length > 0 ||
    ext.added.length > 0 ||
    ext.removed.length > 0;

  return {
    hasChanges,
    launchStatusChanged: launchChanged,
    sectionalChanges,
    warningCountChanges,
    newSafetyWarnings: safety.added,
    clearedSafetyWarnings: safety.removed,
    newExternalConfig: ext.added,
    clearedExternalConfig: ext.removed,
  };
}

/**
 * Human-readable one-line summary of a JarvisDiff. Returns an empty
 * string when nothing changed.
 */
export function summarizeJarvisDiff(diff: JarvisDiff): string {
  if (!diff.hasChanges) return "";
  const parts: string[] = [];
  if (diff.launchStatusChanged) {
    parts.push("launchStatus changed");
  }
  if (diff.sectionalChanges.length > 0) {
    parts.push(`${diff.sectionalChanges.length} sectional change(s)`);
  }
  if (diff.newSafetyWarnings.length > 0) {
    parts.push(`+${diff.newSafetyWarnings.length} safety`);
  }
  if (diff.clearedSafetyWarnings.length > 0) {
    parts.push(`-${diff.clearedSafetyWarnings.length} safety`);
  }
  if (diff.newExternalConfig.length > 0) {
    parts.push(`+${diff.newExternalConfig.length} config`);
  }
  if (diff.clearedExternalConfig.length > 0) {
    parts.push(`-${diff.clearedExternalConfig.length} config`);
  }
  return parts.join(" · ");
}

// Eslint: keep the type imports referenced even if some are only used
// in callers.
export type { JarvisAssessment, JarvisHealth, JarvisLaunchStatus };
