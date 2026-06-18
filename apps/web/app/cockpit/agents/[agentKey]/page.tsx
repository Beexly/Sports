import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@sports/db";
import { AGENTS, getAgent, type AgentKey } from "@/lib/cockpit/agents";

interface Params {
  agentKey: string;
}

function isAgentKey(s: string): s is AgentKey {
  return s in AGENTS;
}

export default async function CockpitAgentDetail({
  params,
}: {
  params: Params;
}) {
  if (!isAgentKey(params.agentKey)) {
    notFound();
  }
  const agent = getAgent(params.agentKey);

  const tasks = await db.cockpitTask.findMany({
    where: { assignedAgent: agent.key },
    orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
    take: 50,
  });

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/cockpit/agents" className="text-xs text-ink-500 hover:text-ink-300">
            ← All agents
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-white">{agent.displayName}</h1>
          <p className="mt-1 max-w-2xl text-sm text-ink-500">{agent.responsibility}</p>
        </div>
        <span className="rounded-full bg-obsidian/70 px-3 py-1 text-xs font-semibold text-ink-300">
          {tasks.length} task{tasks.length === 1 ? "" : "s"}
        </span>
      </header>

      {tasks.length === 0 ? (
        <p className="rounded-xl border border-white/[0.06] bg-white/[0.04]/40 p-6 text-sm text-ink-500">
          No tasks assigned to {agent.displayName} yet.
        </p>
      ) : (
        <ul className="divide-y divide-titanium/30 rounded-2xl border border-white/[0.06]">
          {tasks.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <Link
                  href={`/cockpit/tasks/${t.id}`}
                  className="text-sm font-medium text-ink-300 hover:text-white"
                >
                  {t.title}
                </Link>
                <p className="mt-0.5 text-[11px] text-ink-500">
                  source: {t.source} · priority {t.priority} · {t.riskLevel}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-obsidian/70 px-2 py-0.5 text-[10px] font-semibold text-ink-300">
                {t.status}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
