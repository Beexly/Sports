import Link from "next/link";
import { db } from "@sports/db";
import { listAgents } from "@/lib/cockpit/agents";
import { AgentStatusRail } from "@/components/cockpit/agent-status-rail";
import { StatusTile } from "@/components/cockpit/status-tile";
import { summarizeAgentHealth } from "@/lib/agents/agent-health";

// Operator data is read per request; never statically prerendered.
export const dynamic = "force-dynamic";

export default async function CockpitAgentsPage() {
  const groupByPromise = db.cockpitTask.groupBy({
    by: ["assignedAgent", "status"],
    _count: { _all: true },
  });
  type AgentGroup = Awaited<typeof groupByPromise>[number];
  // Fail-open: a transient DB blip degrades to all-zero counts instead of
  // crashing the operator agents page; countFor's .filter/.reduce are safe
  // on an empty array.
  const byAgent = await groupByPromise.catch(() => [] as AgentGroup[]);

  function countFor(key: string, status?: string): number {
    return byAgent
      .filter((g) => g.assignedAgent === key && (!status || g.status === status))
      .reduce((acc, g) => acc + g._count._all, 0);
  }

  const agentReality = summarizeAgentHealth();

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ion-white">Operator agents</h1>
          <p className="mt-1 text-sm text-ion-3">
            Six internal roles. Each ships drafts only; no external action runs
            without explicit human approval.
          </p>
        </div>
        <AgentStatusRail summary={agentReality} />
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {listAgents().map((agent) => (
          <article
            key={agent.key}
            data-testid={`agent-card-${agent.key}`}
            className="flex flex-col gap-3 rounded-2xl border border-titanium/40 bg-eclipse/40 p-5"
          >
            <header className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-ion-white">{agent.displayName}</h2>
                <p className="text-label uppercase tracking-widest text-ion-3">
                  {agent.key}
                </p>
              </div>
              <Link
                href={`/cockpit/agents/${agent.key}`}
                className="rounded-lg border border-titanium/40 bg-obsidian/70 px-3 py-1 text-xs text-ion-1 hover:bg-titanium/40"
              >
                Open queue
              </Link>
            </header>

            <p className="text-sm leading-relaxed text-ion-2">{agent.responsibility}</p>

            <div className="grid grid-cols-3 gap-2 text-center">
              <StatusTile label="Open" value={String(countFor(agent.key))} tone="neutral" />
              <StatusTile
                label="Review"
                value={String(countFor(agent.key, "NEEDS_REVIEW"))}
                tone="warn"
              />
              <StatusTile
                label="Blocked"
                value={String(countFor(agent.key, "BLOCKED"))}
                tone="bad"
              />
            </div>

            <details className="text-xs text-ion-3">
              <summary className="cursor-pointer text-ion-2">Safe actions</summary>
              <ul className="mt-2 ml-4 list-disc space-y-1">
                {agent.safeActions.map((s) => (
                  <li key={s}>{s}</li>
                ))}
                <li className="text-caution">External actions: {agent.externalActions}</li>
              </ul>
            </details>
          </article>
        ))}
      </div>
    </div>
  );
}
