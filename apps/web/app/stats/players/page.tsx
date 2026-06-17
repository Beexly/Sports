import Link from "next/link";
import { Shell, Cards, HeroStat, StatusRibbon } from "../_components";
import { FilterBar } from "../_client";
import { rankPlayers, loadPlayers } from "@/lib/statking/product";
import { glossaryEntry } from "@/lib/glossary";
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
              label={`#${i + 1} by GPI`}
              value={p.name}
              delta={`GPI: ${p.galaxy_player_index}`}
              sublabel={`${p.team} · ${p.position}`}
              tone={i === 0 ? "cyan" : i === 1 ? "amber" : "cyan"}
            />
          ))}
        </div>
      )}
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div className="border border-mineral bg-eclipse p-3">
          <dt className="font-semibold text-ion-white">Galaxy Index (GPI)</dt>
          <dd className="mt-1 text-ion-2">{glossaryEntry("gpi")?.plain}</dd>
        </div>
        <div className="border border-mineral bg-eclipse p-3">
          <dt className="font-semibold text-ion-white">Confidence</dt>
          <dd className="mt-1 text-ion-2">{glossaryEntry("confidence")?.plain}</dd>
        </div>
      </dl>
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-ion-2 mb-3">Sorted by Galaxy Index — top {filtered.slice(0, 50).length} players</p>
        <div className="grid gap-2">
          {filtered.slice(0, 50).map(p => {
            const gpiPct = Math.min(100, Math.max(0, (Number(p.galaxy_player_index ?? 0) / 100) * 100));
            return (
              <Link
                key={p.player_id}
                href={`/stats/player/${p.player_id}`}
                className="border border-mineral bg-eclipse p-3 hover:border-orbital-cyan transition-colors flex items-center gap-4"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-ion-white truncate">{p.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs border border-mineral px-1.5 py-0.5 text-ion-2 rounded-sm">{p.team}</span>
                    <span className="text-xs border border-mineral px-1.5 py-0.5 text-ion-2 rounded-sm">{p.position}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0 w-32">
                  <div className="flex items-center gap-2 w-full">
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden bg-carbon border border-mineral">
                      <div className="h-full rounded-full bg-orbital-cyan" style={{ width: `${gpiPct}%` }} />
                    </div>
                    <span className="text-xs font-mono text-ion-white tabular-nums w-8 text-right">{p.galaxy_player_index}</span>
                  </div>
                  <span className="text-xs text-ion-1 tabular-nums">{p.data_confidence}% conf</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </Shell>
  );
}
