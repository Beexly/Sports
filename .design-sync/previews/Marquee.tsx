// Authored design-sync preview for Marquee.
// FIXTURE: items below are illustrative layout text, not a claim of coverage or performance.
import type { CSSProperties } from "react";
import { Marquee } from "sports-prediction-platform";

const darkGround: CSSProperties = { background: "var(--carbon)", padding: "28px 0", borderRadius: 16 };

export const Dark = () => (
  <div style={darkGround}>
    <Marquee
      items={["NFL", "NCAAF", "MLB", "MLS", "NBA", "NHL", "NCAAB"]}
    />
  </div>
);

export const Slow = () => (
  <div style={darkGround}>
    <Marquee
      items={["Deterministic factor model", "Server-side entitlements", "Full factor trail on every pick"]}
      durationSec={70}
      direction="right"
    />
  </div>
);
