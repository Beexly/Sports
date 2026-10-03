// Authored design-sync preview for ToneCell.
import { ToneCell } from "sports-prediction-platform";

const row: React.CSSProperties = {
  display: "flex",
  gap: 20,
  alignItems: "center",
  fontSize: 14,
  color: "var(--ink, #0e1320)",
};

export const Paper = () => (
  <div style={row}>
    <span>Line moved toward: <ToneCell tone="good">+1.5</ToneCell></span>
    <span>Volatility flag: <ToneCell tone="bad">Re-quoted</ToneCell></span>
    <span>No signal: <ToneCell tone="neutral" bold={false}>Held</ToneCell></span>
  </div>
);
