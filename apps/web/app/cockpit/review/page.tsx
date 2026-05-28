import Link from "next/link";
import { db } from "@sports/db";
import { AGENTS } from "@/lib/cockpit/agents";

export default async function CockpitReviewPage() {
  const items = await db.cockpitTask.findMany({
    where: { status: { in: ["NEEDS_REVIEW", "BLOCKED"] } },
    orderBy: [{ priority: "desc" }, { updatedAt: "asc" }],
    take: 100,
    include: { decisions: { orderBy: { createdAt: "desc" }, take: 1 } },
  });

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold text-white">Review queue</h1>
        <p className="mt-1 text-sm text-gray-500">
          Items awaiting a human decision. Each row links to the full audit trail.
        </p>
      </header>

      {items.length === 0 ? (
        <p
          data-testid="review-empty"
          className="rounded-xl border border-mineral bg-gray-900/40 p-6 text-sm text-gray-500"
        >
          Nothing in review. Operator queue is clear.
        </p>
      ) : (
        <ul data-testid="review-list" className="divide-y divide-gray-800 rounded-2xl border border-mineral">
          {items.map((t) => (
            <li key={t.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <Link
                  href={`/cockpit/tasks/${t.id}`}
                  className="text-sm font-medium text-gray-100 hover:text-white"
                >
                  {t.title}
                </Link>
                <p className="mt-0.5 text-[11px] text-gray-500">
                  {AGENTS[t.assignedAgent].displayName} · priority {t.priority} · risk {t.riskLevel}
                  {t.complianceStatus !== "NOT_APPLICABLE" && (
                    <span className="ml-2 rounded bg-yellow-900/30 px-1.5 py-0.5 text-[10px] font-semibold text-yellow-300">
                      {t.complianceStatus}
                    </span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={[
                    "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                    t.status === "NEEDS_REVIEW"
                      ? "bg-yellow-900/40 text-yellow-200"
                      : "bg-red-900/40 text-red-200",
                  ].join(" ")}
                >
                  {t.status}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
