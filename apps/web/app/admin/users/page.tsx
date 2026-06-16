import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@sports/db";

export default async function AdminUsersPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/");
  }

  const users = await db.user.findMany({
    include: {
      subscription: {
        select: { tier: true, status: true, currentPeriodEnd: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="min-h-screen bg-obsidian p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Users</h1>
            <p className="text-ion-2 mt-1">{users.length} users (last 100)</p>
          </div>
          <a href="/admin" className="text-ion-2 hover:text-white text-sm">← Back to Admin</a>
        </div>

        <div className="bg-carbon border border-titanium rounded-xl overflow-hidden">
          <table className="w-full text-sm">
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
                    <div className="text-white">{user.name ?? "—"}</div>
                    <div className="text-xs text-ion-3">{user.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      user.role === "ADMIN"
                        ? "bg-red-500/10 text-red-400"
                        : "bg-titanium text-ion-2"
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      user.subscription?.tier === "ELITE" ? "bg-yellow-400/10 text-yellow-400" :
                      user.subscription?.tier === "PRO" ? "bg-blue-500/10 text-blue-400" :
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
