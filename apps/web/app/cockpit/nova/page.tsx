import Link from "next/link";
import { StatusTile } from "@/components/cockpit/status-tile";
import { loadNovaFounderOsSummary } from "@/lib/nova/founder-os-dashboard";
import type { FounderWorkLane } from "@/lib/opportunity-engine";

export const dynamic = "force-dynamic";

const LANE_LABEL: Readonly<Record<FounderWorkLane, string>> = {
  CAPABILITY_GOVERNANCE: "Capability governance",
  SOURCE_INTELLIGENCE: "Source intelligence",
  REVENUE_OPPORTUNITY: "Revenue opportunity",
  CREDIT_LIFECYCLE: "Credit lifecycle",
  SETTLEMENT_ANOMALY: "Settlement anomalies",
  CONTROL_PLANE_ECONOMICS: "Control-plane economics",
};

export default async function CockpitNovaPage(): Promise<JSX.Element> {
  const summary = await loadNovaFounderOsSummary();
  const brief = summary.brief;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-yellow-300">
              NOVA
            </p>
            <h1 className="mt-1 text-2xl font-bold text-ion-white">Founder OS Overview</h1>
          </div>
          <Link
            href="/cockpit/nova/founder"
            className="rounded-lg border border-titanium/40 px-3 py-1.5 text-xs text-ion-1 hover:bg-carbon/60"
          >
            Open owner queue →
          </Link>
        </div>
        <p className="max-w-3xl text-sm text-ion-2">
          Read-only rollup of NOVA&apos;s split units (S1 domain contracts, S2 capability
          governance, S3 source registry/evidence) plus settlement anomalies and AI
          control-plane economics, read into the one owner decision queue. This surface
          never writes state and never activates a capability, source, or spend on its own.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-4">
        <StatusTile
          label="Open items"
          value={String(brief.totalOpenItems)}
          tone={brief.totalOpenItems > 0 ? "info" : "good"}
        />
        <StatusTile
          label="Owner action required"
          value={String(brief.ownerActionRequiredCount)}
          tone={brief.ownerActionRequiredCount > 0 ? "warn" : "good"}
        />
        <StatusTile
          label="Agent-handled (logged only)"
          value={String(brief.agentHandledCount)}
          tone="neutral"
        />
        <StatusTile
          label="Generated"
          value={new Date(brief.generatedAtIso).toLocaleString("en-US")}
          tone="neutral"
        />
      </section>

      <section className="overflow-hidden rounded-lg border border-titanium/40 bg-obsidian/60">
        <div className="border-b border-titanium/40 px-4 py-3">
          <h2 className="text-sm font-semibold text-ion-white">Lanes</h2>
          <p className="mt-1 text-xs text-ion-3">
            One row per Founder OS lane (freeze §2 domain ownership). Zero open items in a
            lane means nothing needs founder attention there right now, not that the lane
            is unmonitored.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-titanium/30 text-sm">
            <thead className="bg-eclipse/50 text-left text-[11px] uppercase tracking-wider text-ion-3">
              <tr>
                <th scope="col" className="px-4 py-3">Lane</th>
                <th scope="col" className="px-4 py-3">Open</th>
                <th scope="col" className="px-4 py-3">Owner action</th>
                <th scope="col" className="px-4 py-3">Agent-handled</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-titanium/30">
              {brief.laneSummaries.map((lane) => (
                <tr key={lane.lane} className="text-ion-1">
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-ion-white">
                    {LANE_LABEL[lane.lane]}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">{lane.openCount}</td>
                  <td className="whitespace-nowrap px-4 py-3">{lane.ownerActionRequiredCount}</td>
                  <td className="whitespace-nowrap px-4 py-3">{lane.agentHandledCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg border border-titanium/40 bg-obsidian/60 p-4">
        <h2 className="text-sm font-semibold text-ion-white">Data sources for this brief</h2>
        <ul className="mt-3 grid gap-1 text-xs text-ion-3">
          <li>Capability governance (S2): {summary.capabilityInventorySize} inventory entries, {summary.capabilityGovernanceRecordCount} governance-ledger records.</li>
          <li>Source registry (S3): {summary.sourceRegistrySize} curated discovery sources.</li>
          <li>Credit-grant snapshots (S1): {summary.creditSnapshotCount} supplied (none wired yet — S5 materializes persistence).</li>
          <li>Settlement anomalies: {summary.settlementAnomalyCount} supplied (none wired yet — settlement outbox not merged).</li>
          <li>Control-plane events: {summary.controlPlaneEventCount} supplied (none wired yet — AI control plane not merged).</li>
        </ul>
      </section>
    </div>
  );
}
