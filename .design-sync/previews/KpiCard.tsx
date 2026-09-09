// Authored design-sync preview for KpiCard. Values are illustrative layout fixtures, not product data.
import { KpiCard } from "sports-prediction-platform";

const grid: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 16, maxWidth: 720 };
const darkGround: React.CSSProperties = { background: "var(--carbon)", padding: 24, borderRadius: 16 };

export const Paper = () => (
  <div style={grid}>
    <KpiCard label="Picks on board" value="24" sublabel="Across 4 sports today" />
    <KpiCard label="Books covered" value="7" sublabel="Consensus depth" tone="good" />
    <KpiCard label="Line age" value="12m" sublabel="Oldest quote on the board" tone="bad" />
  </div>
);

export const Dark = () => (
  <div style={darkGround}>
    <div style={grid}>
      <KpiCard variant="dark" label="Picks on board" value="24" sublabel="Across 4 sports today" />
      <KpiCard variant="dark" label="Books covered" value="7" sublabel="Consensus depth" tone="good" />
      <KpiCard variant="dark" label="Line age" value="12m" sublabel="Oldest quote on the board" tone="bad" />
    </div>
  </div>
);

export const Tones = () => (
  <div style={grid}>
    <KpiCard label="Neutral" value="0.00" tone="neutral" />
    <KpiCard label="Good" value="+1.5" tone="good" />
    <KpiCard label="Bad" value="-0.8" tone="bad" />
  </div>
);
