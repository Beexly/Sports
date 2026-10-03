// Authored design-sync preview for ValueGapBadge.
// FIXTURE: probabilities below are layout fixtures, not live model output.
import { ValueGapBadge } from "sports-prediction-platform";

// The badge's tone classes (orbital-cyan / ion-2 / ion-3) are contrast-tuned
// against carbon, same as the pick card it lives inside — wrap in that ground.
const ground: React.CSSProperties = { background: "var(--carbon)", padding: 24, borderRadius: 16, display: "flex", flexDirection: "column", gap: 10, fontSize: 13, color: "var(--ion-1)" };

export const Positive = () => (
  <div style={ground}>
    Buffalo Bills −2.5 <ValueGapBadge rankingP={0.64} marketFairProb={0.58} />
  </div>
);

export const Negative = () => (
  <div style={ground}>
    Kansas City Chiefs ML <ValueGapBadge rankingP={0.41} marketFairProb={0.46} />
  </div>
);

export const Aligned = () => (
  <div style={ground}>
    Los Angeles Dodgers −1.5 <ValueGapBadge rankingP={0.552} marketFairProb={0.55} />
  </div>
);
