import Link from "next/link";
import { Shell, HeroStat, BarChart, ScoreRing, InsightCard, SectionHeader, StatusRibbon } from "./_components";
import { loadSummary, loadActiveMetricManifest, rankPlayers } from "@/lib/statking/product";
import { glossaryEntry } from "@/lib/glossary";

export const metadata = {
  title: "Galaxy StatKing — NFL Player & Team Intelligence",
  description: "A rights-gated NFL stat intelligence system: players, teams, media signal, sources, and the proof behind every metric.",
  alternates: { canonical: "/stats" },
};

const KING_DIMENSIONS: Array<{ label: string; score: number; max: number }> = [
  { label: "Source Coverage", score: 40, max: 100 },
  { label: "Live Feeds",      score: 10, max: 100 },
  { label: "Proof Archive",   score:  5, max: 100 },
  { label: "Metric Depth",    score: 65, max: 100 },
];

const SURFACES: Array<{ label: string; href: string; note: string }> = [
  { label: "Players",          href: "/stats/players",      note: "GPI rankings" },
  { label: "Teams",            href: "/stats/teams",        note: "Environment" },
  { label: "Compare",          href: "/stats/compare",      note: "Side-by-side" },
  { label: "Comps",            href: "/stats/comps",        note: "Similar players" },
  { label: "Depth",            href: "/stats/depth",        note: "Role & opportunity" },
  { label: "Status & Movement", href: "/stats/injuries",   note: "Injuries + risers" },
  { label: "Trenches",         href: "/stats/trenches",     note: "Line play" },
  { label: "Scouting",         href: "/stats/scouting",     note: "First-party notes" },
  { label: "Media",            href: "/stats/media",        note: "Signal intel" },
  { label: "Sources",          href: "/stats/sources",      note: "Data origin" },
  { label: "Proof",            href: "/stats/proof",        note: "Backtests" },
  { label: "Ask",              href: "/stats/ask",          note: "Grounded Q&A" },
  { label: "Expert Board",     href: "/stats/expert-board", note: "Analyst signals" },
];

export default function Page() {
  const s = loadSummary();
  const m = loadActiveMetricManifest();
  const top5 = rankPlayers().slice(0, 5);
  const maxGpi: number = top5[0]?.galaxy_player_index ?? 1;

  return (
    <Shell title="Galaxy StatKing" eyebrow="NFL intelligence">
      <StatusRibbon status="fixture" label="Snapshot data — fixture-backed, not a live feed" />

      <div className="border border-mineral bg-eclipse p-6 flex flex-col sm:flex-row items-start gap-8">
        <div className="shrink-0">
          <ScoreRing score={61} label="King Standard" size={140} />
        </div>
        <div className="flex-1 min-w-0 space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-ion-2">Overall rating</p>
            <p className="mt-1 text-2xl font-bold text-ion-white">King Standard: 61 / 100</p>
            <p className="mt-1 text-sm text-ion-1">
              Autonomous foundation — real sources, rights-gated, fixture-backed
            </p>
          </div>
          <div className="space-y-2.5">
            {KING_DIMENSIONS.map(({ label, score, max }) => {
              const pct: number = max > 0 ? Math.min(100, Math.round((score / max) * 100)) : 0;
              return (
                <div key={label} className="flex items-center gap-3">
                  <span className="w-36 shrink-0 text-xs text-ion-1">{label}</span>
                  <div className="flex-1 h-1.5 rounded-full overflow-hidden bg-carbon border border-mineral">
                    <div
                      className="h-full rounded-full bg-orbital-cyan"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-xs font-mono tabular-nums text-ion-white">{score}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <HeroStat
          label="Tracked sources"
          value={s.source_count}
          sublabel="rights-gated pipeline"
        />
        <HeroStat
          label="Active metrics"
          value={m.active_calculated_count}
          sublabel={`of ${m.total_manifest_count} total`}
        />
        <HeroStat
          label="Source candidates"
          value={s.candidate_count}
          sublabel="in evaluation"
        />
        <HeroStat
          label="Data systems"
          value={s.systems.length}
          sublabel="integrated"
        />
      </div>

      <InsightCard
        eyebrow="King Standard · 61 / 100"
        headline="Autonomous foundation — not yet finished King of Stats"
        body="Source trust is seeded. Coverage is sample-level. Freshness is fixture-backed. Proof archive is empty — no live predictions yet. 61 is an honest score for a real, working foundation. 90+ requires live feeds, licenses, and settled picks."
        tone="warn"
      />

      <SectionHeader eyebrow="Top players by" title="Galaxy Player Index" action={{ label: "Full rankings →", href: "/stats/players" }} />
      <p className="-mt-3 mb-4 max-w-2xl text-sm text-ion-2">{glossaryEntry("gpi")?.plain}</p>
      <BarChart items={top5.map(p => ({ label: p.name, value: p.galaxy_player_index, max: maxGpi }))} />

      <SectionHeader title="All Intelligence Surfaces" />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {SURFACES.map(({ label, href, note }) => (
          <Link
            key={href}
            href={href}
            className="group border border-mineral bg-eclipse p-4 hover:border-orbital-cyan transition-all duration-150 hover:-translate-y-0.5"
          >
            <p className="font-semibold text-ion-white group-hover:text-orbital-cyan transition-colors">
              {label} <span className="text-ion-2 group-hover:text-orbital-cyan">→</span>
            </p>
            <p className="mt-1 text-xs text-ion-2">{note}</p>
          </Link>
        ))}
      </div>
    </Shell>
  );
}
