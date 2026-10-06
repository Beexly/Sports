// Authored design-sync preview for Footer.
// FIXTURE: link labels mirror the product's real footer copy (layout fixture only).
import { Footer } from "sports-prediction-platform";

const wrap: React.CSSProperties = { background: "var(--carbon)", maxWidth: 1100 };

export const Dark = () => (
  <div style={wrap}>
    <Footer />
  </div>
);
