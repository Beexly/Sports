// Authored design-sync preview for MobileNav.
// FIXTURE: layout fixture only. MobileNav takes no props and its panel is internal
// useState(false) with no controlled-open prop, so only the closed trigger can be
// rendered statically here (per design-sync fixture policy for uncontrollable state).
import { MobileNav } from "sports-prediction-platform";

const barGround: React.CSSProperties = {
  background: "var(--carbon)",
  padding: "12px 16px",
  minHeight: 44,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  maxWidth: 420,
};

export const InHeaderBar = () => (
  <div style={barGround}>
    <span style={{ color: "var(--ion-white, #fff)", fontSize: 13, fontWeight: 700, letterSpacing: "0.04em" }}>
      GALAXY SPORTS EDGE
    </span>
    <MobileNav />
  </div>
);

export const Closed = () => (
  <div style={{ background: "var(--carbon)", padding: 16, minHeight: 60 }}>
    <MobileNav />
  </div>
);
