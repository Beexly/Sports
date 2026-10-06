// Authored design-sync preview for SignalRule.
// FIXTURE: copy below is illustrative layout text, not product copy.
import type { CSSProperties } from "react";
import { SignalRule } from "sports-prediction-platform";

const darkGround: CSSProperties = {
  background: "var(--carbon)",
  padding: 32,
  borderRadius: 16,
  maxWidth: 480,
  color: "var(--ion-1)",
  font: "400 14px/1.6 var(--f-body, sans-serif)",
};

export const Dark = () => (
  <div style={darkGround}>
    <p style={{ margin: 0, color: "var(--ion-white)" }}>Every signal starts with real odds data.</p>
    <div style={{ margin: "20px 0" }}>
      <SignalRule />
    </div>
    <p style={{ margin: 0 }}>What the factor model does with it is deterministic, and auditable.</p>
  </div>
);
