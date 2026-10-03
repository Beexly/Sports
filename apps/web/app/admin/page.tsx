import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@sports/db";

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
    { label: "Total Users", value: totalUsers, color: "bg-orbital-cyan" },
    { label: "Active Paid Subscriptions", value: activeSubscriptions, color: "bg-verify" },
    { label: "Today's Picks", value: todayPicks, color: "bg-ultraviolet" },
    { label: "Published Posts", value: publishedPosts, color: "bg-caution" },
  ];

  return (
    <div className="min-h-screen bg-obsidian p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-ion-white mb-2">Admin Dashboard</h1>
        <p className="text-ion-2 mb-8">Platform overview and controls</p>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {cards.map((card) => (
            <div key={card.label} className="bg-carbon border border-titanium rounded-xl p-6">
              <div className={`w-10 h-10 ${card.color} rounded-lg mb-3 opacity-80`} />
              <p className="text-3xl font-bold text-ion-white">{card.value.toLocaleString()}</p>
              <p className="text-ion-2 text-sm mt-1">{card.label}</p>
            </div>
          ))}
        </div>

        {/* System Status */}
        <div className="bg-carbon border border-titanium rounded-xl p-6 mb-8">
          <h2 className="text-xl font-semibold text-ion-white mb-4">System Status</h2>
          {lastIngestionRun ? (
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${
                  lastIngestionRun.status === "SUCCESS" ? "bg-verify" :
                  lastIngestionRun.status === "RUNNING" ? "bg-caution" : "bg-alert"
                }`} />
                <span className="text-ion-1">
                  Last ingestion: <strong className="text-ion-white">{lastIngestionRun.status}</strong>
                </span>
                <span className="text-ion-3 text-sm">
                  {lastIngestionRun.startedAt.toLocaleString()}
                </span>
              </div>
              {lastIngestionRun.errorMessage && (
                <p className="text-alert text-sm ml-6">{lastIngestionRun.errorMessage}</p>
              )}
            </div>
          ) : (
            <p className="text-ion-2">No ingestion runs yet</p>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-carbon border border-titanium rounded-xl p-6">
          <h2 className="text-xl font-semibold text-ion-white mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            <a
              href="/admin/dashboard"
              className="px-4 py-2 bg-plasma text-plasma-ink rounded-lg hover:bg-plasma-glow transition-colors text-sm font-medium"
            >
              ⚡ Operator Dashboard
            </a>
            <TriggerRefreshButton />
            <a
              href="/admin/picks"
              className="px-4 py-2 bg-titanium text-ion-white rounded-lg hover:bg-titanium transition-colors text-sm"
            >
              Manage Picks
            </a>
            <a
              href="/admin/posts"
              className="px-4 py-2 bg-titanium text-ion-white rounded-lg hover:bg-titanium transition-colors text-sm"
            >
              Manage Posts
            </a>
            <a
              href="/admin/users"
              className="px-4 py-2 bg-titanium text-ion-white rounded-lg hover:bg-titanium transition-colors text-sm"
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
        className="px-4 py-2 bg-plasma text-plasma-ink rounded-lg hover:bg-plasma-glow transition-colors text-sm font-medium"
      >
        Trigger Data Refresh
      </button>
    </form>
  );
}
