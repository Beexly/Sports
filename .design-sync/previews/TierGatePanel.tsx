// Authored design-sync preview for TierGatePanel.
// FIXTURE: surface/blurb copy below is illustrative layout text. Price reads
// from the live Founding-phase env default (PRICING_PHASE is unset in this
// design tool, so getCurrentPricingPhase() falls back to FOUNDING).
import { TierGatePanel } from "sports-prediction-platform";

export const ProGate = () => (
  <TierGatePanel
    need="PRO"
    surface="Trend Lab"
    blurb="See the factor trail and line movement behind every pick on today's board."
  />
);

export const EliteGate = () => (
  <TierGatePanel
    need="ELITE"
    surface="CLV / line-value ledger"
    blurb="Track closing-line value on every pick you've followed, with real-time alerts when a line moves."
  />
);
