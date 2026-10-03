/**
 * Cockpit loader for the NOVA Founder OS surfaces
 * (`app/cockpit/nova/page.tsx`, `app/cockpit/nova/founder/page.tsx`).
 *
 * Follows the same convention as `lib/claude-api/dashboard.ts`'s
 * `loadClaudeApiCostsDashboard(now = new Date())`: an async loader that
 * returns one typed, already-derived summary for a server component to
 * render, with `now` defaulted for caller convenience and overridable in
 * tests. This loader touches no database — S4 is read-models-only over
 * S1/S2/S3's in-repo TypeScript contracts/data plus (today, empty)
 * injected settlement/control-plane read models — so it has no Prisma
 * import, unlike the DB-backed loaders elsewhere in `lib/`.
 */
import {
  buildFounderDailyBrief,
  DEFAULT_OPPORTUNITY_SOURCES,
  getCapabilityGovernanceRecords,
  getCapabilityInventory,
  type ControlPlaneConfigurationEventReadModel,
  type CreditGrantSnapshot,
  type FounderDailyBrief,
  type SettlementAnomalyReadModel,
} from "@/lib/opportunity-engine";

export interface NovaFounderOsSummary {
  readonly brief: FounderDailyBrief;
  readonly capabilityInventorySize: number;
  readonly capabilityGovernanceRecordCount: number;
  readonly sourceRegistrySize: number;
  readonly creditSnapshotCount: number;
  readonly settlementAnomalyCount: number;
  readonly controlPlaneEventCount: number;
}

export interface NovaFounderOsSummaryOptions {
  readonly now?: Date;
  /** Injected real read models for the two lanes S4 does not own the data
   *  for. Empty by default — neither the settlement outbox (#161) nor the
   *  AI control plane (#162-164) is merged yet, so there is nothing real to
   *  inject today. This loader never fabricates rows to fill the gap. */
  readonly creditSnapshots?: readonly CreditGrantSnapshot[];
  readonly settlementAnomalies?: readonly SettlementAnomalyReadModel[];
  readonly controlPlaneEvents?: readonly ControlPlaneConfigurationEventReadModel[];
}

function dayWindow(now: Date): { readonly startIso: string; readonly endIso: string } {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

export async function loadNovaFounderOsSummary(
  options: NovaFounderOsSummaryOptions = {},
): Promise<NovaFounderOsSummary> {
  const now = options.now ?? new Date();
  const window = dayWindow(now);
  const creditSnapshots = options.creditSnapshots ?? [];
  const settlementAnomalies = options.settlementAnomalies ?? [];
  const controlPlaneEvents = options.controlPlaneEvents ?? [];

  const brief = buildFounderDailyBrief({
    now,
    windowStartIso: window.startIso,
    windowEndIso: window.endIso,
    runId: `cockpit-nova:${window.startIso}`,
    creditSnapshots,
    settlementAnomalies,
    controlPlaneEvents,
  });

  return {
    brief,
    capabilityInventorySize: getCapabilityInventory().length,
    capabilityGovernanceRecordCount: getCapabilityGovernanceRecords().length,
    sourceRegistrySize: DEFAULT_OPPORTUNITY_SOURCES.length,
    creditSnapshotCount: creditSnapshots.length,
    settlementAnomalyCount: settlementAnomalies.length,
    controlPlaneEventCount: controlPlaneEvents.length,
  };
}
