import { Shell, Cards, StatusRibbon, HeroStat, InsightCard, SectionHeader } from "../_components";
import { loadArchetypes, loadPlayers } from "@/lib/statking/product";
export const metadata = {
  title: "Watchlist: Your Tracked Players",
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
      <InsightCard
        eyebrow="What is the Watchlist?"
        headline="Players the system flags as hidden opportunities right now"
        body="Sorted by Hidden Value Score: players with strong underlying metrics (usage, efficiency, archetype fit) before the broader market reprices them. Saving a personal watchlist is an owner-gated account feature. This view always shows the system's top hidden-value picks."
        tone="neutral"
      />
      <div className="grid gap-4 md:grid-cols-2">
        {watch.slice(0, 2).map(p => {
          const a = archMap.get(p.player_id);
          return (
            <HeroStat
              key={p.player_id}
              label={`${p.team} · ${p.position}${a?.archetype ? ` · ${a.archetype}` : ""}`}
              value={p.name}
              sublabel={`Hidden Value: ${Number(p.hidden_value_score ?? 0)} · Trend: ${Number(p.trend_score ?? 0)}`}
              tone="cyan"
            />
          );
        })}
      </div>
      <SectionHeader
        title="Highest-Signal Players"
        eyebrow={"Sorted by hidden value · " + watch.length + " tracked"}
      />
      <div className="space-y-2">
        {watch.slice(0, 20).map(p => {
          const a = archMap.get(p.player_id);
          return (
            <a
              key={p.player_id}
              href={"/stats/player/" + p.player_id}
              className="flex items-center justify-between border border-mineral bg-eclipse p-3 hover:border-orbital-cyan transition-colors"
            >
              <div>
                <p className="font-semibold text-ion-white">{String(p.name ?? "")}</p>
                <p className="text-xs text-ion-2">{String(p.team ?? "")} · {String(p.position ?? "")}</p>
              </div>
              <div className="text-right">
                <p className="text-orbital-cyan font-mono text-sm">{Number(p.hidden_value_score ?? 0)}</p>
                <p className="text-xs text-ion-2">{String(a?.archetype ?? "—")}</p>
              </div>
            </a>
          );
        })}
      </div>
    </Shell>
  );
}
