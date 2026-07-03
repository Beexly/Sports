import type { JarvisHistorySnapshot } from "@/lib/cockpit/jarvis-history";

/**
 * JarvisTrend — compact, dependency-free indicator of the last N
 * launchStatus values.
 *
 * Pure functional component. Pass in the ring-buffer snapshots; the
 * component renders a row of colored pills. Older → newer left-to-right
 * (so the rightmost pill is "now").
 *
 * The cockpit overview can render this near the launch status:
 *
 *   <JarvisTrend snapshots={sharedJarvisHistory().recent(8).reverse()} />
 *
 * (Reverse because `recent` returns newest-first; this component reads
 * oldest-first so the eye scans naturally.)
 */

const STATUS_TONE: Record<string, string> = {
  LAUNCH_READY: "bg-verify/20 text-verify",
  LAUNCH_READY_PENDING_EXTERNAL_CONFIG: "bg-caution/20 text-caution",
  NOT_READY_DATA: "bg-alert/20 text-alert",
  // Distinct from the other two failure reasons (orange vs. red in the original) —
  // uses caution-deep rather than alert so a validation gap still reads as
  // "fix and retry," not the same hard-block red as a data/safety failure.
  NOT_READY_VALIDATION: "bg-caution-deep/20 text-caution-deep",
  NOT_READY_SAFETY: "bg-alert/30 text-alert",
  UNKNOWN: "bg-titanium/40 text-ion-1",
};

const STATUS_SHORT: Record<string, string> = {
  LAUNCH_READY: "RD",
  LAUNCH_READY_PENDING_EXTERNAL_CONFIG: "PC",
  NOT_READY_DATA: "ND",
  NOT_READY_VALIDATION: "NV",
  NOT_READY_SAFETY: "NS",
  UNKNOWN: "?",
};

export interface JarvisTrendProps {
  readonly snapshots: readonly JarvisHistorySnapshot[];
  /** Optional className for the outer container. */
  readonly className?: string;
}

export function JarvisTrend({ snapshots, className }: JarvisTrendProps) {
  if (snapshots.length === 0) {
    return (
      <div
        data-testid="jarvis-trend-empty"
        className={["text-label text-ion-3", className ?? ""].join(" ")}
      >
        No trend data yet
      </div>
    );
  }

  return (
    <div
      data-testid="jarvis-trend"
      className={["flex items-center gap-1", className ?? ""].join(" ")}
      aria-label={`Recent launch status: ${snapshots
        .map((s) => s.launchStatus)
        .join(", ")}`}
    >
      {snapshots.map((s, i) => (
        <span
          key={`${s.assessedAt}-${i}`}
          title={`${s.assessedAt} — ${s.launchStatus}`}
          className={[
            "rounded px-1.5 py-0.5 text-micro font-bold uppercase tracking-widest",
            STATUS_TONE[s.launchStatus] ?? STATUS_TONE["UNKNOWN"]!,
          ].join(" ")}
        >
          {STATUS_SHORT[s.launchStatus] ?? "?"}
        </span>
      ))}
    </div>
  );
}
