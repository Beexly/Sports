// Authored design-sync preview for StatusTile.
// FIXTURE: labels/values below are layout fixtures for the design tool, not a live cockpit read.
import type { CSSProperties } from "react";
import { StatusTile } from "sports-prediction-platform";
import type { StatusTone } from "sports-prediction-platform";

const dark: CSSProperties = { background: "var(--carbon)", padding: 24, borderRadius: 16 };
const grid: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 12, maxWidth: 760 };

const tiles: ReadonlyArray<{ label: string; value: string; tone: StatusTone }> = [
  { label: "Ingestion", value: "Green", tone: "good" },
  { label: "Settlement", value: "Amber", tone: "warn" },
  { label: "Odds feed", value: "Red", tone: "bad" },
  { label: "Calibration", value: "Streak 0/3", tone: "info" },
  { label: "Bootstrap", value: "n/a", tone: "neutral" },
];

export const ToneSweep = () => (
  <div style={dark}>
    <div style={grid}>
      {tiles.map((t) => (
        <StatusTile key={t.label} {...t} />
      ))}
    </div>
  </div>
);

export const Runnable = () => (
  <div style={{ ...dark, maxWidth: 320 }}>
    <StatusTile
      label="Settlement"
      value="2 overdue"
      tone="warn"
      href="/cockpit/settlement"
      caption="Open the settlement runner to clear the queue."
    />
  </div>
);

export const Static = () => (
  <div style={{ ...dark, maxWidth: 320 }}>
    <StatusTile label="Model version" value="v5.2.7" tone="neutral" caption="Frozen until the next clean slate." />
  </div>
);
