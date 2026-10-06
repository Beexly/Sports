// Authored design-sync preview for RiskDisclosure.
import { RiskDisclosure } from "sports-prediction-platform";

const stack: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 16, maxWidth: 480 };

export const Inline = () => (
  <div style={{ ...stack, background: "var(--carbon)", padding: 16, borderRadius: 12 }}>
    <RiskDisclosure />
  </div>
);

export const Card = () => (
  <div style={{ ...stack, background: "var(--carbon)", padding: 24, borderRadius: 16 }}>
    <RiskDisclosure variant="card" includePastPerformance />
  </div>
);

export const Compact = () => (
  <div style={{ ...stack, background: "var(--carbon)", padding: 16, borderRadius: 12 }}>
    <RiskDisclosure variant="compact" />
  </div>
);
