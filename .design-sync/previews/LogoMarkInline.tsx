// Authored design-sync preview for LogoMarkInline.
// FIXTURE: the brand mark rendered at a size sweep, layout fixture only.
import { LogoMarkInline } from "sports-prediction-platform";

const row: React.CSSProperties = { display: "flex", alignItems: "center", gap: 24 };
const paperGround: React.CSSProperties = { ...row, background: "#fff", padding: 24, borderRadius: 16 };
const darkGround: React.CSSProperties = { ...row, background: "var(--carbon)", padding: 24, borderRadius: 16 };

// The full-color mark's blade renders near-white (#F5F7FF); on a light ground
// the component's own `color` prop (documented for "ink-on-white" use) gives
// a monochrome mark that stays visible instead of disappearing into the page.
export const OnWhite = () => (
  <div style={paperGround}>
    <LogoMarkInline size={24} color="var(--carbon)" />
    <LogoMarkInline size={48} color="var(--carbon)" />
    <LogoMarkInline size={96} color="var(--carbon)" />
  </div>
);

export const OnDark = () => (
  <div style={darkGround}>
    <LogoMarkInline size={24} />
    <LogoMarkInline size={48} />
    <LogoMarkInline size={96} />
  </div>
);

export const GlowPulse = () => (
  <div style={darkGround}>
    <LogoMarkInline size={64} glow pulse />
  </div>
);
