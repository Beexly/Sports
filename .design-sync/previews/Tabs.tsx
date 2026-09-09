// Authored design-sync preview for Tabs.
import type { CSSProperties } from "react";
import { Tabs } from "sports-prediction-platform";

const items = [
  { value: "board", label: "Board" },
  { value: "trend-lab", label: "Trend Lab" },
  { value: "parlay-mri", label: "Parlay MRI" },
] as const;

const dark: CSSProperties = { background: "var(--carbon)", padding: 24, borderRadius: 16 };

export const Paper = () => (
  <Tabs param="view" active="board" items={items} pathname="/picks" ariaLabel="Board views" />
);

export const Dark = () => (
  <div style={dark}>
    <Tabs param="view" active="trend-lab" items={items} pathname="/picks" variant="dark" ariaLabel="Board views" />
  </div>
);
