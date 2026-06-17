import Link from "next/link";
import { Shell, Cards, Badge, DataTable, StatusRibbon, BarChart, SectionHeader } from "../_components";
import { loadPlayers } from "@/lib/statking/product";
export const metadata = {
  title: "Player Status & Movement — Injuries, Roles & Trends",
  description: "Current injury/role status mapped to fantasy impact, plus the players whose usage, role, or trend is moving most — one place for what changed.",
  alternates: { canonical: "/stats/injuries" },
};
export default function Page() {
  const players = loadPlayers();
  const flagged = players.filter(p => p.status !== "Active");
  const active = players.filter(p => p.status === "Active");
  const risers = [...players].sort((a, b) => b.trend_score - a.trend_score).slice(0, 15);

  return (
    <Shell title="Player Status & Movement" eyebrow="What changed">
      <StatusRibbon status={flagged.length > 0 ? "blocked" : "active"} label={flagged.length > 0 ? `${flagged.length} players with status flags` : "No active injury flags"} />
      <Cards items={[
        { label: "Players tracked", value: players.length },
        { label: "Status flags", value: flagged.length },
        { label: "Active", value: active.length },
        { label: "High volatility", value: players.filter(p => p.volatility_score >= 60).length }
      ]} />

      <h2 className="text-2xl font-semibold text-ion-white">Injury &amp; role status</h2>
      <p className="text-ion-1">
        Current status mapped to role and fantasy impact, so a designation reads as a usage consequence, not just a label.
      </p>
      <Badge tone="warn">Official injury designations require a licensed feed; status shown is from public roster signal.</Badge>
      {flagged.length > 0 ? (
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
      ) : (
        <p className="text-sm text-ion-1 py-4 px-4 border border-mineral bg-eclipse/40">No status flags in the current fixture snapshot.</p>
      )}
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

      <h2 className="mt-2 text-2xl font-semibold text-ion-white">Movement watch</h2>
      <p className="text-ion-1">
        The players whose role, usage, or trend is moving most — the changes worth acting on before the market catches up.
      </p>
      <Badge tone="warn">Real-time email &amp; push delivery is an Elite feature and owner-gated; this is the underlying signal layer.</Badge>
      <SectionHeader eyebrow="Top 15 by trend score" title="Usage & Trend Risers" />
      <div className="space-y-2">
        {risers.map(p => (
          <Link key={p.player_id} href={"/stats/player/" + p.player_id} className="flex items-center justify-between border border-mineral bg-eclipse p-3 hover:border-orbital-cyan transition-colors">
            <div>
              <p className="text-ion-white font-medium">{p.name}</p>
              <p className="text-xs text-ion-2">{p.team} · {p.position}</p>
            </div>
            <div className="text-right">
              <p className="text-orbital-cyan font-mono text-sm">{p.trend_score}</p>
              <p className="text-xs text-ion-2">trend score</p>
            </div>
          </Link>
        ))}
      </div>
    </Shell>
  );
}
