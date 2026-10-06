// Authored design-sync preview for StartInSixty.
// Copy is the component's own static reassurance bar (no fixture data passed in).
import type { CSSProperties } from "react";
import { StartInSixty } from "sports-prediction-platform";

const darkGround: CSSProperties = { background: "var(--carbon)", borderRadius: 16 };

export const Dark = () => (
  <div style={darkGround}>
    <StartInSixty />
  </div>
);
