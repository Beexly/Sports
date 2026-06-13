import { Shell, Cards, Badge, DataTable, StatusRibbon } from "../_components";
import { loadPlayers } from "@/lib/statking/product";
export const metadata = {
  title: "StatKing Alerts — Usage, Role & Market Movement",
  description: "Configurable alerts on usage, role, injury, and market moves across the StatKing player universe.",
  alternates: { canonical: "/stats/alerts" },
};
export default function Page() {
  const players = loadPlayers();
  const risers = [...players].sort((a, b) => b.trend_score - a.trend_score).slice(0, 15);

  return (
    <Shell title="Alerts" eyebrow="Movement watch">
      <StatusRibbon status="active" label="Real-time alert signals active" />
      <Cards items={[
        { label: "Players watched", value: players.length },
        { label: "Rising now", value: risers.length },
        { label: "High volatility", value: players.filter(p => p.volatility_score >= 60).length },
        { label: "Status flags", value: players.filter(p => p.status !== "Active").length }
      ]} />
      <div className="space-y-3">
        <Badge tone="warn">Real-time email &amp; push delivery is an Elite feature and owner-gated; this is the underlying signal layer.</Badge>
      </div>
      <p className="text-ion-1">
        Alerts surface the players whose role, usage, or trend is moving most — the changes worth acting on before the market catches up.
      </p>
      <div>
        <h2 className="text-2xl font-semibold text-ion-white mb-4">Biggest Risers by Trend Score</h2>
        <DataTable
          rows={risers.map(p => ({
            player: String(p.name ?? ""),
            team: String(p.team ?? ""),
            position: String(p.position ?? ""),
            trend_score: Number(p.trend_score ?? 0),
            usage_score: Number(p.usage_score ?? 0),
            role_score: Number(p.role_score ?? 0),
            status: String(p.status ?? "")
          }))}
          maxRows={15}
        />
      </div>
    </Shell>
  );
}
