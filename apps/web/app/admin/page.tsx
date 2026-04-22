import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@sports/db";
import { startOfDay } from "date-fns";

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
    db.subscription.count({
      where: {
        status: { in: ["ACTIVE", "TRIALING"] },
        tier: { not: "FREE" },
      },
    }),
    db.pick.count({
      where: { generatedAt: { gte: startOfDay(new Date()) } },
    }),
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
    <div className="min-h-screen bg-gray-950 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-2">Admin Dashboard</h1>
        <p className="text-gray-400 mb-8">Platform overview and controls</p>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {cards.map((card) => (
            <div key={card.label} className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className={`w-10 h-10 ${card.color} rounded-lg mb-3 opacity-80`} />
              <p className="text-3xl font-bold text-white">{card.value.toLocaleString()}</p>
              <p className="text-gray-400 text-sm mt-1">{card.label}</p>
            </div>
          ))}
        </div>

        {/* System Status */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">System Status</h2>
          {lastIngestionRun ? (
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div
                  className={`w-3 h-3 rounded-full ${
                    lastIngestionRun.status === "SUCCESS"
                      ? "bg-green-500"
                      : lastIngestionRun.status === "RUNNING"
                      ? "bg-yellow-500 animate-pulse"
                      : "bg-red-500"
                  }`}
                />
                <span className="text-gray-300">
                  Last ingestion:{" "}
                  <strong className="text-white">{lastIngestionRun.status}</strong>
                </span>
                <span className="text-gray-500 text-sm">
                  {lastIngestionRun.startedAt.toLocaleString()}
                </span>
              </div>
              {lastIngestionRun.errorMessage && (
                <p className="text-red-400 text-sm ml-6">{lastIngestionRun.errorMessage}</p>
              )}
            </div>
          ) : (
            <p className="text-gray-400">No ingestion runs yet</p>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Quick Actions</h2>
          <p className="text-sm text-gray-500 mb-4">
            To trigger a data refresh with live progress, use the Operator
            Dashboard &rarr; Trigger Sync button. The button runs with your
            admin session and streams status updates while picks generate.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/dashboard"
              className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors text-sm font-medium"
            >
              ⚡ Operator Dashboard (Sync & Monitor)
            </Link>
            <Link
              href="/admin/picks"
              className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
            >
              Manage Picks
            </Link>
            <Link
              href="/admin/posts"
              className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
            >
              Manage Posts
            </Link>
            <Link
              href="/admin/users"
              className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
            >
              Manage Users
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
