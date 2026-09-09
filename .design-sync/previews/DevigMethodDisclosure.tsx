// Authored design-sync preview for DevigMethodDisclosure.
// FIXTURE: de-vig percentages below are layout fixtures, not a live market read.
import { DevigMethodDisclosure } from "sports-prediction-platform";

const ground: React.CSSProperties = { background: "var(--carbon)", padding: 24, borderRadius: 16, maxWidth: 340 };

export const MethodsDisagree = () => (
  <div style={ground}>
    <p style={{ color: "var(--ion-1)", fontSize: 13, margin: 0 }}>Market fair (de-vig): 62.0%</p>
    <DevigMethodDisclosure proportional={0.62} shin={0.635} />
  </div>
);

export const MethodsAgree = () => (
  <div style={ground}>
    <p style={{ color: "var(--ion-1)", fontSize: 13, margin: 0 }}>Market fair (de-vig): 51.0%</p>
    <DevigMethodDisclosure proportional={0.51} shin={0.511} />
    <p style={{ color: "var(--ion-3)", fontSize: 11, marginTop: 6 }}>
      (Nothing renders below — the two methods agree, so the disclosure stays silent.)
    </p>
  </div>
);
