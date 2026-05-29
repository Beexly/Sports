import Link from "next/link";
import { db } from "@sports/db";
import { AGENTS } from "@/lib/cockpit/agents";
import type { CockpitTaskStatus } from "@prisma/client";

// Operator data is read per request; never statically prerendered.
export const dynamic = "force-dynamic";

const STATUS_GROUPS: ReadonlyArray<{
  label: string;
  statuses: readonly CockpitTaskStatus[];
}> = [
  { label: "Active", statuses: ["NEW", "ROUTED", "DRAFTED"] },
  { label: "Needs review", statuses: ["NEEDS_REVIEW"] },
  { label: "Blocked", statuses: ["BLOCKED"] },
  { label: "Resolved", statuses: ["APPROVED", "REJECTED", "ARCHIVED"] },
];

export default async function CockpitTasksPage() {
  const tasks = await db.cockpitTask.findMany({
    orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
    take: 200,
  });

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold text-white">Task queue</h1>
        <p className="mt-1 text-sm text-gray-500">
          Grouped by status. Click any row for the full decision history.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {STATUS_GROUPS.map((group) => {
          const items = tasks.filter((t) => group.statuses.includes(t.status));
          return (
            <section
              key={group.label}
              data-testid={`task-group-${group.label}`}
              className="rounded-2xl border border-gray-800 bg-gray-900/40 p-4"
            >
              <header className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400">
                  {group.label}
                </h2>
                <span className="text-xs text-gray-500">{items.length}</span>
              </header>
              {items.length === 0 ? (
                <p className="text-xs text-gray-600">No items.</p>
              ) : (
                <ul className="space-y-2">
                  {items.map((t) => (
                    <li
                      key={t.id}
                      className="rounded-lg border border-gray-800 bg-gray-950/40 p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <Link
                          href={`/cockpit/tasks/${t.id}`}
                          className="text-sm font-medium text-gray-100 hover:text-white"
                        >
                          {t.title}
                        </Link>
                        <span className="shrink-0 rounded-full bg-gray-800 px-2 py-0.5 text-[10px] font-semibold text-gray-200">
                          {t.status}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-gray-500">
                        {AGENTS[t.assignedAgent].displayName} · priority {t.priority} · {t.riskLevel}
                        {t.complianceStatus !== "NOT_APPLICABLE" && (
                          <span className="ml-2 rounded bg-yellow-900/30 px-1.5 py-0.5 text-[10px] font-semibold text-yellow-300">
                            {t.complianceStatus}
                          </span>
                        )}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
