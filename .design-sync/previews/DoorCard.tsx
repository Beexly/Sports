// Authored design-sync preview for DoorCard.
// FIXTURE: labels/stats below are illustrative layout text, not live product numbers.
import type { CSSProperties } from "react";
import { DoorCard } from "sports-prediction-platform";

const grid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 1,
  background: "var(--carbon)",
  padding: 24,
  borderRadius: 16,
};

export const Doors = () => (
  <div style={grid}>
    <DoorCard
      index={1}
      label="Today's board"
      decides="Every pick live right now, ranked by confidence."
      stat="24 picks · 4 sports"
      action="Open the board"
      href="/picks"
      accent
      bar={{ a: 14, b: 10 }}
    />
    <DoorCard
      index={2}
      label="Trend Lab"
      decides="Line movement and market depth behind each signal."
      stat="7 books tracked"
      action="See the trends"
      href="/trend-lab"
    />
    <DoorCard
      index={3}
      label="Calibration"
      decides="How the model's confidence lines up with settled results."
      stat="Updated every settle cycle"
      action="View calibration"
      href="/calibration"
    />
  </div>
);
