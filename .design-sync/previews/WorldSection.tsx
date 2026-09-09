// Authored design-sync preview for WorldSection.
// FIXTURE: eyebrow/title/lede copy below is illustrative layout text.
import type { CSSProperties } from "react";
import { WorldSection } from "sports-prediction-platform";

const darkGround: CSSProperties = { background: "var(--carbon)", borderRadius: 16, overflow: "hidden" };
const body: CSSProperties = { color: "var(--ion-1)", font: "400 14px/1.6 var(--f-body, sans-serif)" };

export const Void = () => (
  <div style={darkGround}>
    <WorldSection index="01" eyebrow="The problem" title="Sports picks are a trust problem, not a content problem." tone="void">
      <p style={body}>Most services publish a pick and never say why. We show the factor trail on every one.</p>
    </WorldSection>
  </div>
);

export const Nebula = () => (
  <div style={darkGround}>
    <WorldSection
      index="02"
      eyebrow="How it works"
      title="A deterministic factor model, not a guess."
      lede="Every input is real odds data. Every score is reproducible from the same inputs."
      tone="nebula"
    >
      <p style={body}>Consensus, line movement, market depth, and freshness feed one scoring function — the same one every time.</p>
    </WorldSection>
  </div>
);

export const Deep = () => (
  <div style={darkGround}>
    <WorldSection index="03" eyebrow="Proof" title="Calibration you can check yourself." tone="deep">
      <p style={body}>The gate stays closed until enough settled picks exist to publish a defensible number.</p>
    </WorldSection>
  </div>
);
