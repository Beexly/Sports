// Authored design-sync preview for OddsFormatToggle.
import type { CSSProperties } from "react";
import { OddsFormatToggle } from "sports-prediction-platform";

const dark: CSSProperties = { background: "var(--carbon)", padding: 20, borderRadius: 16, display: "inline-flex" };

export const American = () => (
  <div style={dark}>
    <OddsFormatToggle format="american" onChange={() => {}} />
  </div>
);

export const Decimal = () => (
  <div style={dark}>
    <OddsFormatToggle format="decimal" onChange={() => {}} />
  </div>
);
