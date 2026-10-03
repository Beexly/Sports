// Authored design-sync preview for Stagger.
// FIXTURE: list items below are illustrative layout text, not product copy.
// Elements already in view reveal immediately (see Reveal.tsx note), so the
// static capture shows the settled list rather than a mid-stagger frame.
import type { CSSProperties } from "react";
import { Stagger } from "sports-prediction-platform";

const row: CSSProperties = {
  background: "var(--eclipse)",
  border: "1px solid var(--mineral)",
  borderRadius: 10,
  padding: "12px 16px",
  marginBottom: 10,
  color: "var(--ion-1)",
  font: "400 13px/1.4 var(--f-body, sans-serif)",
};

const darkGround: CSSProperties = { background: "var(--carbon)", padding: 24, borderRadius: 16, maxWidth: 360 };

export const List = () => (
  <div style={darkGround}>
    <Stagger step={80}>
      {[
        <div key="a" style={row}>Consensus across seven books</div>,
        <div key="b" style={row}>Line moved a full point toward the pick</div>,
        <div key="c" style={row}>Data freshness within the last 15 minutes</div>,
      ]}
    </Stagger>
  </div>
);

export const TightStep = () => (
  <div style={darkGround}>
    <Stagger step={30} direction="left">
      {[
        <div key="a" style={row}>Free tier: 2 picks/day</div>,
        <div key="b" style={row}>Pro: full board, every sport</div>,
      ]}
    </Stagger>
  </div>
);
