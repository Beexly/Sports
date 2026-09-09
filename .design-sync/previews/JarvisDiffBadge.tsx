// Authored design-sync preview for JarvisDiffBadge.
// FIXTURE: Jarvis snapshot values below are layout fixtures for the design tool, not a live assessment.
import type { CSSProperties } from "react";
import { JarvisDiffBadge } from "sports-prediction-platform";
import type { JarvisHistorySnapshot } from "@/lib/cockpit/jarvis-history";

const dark: CSSProperties = { background: "var(--carbon)", padding: 24, borderRadius: 16 };

const base: JarvisHistorySnapshot = {
  assessedAt: "2026-09-08T12:00:00.000Z",
  launchStatus: "LAUNCH_READY_PENDING_EXTERNAL_CONFIG",
  publicSurfaceStatus: "AMBER",
  ingestionStatus: "GREEN",
  settlementStatus: "GREEN",
  canonicalHistoryStatus: "GREEN",
  signalCoverageStatus: "AMBER",
  safetyWarningCount: 1,
  missingPhaseCount: 2,
  externalConfigCount: 1,
  recommendedActionCount: 3,
};

export const Changed = () => (
  <div style={dark}>
    <JarvisDiffBadge
      recent={[
        { ...base, assessedAt: "2026-09-09T06:00:00.000Z", launchStatus: "LAUNCH_READY", safetyWarningCount: 0 },
        base,
      ]}
    />
  </div>
);

export const MultipleChanges = () => (
  <div style={dark}>
    <JarvisDiffBadge
      recent={[
        {
          ...base,
          assessedAt: "2026-09-09T06:00:00.000Z",
          launchStatus: "NOT_READY_DATA",
          settlementStatus: "AMBER",
          ingestionStatus: "RED",
          safetyWarningCount: 3,
        },
        base,
      ]}
    />
  </div>
);

export const Unchanged = () => (
  <div style={dark}>
    <JarvisDiffBadge recent={[{ ...base, assessedAt: "2026-09-09T06:00:00.000Z" }, base]} />
  </div>
);
