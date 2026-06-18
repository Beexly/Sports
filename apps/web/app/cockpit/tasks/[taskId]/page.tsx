import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@sports/db";
import { AGENTS } from "@/lib/cockpit/agents";
import { allowedTransitionsFrom } from "@/lib/cockpit/transitions";

export default async function CockpitTaskDetail({
  params,
}: {
  params: { taskId: string };
}) {
  const task = await db.cockpitTask.findUnique({
    where: { id: params.taskId },
    include: {
      decisions: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!task) notFound();

  const agent = AGENTS[task.assignedAgent];
  const allowed = allowedTransitionsFrom(task.status);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <Link href="/cockpit/tasks" className="text-xs text-ink-500 hover:text-ink-300">
          ← Tasks
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-white">{task.title}</h1>
        <p className="mt-1 text-xs text-ink-500">
          Assigned to <strong className="text-ink-300">{agent.displayName}</strong> ·
          source <code className="rounded bg-obsidian/70 px-1 text-[10px] text-ink-300">{task.source}</code>
        </p>
      </header>

      <section className="rounded-2xl border border-white/[0.06] bg-white/[0.04]/40 p-5">
        <dl className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
          <Field label="Status" value={task.status} />
          <Field label="Priority" value={String(task.priority)} />
          <Field label="Risk" value={task.riskLevel} />
          <Field label="Compliance" value={task.complianceStatus} />
        </dl>
        <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-ink-300">
          {task.description}
        </p>
        {task.decisionNotes && (
          <p className="mt-3 rounded-lg border border-white/[0.06] bg-obsidian/50 p-3 text-xs text-ink-400">
            <span className="text-ink-500">Latest note:</span> {task.decisionNotes}
          </p>
        )}
      </section>

      <section data-testid="allowed-transitions" className="rounded-2xl border border-white/[0.06] bg-white/[0.04]/40 p-5">
        <h2 className="mb-2 text-sm font-semibold text-white">Allowed transitions</h2>
        {allowed.length === 0 ? (
          <p className="text-xs text-ink-500">
            <strong className="text-ink-300">{task.status}</strong> is a terminal state.
            No further transitions are permitted.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-2 text-xs">
            {allowed.map((to) => (
              <li
                key={to}
                className="rounded-full border border-white/[0.06] bg-obsidian/70 px-2.5 py-0.5 font-semibold text-ink-300"
              >
                → {to}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-[11px] text-ink-500">
          Transitions are applied via the API at <code className="rounded bg-obsidian/70 px-1">PATCH /api/cockpit/tasks/{task.id}</code>. The
          service refuses any move outside this allow-list and writes a CockpitDecision row on success.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-white">Decision history</h2>
        {task.decisions.length === 0 ? (
          <p className="rounded-lg border border-white/[0.06] bg-white/[0.04]/40 p-4 text-xs text-ink-500">
            No decisions yet.
          </p>
        ) : (
          <ol className="space-y-3 border-l-2 border-white/[0.06] pl-4">
            {task.decisions.map((d) => (
              <li key={d.id}>
                <div className="flex items-baseline gap-3">
                  <span className="rounded-full bg-obsidian/70 px-2 py-0.5 text-[10px] font-semibold text-ink-300">
                    → {d.toStatus}
                  </span>
                  <time className="text-[11px] text-ink-500">
                    {d.createdAt.toUTCString()}
                  </time>
                </div>
                <p className="mt-1 text-xs text-ink-400">by {d.reviewer}</p>
                {d.note && (
                  <p className="mt-1 text-xs leading-relaxed text-ink-300">{d.note}</p>
                )}
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-widest text-ink-500">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold text-ink-300">{value}</dd>
    </div>
  );
}
