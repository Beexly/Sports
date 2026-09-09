// Authored design-sync preview for MetricExplainer. Copy mirrors the product's glossary voice.
import { MetricExplainer } from "sports-prediction-platform";

const terms = [
  {
    term: "Confidence",
    definition: "The engine's calibrated probability that this side covers, on a 0–100 scale.",
    weakness: "Calibration is measured on the pooled sample; thin sport strata carry more noise.",
    decisionUse: "Rank picks within a slate. Never a guarantee of any single outcome.",
  },
  {
    term: "Edge score",
    definition: "Net pricing gap between the market's fair line and the price you can actually take.",
    weakness: "Depends on how many bookmakers were quoting when the pick was minted.",
    decisionUse: "Compare two picks at the same confidence; prefer the wider edge.",
  },
  {
    term: "Data quality",
    definition: "How complete and fresh the inputs were when the factor model scored the game.",
    decisionUse: "Treat anything below 60 as a reason to wait for a refresh.",
  },
] as const;

export const Paper = () => (
  <div style={{ maxWidth: 440 }}>
    <MetricExplainer title="How to read it" terms={terms} />
  </div>
);

export const Dark = () => (
  <div style={{ maxWidth: 440, background: "var(--carbon)", padding: 24, borderRadius: 16 }}>
    <MetricExplainer title="How to read it" variant="dark" terms={terms} />
  </div>
);

export const NoTitle = () => (
  <div style={{ maxWidth: 440 }}>
    <MetricExplainer terms={terms.slice(0, 1)} />
  </div>
);
