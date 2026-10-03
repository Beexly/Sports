// Authored design-sync preview for JarvisTrend.
// FIXTURE: Jarvis snapshot values below are layout fixtures for the design tool, not a live assessment.
import type { CSSProperties } from "react";
import { JarvisTrend } from "sports-prediction-platform";
import type { JarvisHistorySnapshot, JarvisLaunchStatus } from "@/lib/cockpit/jarvis-history";

const dark: CSSProperties = { background: "var(--carbon)", padding: 24, borderRadius: 16 };

const base: Omit<JarvisHistorySnapshot, "assessedAt" | "launchStatus"> = {
  publicSurfaceStatus: "AMBER",
  ingestionStatus: "GREEN",
  settlementStatus: "GREEN",
  canonicalHistoryStatus: "GREEN",
  signalCoverageStatus: "AMBER",
  safetyWarningCount: 0,
  missingPhaseCount: 0,
  externalConfigCount: 0,
  recommendedActionCount: 0,
};

const statuses: readonly JarvisLaunchStatus[] = [
  "NOT_READY_SAFETY",
  "NOT_READY_DATA",
  "NOT_READY_VALIDATION",
  "NOT_READY_VALIDATION",
  "LAUNCH_READY_PENDING_EXTERNAL_CONFIG",
  "LAUNCH_READY_PENDING_EXTERNAL_CONFIG",
  "LAUNCH_READY",
  "LAUNCH_READY",
];

const snapshots: readonly JarvisHistorySnapshot[] = statuses.map((launchStatus, i) => ({
  ...base,
  assessedAt: `2026-09-0${i + 1}T12:00:00.000Z`,
  launchStatus,
}));

export const Trend = () => (
  <div style={dark}>
    <JarvisTrend snapshots={snapshots} />
  </div>
);

export const Empty = () => (
  <div style={dark}>
    <JarvisTrend snapshots={[]} />
  </div>
);
