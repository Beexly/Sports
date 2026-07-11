import Link from "next/link";
import { db, type Prisma } from "@sports/db";
import { AGENTS } from "@/lib/cockpit/agents";
import { requireCockpitAdmin } from "@/lib/cockpit/require-admin";

// Operator data is read per request; never statically prerendered.
export const dynamic = "force-dynamic";

const reviewQueueQuery = {
  where: { status: { in: ["NEEDS_REVIEW", "BLOCKED"] } },
  orderBy: [{ priority: "desc" }, { updatedAt: "asc" }],
  take: 100,
  include: { decisions: { orderBy: { createdAt: "desc" }, take: 1 } },
} satisfies Prisma.CockpitTaskFindManyArgs;

export default async function CockpitReviewPage() {
  await requireCockpitAdmin();
  const items = await db.cockpitTask
    .findMany(reviewQueueQuery)
    // Fail-open: a transient DB blip degrades to the existing "Nothing in
    // review" empty state instead of tripping cockpit/error.tsx. GetPayload
    // keeps task.decisions typed through the included relation.
    .catch(() => [] as Prisma.CockpitTaskGetPayload<typeof reviewQueueQuery>[]);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold text-ion-white">Review queue</h1>
        <p className="mt-1 text-sm text-ion-3">
          Items awaiting a human decision. Each row links to the full audit trail.
        </p>
      </header>

      {items.length === 0 ? (
        <p
          data-testid="review-empty"
          className="rounded-xl border border-titanium/40 bg-eclipse/40 p-6 text-sm text-ion-3"
        >
          Nothing in review. Operator queue is clear.
        </p>
      ) : (
        <ul data-testid="review-list" className="divide-y divide-titanium/30 rounded-2xl border border-titanium/40">
          {items.map((t) => (
            <li key={t.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <Link
                  href={`/cockpit/tasks/${t.id}`}
                  className="text-sm font-medium text-ion-white hover:text-ion-white"
                >
                  {t.title}
                </Link>
                <p className="mt-0.5 text-[11px] text-ion-3">
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
