// Authored design-sync preview for EvidenceAuditDrawer.
// FIXTURE: pickId below is a layout fixture. The drawer fetches its content on open, so
// only the closed trigger is rendered here (per design-sync fixture policy for fetch-on-mount components).
import { EvidenceAuditDrawer } from "sports-prediction-platform";

const ground: React.CSSProperties = { background: "var(--carbon)", padding: 24, borderRadius: 16, maxWidth: 340 };

export const Trigger = () => (
  <div style={ground}>
    <EvidenceAuditDrawer pickId="fixture-pick-0001" />
  </div>
);

export const CustomLabel = () => (
  <div style={ground}>
    <EvidenceAuditDrawer pickId="fixture-pick-0002" label="See the receipts" />
  </div>
);
