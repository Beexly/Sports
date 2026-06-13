import { Shell, Cards, DataTable, HeroStat, StatusRibbon } from "../_components";
import { FilterBar } from "../_client";
import { rankPlayers, loadPlayers } from "@/lib/statking/product";
export const metadata = {
  title: "Player Database — Every Tracked NFL Player",
  description: "Browse the full StatKing player universe with usage, efficiency, role, and fantasy edge.",
  alternates: { canonical: "/stats/players" },
};
export default function Page({ searchParams }: { searchParams?: { filter?: string } }) {
  const players = rankPlayers();
  const all = loadPlayers();
  const filter = searchParams?.filter ?? "All";
  const filtered = filter === "All" ? players : players.filter(p => p.position === filter);
  const top3 = filtered.slice(0, 3);

  return (
    <Shell title="Player Database">
      <StatusRibbon status="fixture" label="Player snapshot updated every sync cycle" />
      <Cards items={[
        { label: "Players", value: all.length },
        { label: "Teams", value: new Set(all.map(p => p.team)).size },
        { label: "Positions", value: new Set(all.map(p => p.position)).size },
        { label: "Avg confidence", value: Math.round(all.reduce((a, p) => a + p.data_confidence, 0) / all.length) + "%" }
      ]} />
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-ion-2 mb-3">Filter by position</p>
        <FilterBar
          options={[
            { label: "All", value: "All" },
            { label: "QB", value: "QB" },
            { label: "RB", value: "RB" },
            { label: "WR", value: "WR" },
            { label: "TE", value: "TE" }
          ]}
          active={filter}
          paramName="filter"
        />
      </div>
      {top3.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          {top3.map((p, i) => (
            <HeroStat
              key={p.player_id}
              label={p.position}
              value={p.name}
              sublabel={`${p.team} · GPI ${p.galaxy_player_index}`}
              tone={i === 0 ? "cyan" : i === 1 ? "amber" : "cyan"}
            />
          ))}
        </div>
      )}
      <p className="text-ion-1">Browse all players sorted by Galaxy Player Index and confidence. Click any row to view the full profile.</p>
      <DataTable
        rows={filtered.slice(0, 50).map(p => ({
          name: p.name,
          team: p.team,
          position: p.position,
          gpi: Number(p.galaxy_player_index ?? 0),
          usage: Number(p.usage_score ?? 0),
          efficiency: Number(p.efficiency_score ?? 0),
          fantasy_edge: Number(p.fantasy_edge ?? 0),
          confidence: String(p.data_confidence ?? 0) + "%"
        }))}
        maxRows={50}
      />
    </Shell>
  );
}
