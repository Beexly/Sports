// Authored design-sync preview for CountUp.
// Static capture: CountUp SSR-renders the true value before the in-view
// animation starts, so a screenshot shows the settled number.
import { CountUp } from "sports-prediction-platform";

const row: React.CSSProperties = { display: "flex", gap: 32, alignItems: "baseline", color: "var(--ink, #0e1320)" };
const big: React.CSSProperties = {
  fontSize: 40,
  fontWeight: 700,
  fontFamily: "var(--f-mono, monospace)",
  color: "var(--ink, #0e1320)",
};
const label: React.CSSProperties = { fontSize: 12, marginTop: 4, color: "var(--ink-2, #5b6678)" };

export const Default = () => (
  <div style={row}>
    <div>
      <span style={big}>
        <CountUp value={1284} group />
      </span>
      <p style={label}>Design tokens in this sheet</p>
    </div>
    <div>
      <span style={big}>
        <CountUp value={3.2} decimals={1} suffix="s" />
      </span>
      <p style={label}>Animation duration, illustrative</p>
    </div>
  </div>
);
