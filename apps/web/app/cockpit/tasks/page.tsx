import Link from "next/link";
import { db } from "@sports/db";
import { AGENTS } from "@/lib/cockpit/agents";
import type { CockpitTaskStatus } from "@prisma/client";

// Operator data is read per request; never statically prerendered.
export const dynamic = "force-dynamic";

// Interrupt-priority first: an operator scanning the queue should see what
// needs them (review, blocked) before the in-flight/resolved lanes — the
// same "urgent reads first" principle as the overview's Decision Queue.
const STATUS_GROUPS: ReadonlyArray<{
  label: string;
  statuses: readonly CockpitTaskStatus[];
  tone: "bad" | "warn" | "neutral";
}> = [
  { label: "Needs review", statuses: ["NEEDS_REVIEW"], tone: "warn" },
  { label: "Blocked", statuses: ["BLOCKED"], tone: "bad" },
  { label: "Active", statuses: ["NEW", "ROUTED", "DRAFTED"], tone: "neutral" },
  { label: "Resolved", statuses: ["APPROVED", "REJECTED", "ARCHIVED"], tone: "neutral" },
];

// Accent only appears when there's actually something in the lane — an
// empty Blocked/Needs-review group stays as calm as Active/Resolved instead
// of manufacturing urgency it can't back up.
function groupBorderClass(tone: "bad" | "warn" | "neutral", count: number): string {
  if (count === 0) return "border-titanium/40";
  if (tone === "bad") return "border-alert/50";
  if (tone === "warn") return "border-caution/50";
  return "border-titanium/40";
}

function groupCountClass(tone: "bad" | "warn" | "neutral", count: number): string {
  if (count === 0) return "bg-obsidian/60 text-ion-3";
  if (tone === "bad") return "bg-alert/30 text-alert";
  if (tone === "warn") return "bg-caution/30 text-caution";
  return "bg-obsidian/60 text-ion-2";
}

export default async function CockpitTasksPage() {
  const tasks = await db.cockpitTask
    .findMany({
      orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
      take: 200,
    })
    // Fail-open: a transient DB blip degrades to clean empty status groups
    // ("No items.") instead of the cockpit error banner.
    .catch(() => [] as Awaited<ReturnType<typeof db.cockpitTask.findMany>>);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold text-ion-white">Task queue</h1>
        <p className="mt-1 text-sm text-ion-3">
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
              className={[
                "rounded-2xl border bg-eclipse/40 p-4",
                groupBorderClass(group.tone, items.length),
              ].join(" ")}
            >
              <header className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-widest text-ion-2">
                  {group.label}
                </h2>
                <span
                  className={[
                    "rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
                    groupCountClass(group.tone, items.length),
                  ].join(" ")}
                >
                  {items.length}
                </span>
              </header>
              {items.length === 0 ? (
                <p className="text-xs text-ion-3">No items.</p>
              ) : (
                <ul className="space-y-2">
                  {items.map((t) => (
                    <li
                      key={t.id}
                      className="rounded-lg border border-titanium/40 bg-obsidian/50 p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <Link
                          href={`/cockpit/tasks/${t.id}`}
                          className="text-sm font-medium text-ion-white hover:text-ion-white"
                        >
                          {t.title}
                        </Link>
                        <span className="shrink-0 rounded-full bg-obsidian/70 px-2 py-0.5 text-[10px] font-semibold text-ion-1">
                          {t.status}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-ion-3">
                        {AGENTS[t.assignedAgent].displayName} · priority {t.priority} · {t.riskLevel}
                        {t.complianceStatus !== "NOT_APPLICABLE" && (
                          <span className="ml-2 rounded bg-caution/30 px-1.5 py-0.5 text-[10px] font-semibold text-caution">
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
