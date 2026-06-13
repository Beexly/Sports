import { Shell, Cards, Badge, DataTable, StatusRibbon, HeroStat } from "../_components";
import { loadArchetypes, loadPlayers } from "@/lib/statking/product";
export const metadata = {
  title: "Watchlist — Your Tracked Players",
  description: "Track players and surface their StatKing signals in one place.",
  alternates: { canonical: "/stats/watchlist" },
};
export default function Page() {
  const arch = loadArchetypes();
  const players = loadPlayers();
  const archMap = new Map(arch.map(a => [a.player_id, a]));
  const watch = [...players].sort((a, b) => (b.hidden_value_score ?? 0) - (a.hidden_value_score ?? 0)).slice(0, 20);

  return (
    <Shell title="Watchlist" eyebrow="Highest-signal players">
      <StatusRibbon status="active" label="Watch list updated with each sync" />
      <Cards items={[
        { label: "Archetyped players", value: arch.length },
        { label: "On watch", value: watch.length },
        { label: "Personal lists", value: "owner-gated" },
        { label: "Sort", value: "hidden value" }
      ]} />
      <p className="text-ion-1">
        The system's highest-signal players right now — strong hidden value and trend before the market reprices them.
      </p>
      <div className="space-y-3">
        <Badge tone="warn">Saving your own watchlist is an account feature and owner-gated.</Badge>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {watch.slice(0, 2).map(p => {
          const a = archMap.get(p.player_id);
          return (
            <HeroStat
              key={p.player_id}
              label={`${p.team} · ${p.position}`}
              value={p.name}
              sublabel={`Hidden Value: ${Number(p.hidden_value_score ?? 0)} · Trend: ${Number(p.trend_score ?? 0)}`}
              tone="cyan"
            />
          );
        })}
      </div>
      <div>
        <h2 className="text-2xl font-semibold text-ion-white mb-4">All Watched Players</h2>
        <DataTable
          rows={watch.map(p => {
            const a = archMap.get(p.player_id);
            return {
              player: String(p.name ?? ""),
              team: String(p.team ?? ""),
              position: String(p.position ?? ""),
              hidden_value: Number(p.hidden_value_score ?? 0),
              trend: Number(p.trend_score ?? 0),
              archetype: String(a?.archetype ?? "—")
            };
          })}
          maxRows={20}
        />
      </div>
    </Shell>
  );
}
