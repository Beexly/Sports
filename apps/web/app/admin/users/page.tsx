import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db, type Prisma } from "@sports/db";

const adminUsersQuery = {
  include: {
    subscription: {
      select: { tier: true, status: true, currentPeriodEnd: true },
    },
  },
  orderBy: { createdAt: "desc" },
  take: 100,
} satisfies Prisma.UserFindManyArgs;

export default async function AdminUsersPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/");
  }

  const users = await db.user
    .findMany(adminUsersQuery)
    // Fail-open: a transient DB error degrades to the page's existing
    // "No users yet." empty state instead of crashing the admin app.
    .catch(() => [] as Prisma.UserGetPayload<typeof adminUsersQuery>[]);

  return (
    <div className="min-h-screen bg-obsidian p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-ion-white">Users</h1>
            <p className="text-ion-2 mt-1">{users.length} users (last 100)</p>
          </div>
          <a href="/admin" className="text-ion-2 hover:text-ion-white text-sm">← Back to Admin</a>
        </div>

        <div className="bg-carbon border border-titanium rounded-xl overflow-hidden">
          <table className="w-full text-sm" aria-label="Users (last 100)">
            <thead>
              <tr className="border-b border-titanium text-ion-2 text-xs uppercase">
                <th className="text-left px-4 py-3">User</th>
                <th className="text-left px-4 py-3">Role</th>
                <th className="text-left px-4 py-3">Subscription Tier</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-titanium/50 hover:bg-titanium/30">
                  <td className="px-4 py-3">
                    <div className="text-ion-white">{user.name ?? "—"}</div>
                    <div className="text-xs text-ion-3">{user.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      user.role === "ADMIN"
                        ? "bg-alert/10 text-alert"
                        : "bg-titanium text-ion-2"
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      user.subscription?.tier === "ELITE" ? "bg-caution/10 text-caution" :
                      user.subscription?.tier === "PRO" ? "bg-orbital-cyan/10 text-orbital-cyan" :
                      "bg-titanium text-ion-2"
                    }`}>
                      {user.subscription?.tier ?? "FREE"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ion-2 text-xs">
                    {user.subscription?.status ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-ion-3 text-xs">
                    {user.createdAt.toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-ion-3">
                    No users yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
