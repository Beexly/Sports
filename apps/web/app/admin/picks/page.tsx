import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@sports/db";
import { formatDateTime } from "@/lib/utils";

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
    <div className="min-h-screen bg-obsidian p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Picks Management</h1>
            <p className="text-ion-2 mt-1">{picks.length} picks (last 100)</p>
          </div>
          <a href="/admin" className="text-ion-2 hover:text-white text-sm transition-colors">
            ← Back to Admin
          </a>
        </div>

        <div className="bg-carbon border border-titanium rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-titanium text-ion-2 text-xs uppercase">
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
                <tr key={pick.id} className="border-b border-titanium/50 hover:bg-titanium/30">
                  <td className="px-4 py-3 text-white">
                    <div>{pick.game.homeTeamName} vs {pick.game.awayTeamName}</div>
                    <div className="text-xs text-ion-3">{pick.game.sport.name}</div>
                  </td>
                  <td className="px-4 py-3 text-ion-1">{pick.pickType}</td>
                  <td className="px-4 py-3 text-ion-1 font-medium">{pick.selection}</td>
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
                        : "bg-titanium text-ion-1"
                    }`}>
                      {pick.tier}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      pick.result === "WIN" ? "bg-green-500/10 text-green-400" :
                      pick.result === "LOSS" ? "bg-red-500/10 text-red-400" :
                      pick.result === "PUSH" ? "bg-titanium text-ion-1" :
                      "bg-titanium text-ion-3"
                    }`}>
                      {pick.result}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ion-3 text-xs">
                    {formatDateTime(pick.generatedAt)}
                  </td>
                </tr>
              ))}
              {picks.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-ion-3">
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
