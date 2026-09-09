// Authored design-sync preview for HoloTilt.
// FIXTURE: card copy below is illustrative layout text, not a product pick.
// HoloTilt only arms pointer-driven tilt on a fine pointer + no reduced-motion
// match, which the static capture environment does not satisfy, so it renders
// the plain wrapped child untouched — exactly what this preview shows.
import type { CSSProperties } from "react";
import { HoloTilt } from "sports-prediction-platform";

const card: CSSProperties = {
  background: "var(--eclipse)",
  border: "1px solid var(--mineral)",
  borderRadius: 16,
  padding: 24,
  width: 280,
  color: "var(--ion-white)",
};

const darkGround: CSSProperties = { background: "var(--carbon)", padding: 24, borderRadius: 16 };

export const Card = () => (
  <div style={darkGround}>
    <HoloTilt>
      <div style={card}>
        <p style={{ margin: 0, font: "600 12px/1 var(--f-mono, monospace)", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ion-blue-glow, #00E5FF)" }}>
          Pro
        </p>
        <p style={{ margin: "10px 0 0", font: "700 22px/1.2 var(--f-display, sans-serif)" }}>Full board access</p>
        <p style={{ margin: "8px 0 0", font: "400 13px/1.5 var(--f-body, sans-serif)", color: "var(--ion-1)" }}>
          Every pick, every sport, with the full factor trail.
        </p>
      </div>
    </HoloTilt>
  </div>
);
