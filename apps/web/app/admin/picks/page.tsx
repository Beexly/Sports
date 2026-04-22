import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@sports/db";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminPicksPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/");
  }

  const picks = await db.pick.findMany({
    include: {
      game: {
        include: { sport: { select: { name: true } } },
      },
    },
    orderBy: { generatedAt: "desc" },
    take: 100,
  });

  return (
    <div className="min-h-screen bg-gray-950 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Picks Management</h1>
            <p className="text-gray-400 mt-1">{picks.length} picks (last 100)</p>
          </div>
          <Link href="/admin" className="text-gray-400 hover:text-white text-sm transition-colors">
            ← Back to Admin
          </Link>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase">
                <th className="text-left px-4 py-3">Game</th>
                <th className="text-left px-4 py-3">Type</th>
                <th className="text-left px-4 py-3">Selection</th>
                <th className="text-left px-4 py-3">Confidence</th>
                <th className="text-left px-4 py-3">Tier</th>
                <th className="text-left px-4 py-3">Result</th>
                <th className="text-left px-4 py-3">Generated</th>
              </tr>
            </thead>
            <tbody>
              {picks.map((pick) => (
                <tr key={pick.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="px-4 py-3 text-white">
                    <div>{pick.game.homeTeamName} vs {pick.game.awayTeamName}</div>
                    <div className="text-xs text-gray-500">{pick.game.sport.name}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-300">{pick.pickType}</td>
                  <td className="px-4 py-3 text-gray-200 font-medium">{pick.selection}</td>
                  <td className="px-4 py-3">
                    <span className={`font-bold ${
                      pick.confidence >= 80 ? "text-green-400" :
                      pick.confidence >= 70 ? "text-blue-400" :
                      "text-yellow-400"
                    }`}>
                      {pick.confidence}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      pick.tier === "PREMIUM"
                        ? "bg-yellow-400/10 text-yellow-400"
                        : "bg-gray-700 text-gray-300"
                    }`}>
                      {pick.tier}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      pick.result === "WIN" ? "bg-green-500/10 text-green-400" :
                      pick.result === "LOSS" ? "bg-red-500/10 text-red-400" :
                      pick.result === "PUSH" ? "bg-gray-700 text-gray-300" :
                      "bg-gray-800 text-gray-500"
                    }`}>
                      {pick.result}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {formatDateTime(pick.generatedAt)}
                  </td>
                </tr>
              ))}
              {picks.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    No picks yet. Trigger a data refresh to generate picks.
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
