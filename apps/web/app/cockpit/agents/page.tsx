import Link from "next/link";
import { db } from "@sports/db";
import { listAgents } from "@/lib/cockpit/agents";

export const dynamic = "force-dynamic";

export default async function CockpitAgentsPage() {
  const byAgent = await db.cockpitTask.groupBy({
    by: ["assignedAgent", "status"],
    _count: { _all: true },
  });

  function countFor(key: string, status?: string): number {
    return byAgent
      .filter((g) => g.assignedAgent === key && (!status || g.status === status))
      .reduce((acc, g) => acc + g._count._all, 0);
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold text-white">Operator agents</h1>
        <p className="mt-1 text-sm text-gray-500">
          Six internal roles. Each ships drafts only; no external action runs
          without explicit human approval.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {listAgents().map((agent) => (
          <article
            key={agent.key}
            data-testid={`agent-card-${agent.key}`}
            className="flex flex-col gap-3 rounded-2xl border border-gray-800 bg-gray-900/40 p-5"
          >
            <header className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-white">{agent.displayName}</h2>
                <p className="text-[10px] uppercase tracking-widest text-gray-600">
                  {agent.key}
                </p>
              </div>
              <Link
                href={`/cockpit/agents/${agent.key}`}
                className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1 text-xs text-gray-200 hover:bg-gray-700"
              >
                Open queue
              </Link>
            </header>

            <p className="text-sm leading-relaxed text-gray-400">{agent.responsibility}</p>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-gray-800/60 py-2">
                <p className="text-[10px] uppercase text-gray-500">Open</p>
                <p className="text-base font-bold text-white">{countFor(agent.key)}</p>
              </div>
              <div className="rounded-lg bg-yellow-900/20 py-2">
                <p className="text-[10px] uppercase text-yellow-400">Review</p>
                <p className="text-base font-bold text-yellow-300">
                  {countFor(agent.key, "NEEDS_REVIEW")}
                </p>
              </div>
              <div className="rounded-lg bg-red-900/20 py-2">
                <p className="text-[10px] uppercase text-red-400">Blocked</p>
                <p className="text-base font-bold text-red-300">
                  {countFor(agent.key, "BLOCKED")}
                </p>
              </div>
            </div>

            <details className="text-xs text-gray-500">
              <summary className="cursor-pointer text-gray-400">Safe actions</summary>
              <ul className="mt-2 ml-4 list-disc space-y-1">
                {agent.safeActions.map((s) => (
                  <li key={s}>{s}</li>
                ))}
                <li className="text-yellow-500">External actions: {agent.externalActions}</li>
              </ul>
            </details>
          </article>
        ))}
      </div>
    </div>
  );
}
