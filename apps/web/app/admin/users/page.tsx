import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@sports/db";
import { UsersTable, type AdminUserRow } from "./users-table";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/");
  }

  const [users, audit] = await Promise.all([
    db.user.findMany({
      include: {
        subscription: { select: { tier: true, status: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    db.operatorAuditLog
      .findMany({ orderBy: { createdAt: "desc" }, take: 20 })
      .catch(() => []),
  ]);

  const rows: AdminUserRow[] = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    compedTier: u.compedTier === "FREE" ? null : u.compedTier,
    subscriptionTier: u.subscription?.tier ?? null,
    subscriptionStatus: u.subscription?.status ?? null,
    createdAt: u.createdAt.toLocaleDateString(),
  }));

  return (
    <div className="min-h-screen bg-gray-950 p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Users</h1>
            <p className="mt-1 text-gray-400">
              {users.length} users (last 100). Comp grants paid access regardless
              of billing; the Stripe webhook never overwrites a comp.
            </p>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <a href="/cockpit" className="text-orbital-cyan hover:text-ion">
              Cockpit →
            </a>
            <a href="/admin" className="text-gray-400 hover:text-white">
              ← Admin
            </a>
          </div>
        </div>

        <UsersTable users={rows} currentUserId={session.user.id} />

        {/* Operator audit trail */}
        <div className="mt-10">
          <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-orbital-cyan">
            Operator audit trail
          </h2>
          <div className="divide-y divide-gray-800/60 rounded-xl border border-gray-800 bg-gray-900">
            {audit.length === 0 ? (
              <p className="px-4 py-5 text-sm text-gray-500">
                No operator actions logged yet.
              </p>
            ) : (
              audit.map((a) => (
                <div
                  key={a.id}
                  className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className="text-sm text-gray-200">{a.summary}</span>
                  <span className="font-mono text-[11px] text-gray-500">
                    {a.actorEmail} · {a.createdAt.toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
