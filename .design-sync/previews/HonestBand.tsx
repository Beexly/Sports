// Authored design-sync preview for HonestBand.
// FIXTURE: observed-rate/sample-size values below are illustrative shapes for rendering the honest-
// uncertainty band only (Wilson interval + reliability tier + limitation flags) — not a real settled
// track record. This component's whole purpose is to disclose uncertainty rather than assert a result.
import type { CSSProperties } from "react";
import { HonestBand } from "sports-prediction-platform";

const dark: CSSProperties = { background: "var(--carbon)", padding: 24, borderRadius: 16, maxWidth: 460 };

export const HighReliability = () => (
  <div style={dark}>
    <HonestBand observedRate={0.55} sampleSize={400} />
  </div>
);

export const ModerateReliability = () => (
  <div style={dark}>
    <HonestBand observedRate={0.55} sampleSize={120} />
  </div>
);

export const LowReliability = () => (
  <div style={dark}>
    <HonestBand observedRate={0.5} sampleSize={20} />
  </div>
);

export const Insufficient = () => (
  <div style={dark}>
    <HonestBand observedRate={0.6} sampleSize={8} />
  </div>
);
