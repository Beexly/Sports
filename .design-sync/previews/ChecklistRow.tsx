// Authored design-sync preview for ChecklistRow.
// FIXTURE: check labels/details below are layout fixtures for the design tool, not a live audit.
import type { CSSProperties } from "react";
import { ChecklistRow } from "sports-prediction-platform";

const dark: CSSProperties = { background: "var(--carbon)", padding: 24, borderRadius: 16, display: "grid", gap: 10, maxWidth: 420 };

export const Checklist = () => (
  <div style={dark}>
    <ChecklistRow ok label="Server-side entitlement check" detail="Every gated route re-checks the subscription tier." />
    <ChecklistRow ok label="Timestamps validated" detail="No pick renders older than the freshness window." />
    <ChecklistRow ok={false} label="Second book cleared" detail="Waiting on a second rights-cleared source for this sport." />
    <ChecklistRow ok={false} label="Calibration streak" detail="0 of 3 consecutive green runs." />
  </div>
);

export const SingleFailing = () => (
  <div style={{ ...dark, maxWidth: 360 }}>
    <ChecklistRow ok={false} label="Settlement healthy" detail="2 picks overdue past the settlement window." />
  </div>
);
