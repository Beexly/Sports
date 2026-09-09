// Authored design-sync preview for ToutComparison.
// Copy is the component's own static comparison table (no fixture data passed in).
// The section has no background of its own (it inherits the app's dark page
// body) and its heading/eyebrow use near-white tokens (--ion-white, --plasma)
// meant to sit on that dark ground, so it needs an explicit dark wrapper here
// or the text is illegible on the design tool's white card background. The
// full section (96px top/bottom padding, 56px heading, six-row table) is also
// taller than the capture viewport, so the wrapper is scaled down to keep the
// whole table in frame rather than cropping the last rows.
import type { CSSProperties } from "react";
import { ToutComparison } from "sports-prediction-platform";

const frame: CSSProperties = {
  width: 900,
  height: 700,
  overflow: "hidden",
  background: "var(--carbon)",
};

const scaled: CSSProperties = {
  width: 1500,
  transform: "scale(0.6)",
  transformOrigin: "top left",
};

export const Dark = () => (
  <div style={frame}>
    <div style={scaled}>
      <ToutComparison />
    </div>
  </div>
);
