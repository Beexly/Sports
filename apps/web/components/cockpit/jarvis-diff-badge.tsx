import type { JarvisHistorySnapshot } from "@/lib/cockpit/jarvis-history";

/**
 * JarvisDiffBadge — compact "what changed since last snapshot" badge.
 *
 * Pure functional component. Takes two snapshots (previous + current,
 * usually the two newest entries in the ring buffer) and renders a
 * small inline indicator if anything sectional changed.
 *
 * Returns null (no DOM) when there's nothing to show. Safe to render
 * unconditionally near the launch-status pill.
 *
 * Note: the full JarvisDiff helper lives at `lib/cockpit/jarvis-diff.ts`
 * and operates on JarvisAssessment objects. This badge intentionally
 * works on the compact JarvisHistorySnapshot shape so it can be fed
 * straight from `sharedJarvisHistory().recent(2)`.
 */

export interface JarvisDiffBadgeProps {
  /** Most recent two snapshots, newest first. */
  readonly recent: readonly JarvisHistorySnapshot[];
  readonly className?: string;
}

export function JarvisDiffBadge({ recent, className }: JarvisDiffBadgeProps) {
  if (recent.length < 2) return null;
  const [current, previous] = recent;
  if (!current || !previous) return null;

  const changes: string[] = [];
  if (current.launchStatus !== previous.launchStatus) {
    changes.push(`status: ${previous.launchStatus} → ${current.launchStatus}`);
  }
  const sectionalKeys: Array<keyof JarvisHistorySnapshot> = [
    "ingestionStatus",
    "settlementStatus",
    "canonicalHistoryStatus",
    "signalCoverageStatus",
    "publicSurfaceStatus",
  ];
  for (const k of sectionalKeys) {
    if (current[k] !== previous[k]) {
      changes.push(`${String(k).replace("Status", "")}: ${previous[k]} → ${current[k]}`);
    }
  }
  if (current.safetyWarningCount !== previous.safetyWarningCount) {
    const delta = current.safetyWarningCount - previous.safetyWarningCount;
    changes.push(`safety ${delta > 0 ? "+" : ""}${delta}`);
  }

  if (changes.length === 0) {
    return (
      <span
        data-testid="jarvis-diff-badge"
        data-state="unchanged"
        className={["text-[10px] text-ink-500", className ?? ""].join(" ")}
      >
        no change since last assessment
      </span>
    );
  }

  return (
    <span
      data-testid="jarvis-diff-badge"
      data-state="changed"
      className={[
        "rounded-full bg-yellow-900/40 px-2 py-0.5 text-[10px] font-semibold text-yellow-300",
        className ?? "",
      ].join(" ")}
      title={changes.join("\n")}
    >
      {changes.length === 1 ? changes[0] : `${changes.length} changes since last`}
    </span>
  );
}
