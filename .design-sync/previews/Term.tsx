// Authored design-sync preview for Term.
import { Term } from "sports-prediction-platform";

const row: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 12, fontSize: 14, color: "var(--ink, #1a1d29)" };

export const Paper = () => (
  <div style={row}>
    <p>
      This side has strong <Term term="edge" />: the model and the market disagree enough to matter.
    </p>
    <p>
      Track your <Term term="clv" /> over time — beating the closing line is the clearest public proof of an edge.
    </p>
  </div>
);

export const UnknownTerm = () => (
  <div style={row}>
    <p>
      A <Term term="not-a-real-glossary-key">made-up phrase</Term> degrades to plain text instead of a broken tooltip.
    </p>
  </div>
);
