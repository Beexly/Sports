// Authored design-sync preview for MethodologySection.
// FIXTURE: the ledger figures below are layout fixtures for the design tool.
import { MethodologySection } from "sports-prediction-platform";

export const WithLedger = () => (
  <MethodologySection
    metrics={{
      settled: 458,
      cleared: 12,
      gated: 3,
      playerRows: 2140,
      lastRefresh: new Date(Date.now() - 6 * 60_000).toISOString(),
    }}
  />
);

export const NoLedger = () => <MethodologySection />;
