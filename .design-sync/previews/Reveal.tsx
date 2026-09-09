// Authored design-sync preview for Reveal.
// FIXTURE: copy below is illustrative layout text, not product copy.
// Reveal renders content that is already in the viewport at full opacity
// immediately (no hidden pre-animation state), so a static capture shows
// the settled, visible result rather than a transitional frame.
import type { CSSProperties } from "react";
import { Reveal } from "sports-prediction-platform";

const card: CSSProperties = {
  background: "var(--eclipse)",
  border: "1px solid var(--mineral)",
  borderRadius: 12,
  padding: 20,
  maxWidth: 360,
  color: "var(--ion-white)",
  font: "400 14px/1.5 var(--f-body, sans-serif)",
};

const darkGround: CSSProperties = { background: "var(--carbon)", padding: 24, borderRadius: 16 };

export const Up = () => (
  <div style={darkGround}>
    <Reveal direction="up">
      <div style={card}>Every pick carries a full factor trail — consensus, line movement, depth, freshness.</div>
    </Reveal>
  </div>
);

export const Left = () => (
  <div style={darkGround}>
    <Reveal direction="left">
      <div style={card}>The engine only publishes when the calibration gate is green.</div>
    </Reveal>
  </div>
);

export const Scale = () => (
  <div style={darkGround}>
    <Reveal direction="scale">
      <div style={card}>Confidence scores are calibrated against settled results, not guessed.</div>
    </Reveal>
  </div>
);
