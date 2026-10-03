// Authored design-sync preview for HealthRing.
// FIXTURE: segment values below are illustrative layout fixtures, not live system telemetry.
import type { CSSProperties } from "react";
import { HealthRing } from "sports-prediction-platform";

const darkGround: CSSProperties = {
  background: "var(--carbon)",
  padding: 32,
  borderRadius: 16,
  display: "flex",
  gap: 32,
  alignItems: "center",
  flexWrap: "wrap",
};

export const Dark = () => (
  <div style={darkGround}>
    <HealthRing />
  </div>
);

export const HighHealth = () => (
  <div style={darkGround}>
    <HealthRing
      size={160}
      health={0.97}
      segments={[
        { label: "Data intake", value: 0.98, color: "#00E5FF" },
        { label: "Model inference", value: 0.96, color: "#7B61FF" },
        { label: "Board state", value: 0.95, color: "#00E5FF" },
      ]}
    />
  </div>
);

export const LowHealth = () => (
  <div style={darkGround}>
    <HealthRing
      size={160}
      health={0.42}
      segments={[
        { label: "Data intake", value: 0.55, color: "#00E5FF" },
        { label: "Model inference", value: 0.38, color: "#7B61FF" },
        { label: "Board state", value: 0.3, color: "#00E5FF" },
        { label: "Media pipeline", value: 0.44, color: "#7B61FF" },
      ]}
    />
  </div>
);
