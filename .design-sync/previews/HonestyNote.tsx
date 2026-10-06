// Authored design-sync preview for HonestyNote.
import type { CSSProperties } from "react";
import { HonestyNote } from "sports-prediction-platform";

const dark: CSSProperties = { background: "var(--carbon)", padding: 20, borderRadius: 16, maxWidth: 420 };

export const ParlayCorrelation = () => (
  <div style={dark}>
    <HonestyNote>
      This parlay assumes independent legs. Same-game correlation is not modeled, so the true price may differ.
    </HonestyNote>
  </div>
);

export const NoVigMethod = () => (
  <div style={dark}>
    <HonestyNote>
      No-vig probabilities use a proportional method. A different de-vig method can shift this number by a point or two.
    </HonestyNote>
  </div>
);
