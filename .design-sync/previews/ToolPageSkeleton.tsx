// Authored design-sync preview for ToolPageSkeleton.
import { ToolPageSkeleton } from "sports-prediction-platform";

const frame: React.CSSProperties = { maxWidth: 900, borderRadius: 16, overflow: "hidden" };

export const Default = () => (
  <div style={frame}>
    <ToolPageSkeleton label="Loading Trend Lab" />
  </div>
);
