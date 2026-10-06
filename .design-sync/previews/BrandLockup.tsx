// Authored design-sync preview for BrandLockup.
// FIXTURE: layout fixture only — renders the official horizontal lockup.
import { BrandLockup } from "sports-prediction-platform";

const paperGround: React.CSSProperties = { background: "#fff", padding: 24, borderRadius: 16 };
const darkGround: React.CSSProperties = { background: "var(--carbon)", padding: 24, borderRadius: 16 };

export const Paper = () => (
  <div style={paperGround}>
    <BrandLockup kinetic={false} />
  </div>
);

export const Dark = () => (
  <div style={darkGround}>
    <BrandLockup kinetic={false} />
  </div>
);

export const Compact = () => (
  <div style={darkGround}>
    <BrandLockup compact kinetic={false} />
  </div>
);
