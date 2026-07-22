import Link from "next/link";
import { loadNovaFounderOsSummary } from "@/lib/nova/founder-os-dashboard";
import type {
  FounderWorkAuthority,
  FounderWorkItem,
  FounderWorkLane,
} from "@/lib/opportunity-engine";

export const dynamic = "force-dynamic";

const LANE_LABEL: Readonly<Record<FounderWorkLane, string>> = {
  CAPABILITY_GOVERNANCE: "Capability governance",
  SOURCE_INTELLIGENCE: "Source intelligence",
  REVENUE_OPPORTUNITY: "Revenue opportunity",
  CREDIT_LIFECYCLE: "Credit lifecycle",
  SETTLEMENT_ANOMALY: "Settlement anomalies",
  CONTROL_PLANE_ECONOMICS: "Control-plane economics",
};

const AUTHORITY_STYLES: Readonly<Record<FounderWorkAuthority, string>> = {
  AGENT_INTERNAL: "border-titanium/40 bg-eclipse/50 text-ion-2",
  AGENT_THEN_OWNER: "border-yellow-500/30 bg-yellow-950/40 text-yellow-200",
  OWNER_ONLY: "border-red-500/30 bg-red-950/40 text-red-200",
};

const AUTHORITY_LABEL: Readonly<Record<FounderWorkAuthority, string>> = {
  AGENT_INTERNAL: "Agent — logged only",
  AGENT_THEN_OWNER: "Agent proposes, owner confirms",
  OWNER_ONLY: "Owner only",
};

export default async function CockpitFounderQueuePage(): Promise<JSX.Element> {
  const summary = await loadNovaFounderOsSummary();
  const brief = summary.brief;

  const openItems = brief.items.filter(
    (item) => item.state !== "RESOLVED" && item.state !== "DISMISSED",
  );

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-yellow-300">
              NOVA · Founder OS
            </p>
            <h1 className="mt-1 text-2xl font-bold text-ion-white">Owner Decision Queue</h1>
          </div>
          <Link
            href="/cockpit/nova"
            className="rounded-lg border border-titanium/40 px-3 py-1.5 text-xs text-ion-1 hover:bg-carbon/60"
          >
            ← Overview
          </Link>
        </div>
        <p className="max-w-3xl text-sm text-ion-2">
          The single owner queue (freeze §2: &quot;one cockpit, one owner queue&quot;). Every
          row is a real read model derived from S1/S2/S3 output or an injected
          settlement/control-plane read model — nothing here is placeholder data, and
          nothing on this page can activate a capability, enable a source, or spend money.
        </p>
      </header>

      {openItems.length === 0 ? (
        <p className="rounded-lg border border-titanium/40 bg-obsidian/60 p-4 text-sm text-ion-3">
          No open Founder OS work items right now.
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-titanium/40 bg-obsidian/60">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-titanium/30 text-sm">
              <thead className="bg-eclipse/50 text-left text-[11px] uppercase tracking-wider text-ion-3">
                <tr>
                  <th scope="col" className="px-4 py-3">Priority</th>
                  <th scope="col" className="px-4 py-3">Lane</th>
                  <th scope="col" className="px-4 py-3">Item</th>
                  <th scope="col" className="px-4 py-3">State</th>
                  <th scope="col" className="px-4 py-3">Authority</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-titanium/30">
                {openItems.map((item) => (
                  <WorkItemRow key={item.id} item={item} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <section className="rounded-lg border border-titanium/40 bg-obsidian/60 p-4">
        <h2 className="text-sm font-semibold text-ion-white">Legend</h2>
        <ul className="mt-3 grid gap-1 text-xs text-ion-3">
          <li><span className="text-ion-1">Agent — logged only:</span> NOVA may note this and log it; no owner input needed.</li>
          <li><span className="text-ion-1">Agent proposes, owner confirms:</span> NOVA may propose a disposition; only the owner confirms it.</li>
          <li><span className="text-ion-1">Owner only:</span> only a human owner decision resolves this — NOVA never acts here.</li>
        </ul>
      </section>
    </div>
  );
}

function WorkItemRow({ item }: { readonly item: FounderWorkItem }): JSX.Element {
  return (
    <tr className="align-top text-ion-1">
      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">{item.priorityBand}</td>
      <td className="whitespace-nowrap px-4 py-3">{LANE_LABEL[item.lane]}</td>
      <td className="px-4 py-3">
        <p className="font-medium text-ion-white">{item.title}</p>
        <p className="mt-1 max-w-xl text-xs text-ion-3">{item.summary}</p>
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-xs">{item.state}</td>
      <td className="whitespace-nowrap px-4 py-3">
        <span
          className={`inline-flex rounded-full border px-2 py-1 text-[11px] ${AUTHORITY_STYLES[item.authority]}`}
        >
          {AUTHORITY_LABEL[item.authority]}
        </span>
      </td>
    </tr>
  );
}
