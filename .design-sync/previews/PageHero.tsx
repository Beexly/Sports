// Authored design-sync preview for PageHero.
// FIXTURE: copy below is layout-fixture prose for the design tool, not product data.
import type { CSSProperties } from "react";
import { PageHero, MetricExplainer } from "sports-prediction-platform";

const asideTerms = [
  {
    term: "Confidence",
    definition: "The engine's calibrated probability that this side covers, on a 0–100 scale.",
    decisionUse: "Rank picks within a slate. Never a guarantee of any single outcome.",
  },
  {
    term: "Factor trail",
    definition: "The named inputs (consensus, line movement, venue form) that produced the score.",
    decisionUse: "Open it to see why a pick ranks where it does.",
  },
] as const;

const dark: CSSProperties = { background: "var(--carbon)", padding: 24, borderRadius: 16 };

export const Paper = () => (
  <PageHero
    eyebrow="Today's board"
    title="Every pick, priced and dated"
    description="Seven sports, ranked by the factor model. Each card shows the line it was minted against and when the data was last refreshed."
    actions={
      <>
        <a
          href="#"
          style={{
            display: "inline-flex",
            alignItems: "center",
            borderRadius: 8,
            border: "1px solid var(--paper-border, #d8dce6)",
            padding: "8px 14px",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          Export JSON
        </a>
        <a href="#" style={{ display: "inline-flex", alignItems: "center", fontSize: 13, fontWeight: 600 }}>
          View methodology →
        </a>
      </>
    }
  />
);

export const WithAside = () => (
  <PageHero
    eyebrow="Trend Lab"
    title="Line movement, tracked since open"
    description="How far each price has moved since the book first posted it, and which side the market is leaning."
    aside={
      <div style={{ maxWidth: 380 }}>
        <MetricExplainer title="How to read it" terms={asideTerms} />
      </div>
    }
  />
);

export const Dark = () => (
  <div style={dark}>
    <PageHero
      variant="dark"
      eyebrow="Galaxy Sports Edge"
      title="Math you can read"
      description="Deterministic factor scoring, not a black box. Every number on this page traces back to a real input."
    />
  </div>
);
