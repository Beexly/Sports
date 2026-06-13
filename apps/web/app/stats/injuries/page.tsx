import { Shell, Cards, Badge, DataTable, StatusRibbon, BarChart } from "../_components";
import { loadPlayers } from "@/lib/statking/product";
export const metadata = {
  title: "Injury Report — Status & Fantasy Impact",
  description: "Current injury status mapped to role and fantasy impact across the player universe.",
  alternates: { canonical: "/stats/injuries" },
};
export default function Page() {
  const players = loadPlayers();
  const flagged = players.filter(p => p.status !== "Active");
  const active = players.filter(p => p.status === "Active");
  const needsFeed = players.filter(p => p.missing_data && Array.isArray(p.missing_data) && p.missing_data.some(m => /injur/i.test(String(m))));

  return (
    <Shell title="Injury Report" eyebrow="Status & impact">
      <StatusRibbon status={flagged.length > 0 ? "blocked" : "active"} label={flagged.length > 0 ? `${flagged.length} players with status flags` : "No active injury flags"} />
      <Cards items={[
        { label: "Players tracked", value: players.length },
        { label: "Status flags", value: flagged.length },
        { label: "Active", value: active.length },
        { label: "Need live feed", value: needsFeed.length }
      ]} />
      <p className="text-ion-1">
        Current status mapped to role and fantasy impact, so a designation reads as a usage consequence, not just a label.
      </p>
      <div className="space-y-3">
        <Badge tone="warn">Official injury designations require a licensed feed; status shown is from public roster signal.</Badge>
      </div>
      {flagged.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          {flagged.slice(0, 3).map(p => (
            <div key={p.player_id} className="border border-alert/30 bg-alert/5 p-4 rounded">
              <p className="text-alert font-semibold text-sm mb-1">{String(p.status ?? "")}</p>
              <p className="text-ion-white font-semibold">{p.name}</p>
              <p className="text-xs text-ion-2 mb-2">{p.team} · {p.position}</p>
              <BarChart items={[
                { label: "Usage impact", value: Number(p.usage_score ?? 0), max: 100, tone: "alert" },
                { label: "Fantasy impact", value: Number(p.fantasy_edge ?? 0), max: 100, tone: "alert" }
              ]} />
            </div>
          ))}
        </div>
      )}
      <div>
        <h2 className="text-2xl font-semibold text-ion-white mb-4">All Flagged Players</h2>
        <DataTable
          rows={flagged.map(p => ({
            player: String(p.name ?? ""),
            team: String(p.team ?? ""),
            position: String(p.position ?? ""),
            status: String(p.status ?? ""),
            usage: Number(p.usage_score ?? 0),
            fantasy_edge: Number(p.fantasy_edge ?? 0),
            missing_data: Array.isArray(p.missing_data) ? p.missing_data.join("; ") : ""
          }))}
          maxRows={50}
        />
      </div>
    </Shell>
  );
}
