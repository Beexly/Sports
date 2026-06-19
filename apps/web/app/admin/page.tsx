import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@sports/db";

// Admin surfaces are auth-gated and read live data — never statically
// prerendered (stale data + couples the build to DB connectivity).
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/");
  }

  // Dashboard stats
  const [
    totalUsers,
    activeSubscriptions,
    todayPicks,
    lastIngestionRun,
    publishedPosts,
  ] = await Promise.all([
    db.user.count(),
    db.subscription.count({ where: { status: { in: ["ACTIVE", "TRIALING"] }, tier: { not: "FREE" } } }),
    db.pick.count({ where: { generatedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } } }),
    db.ingestionRun.findFirst({ orderBy: { startedAt: "desc" } }),
    db.blogPost.count({ where: { status: "PUBLISHED" } }),
  ]);

  const cards = [
    { label: "Total Users", value: totalUsers, color: "bg-blue-500" },
    { label: "Active Paid Subscriptions", value: activeSubscriptions, color: "bg-green-500" },
    { label: "Today's Picks", value: todayPicks, color: "bg-purple-500" },
    { label: "Published Posts", value: publishedPosts, color: "bg-yellow-500" },
  ];

  return (
    <div className="min-h-screen bg-obsidian p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-2">Admin Dashboard</h1>
        <p className="text-ink-400 mb-8">Platform overview and controls</p>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {cards.map((card) => (
            <div key={card.label} className="bg-white/[0.03] border border-white/[0.10] rounded-xl p-6">
              <div className={`w-10 h-10 ${card.color} rounded-lg mb-3 opacity-80`} />
              <p className="text-3xl font-bold text-white">{card.value.toLocaleString()}</p>
              <p className="text-ink-400 text-sm mt-1">{card.label}</p>
            </div>
          ))}
        </div>

        {/* System Status */}
        <div className="bg-white/[0.03] border border-white/[0.10] rounded-xl p-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">System Status</h2>
          {lastIngestionRun ? (
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${
                  lastIngestionRun.status === "SUCCESS" ? "bg-green-500" :
                  lastIngestionRun.status === "RUNNING" ? "bg-yellow-500" : "bg-red-500"
                }`} />
                <span className="text-ink-300">
                  Last ingestion: <strong className="text-white">{lastIngestionRun.status}</strong>
                </span>
                <span className="text-ink-500 text-sm">
                  {lastIngestionRun.startedAt.toLocaleString()}
                </span>
              </div>
              {lastIngestionRun.errorMessage && (
                <p className="text-red-400 text-sm ml-6">{lastIngestionRun.errorMessage}</p>
              )}
            </div>
          ) : (
            <p className="text-ink-400">No ingestion runs yet</p>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white/[0.03] border border-white/[0.10] rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            <a
              href="/admin/dashboard"
              className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors text-sm font-medium"
            >
              ⚡ Operator Dashboard
            </a>
            <TriggerRefreshButton />
            <a
              href="/admin/picks"
              className="px-4 py-2 bg-white/[0.08] text-white rounded-lg hover:bg-white/[0.08] transition-colors text-sm"
            >
              Manage Picks
            </a>
            <a
              href="/admin/posts"
              className="px-4 py-2 bg-white/[0.08] text-white rounded-lg hover:bg-white/[0.08] transition-colors text-sm"
            >
              Manage Posts
            </a>
            <a
              href="/admin/users"
              className="px-4 py-2 bg-white/[0.08] text-white rounded-lg hover:bg-white/[0.08] transition-colors text-sm"
            >
              Manage Users
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function TriggerRefreshButton() {
  return (
    <form
      action={async () => {
        "use server";
        const response = await fetch(
          `${process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000"}/api/admin/trigger-refresh`,
          { method: "POST" }
        );
        if (!response.ok) console.error("Refresh failed");
      }}
    >
      <button
        type="submit"
        className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors text-sm font-medium"
      >
        Trigger Data Refresh
      </button>
    </form>
  );
}
