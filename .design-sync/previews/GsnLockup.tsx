// Authored design-sync preview for GsnLockup.
// FIXTURE: layout fixture only — renders the Galaxy Sports Network identity.
import { GsnLockup } from "sports-prediction-platform";

const darkGround: React.CSSProperties = { background: "var(--carbon)", padding: 24, borderRadius: 16, display: "flex", gap: 24, alignItems: "center" };

export const Full = () => (
  <div style={darkGround}>
    <GsnLockup variant="full" />
  </div>
);

export const Bug = () => (
  <div style={darkGround}>
    <GsnLockup variant="bug" size={32} />
  </div>
);
