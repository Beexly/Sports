// Authored design-sync preview for FormulaPlaque.
import type { CSSProperties } from "react";
import { FormulaPlaque } from "sports-prediction-platform";

const dark: CSSProperties = { background: "var(--carbon)", padding: 24, borderRadius: 16, maxWidth: 420 };

export const NoVig = () => (
  <div style={dark}>
    <FormulaPlaque formula={"fair_p = (1 / decimal_odds) / sum(1 / decimal_odds across the market)"} />
  </div>
);

export const ParlayPrice = () => (
  <div style={dark}>
    <FormulaPlaque
      label="Parlay price"
      formula={"parlay_decimal = leg_1 x leg_2 x ... x leg_n\n(assumes independent legs)"}
    />
  </div>
);
