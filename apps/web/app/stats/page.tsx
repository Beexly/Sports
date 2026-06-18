import Link from "next/link";
import { Shell, HeroStat, BarChart, ScoreRing, InsightCard, SectionHeader, StatusRibbon } from "./_components";
import { loadSummary, loadActiveMetricManifest, rankPlayers } from "@/lib/statking/product";
import { glossaryEntry } from "@/lib/glossary";

export const metadata = {
  title: "Galaxy StatKing — NFL Player & Team Intelligence",
  description: "A rights-gated NFL stat intelligence system: players, teams, media signal, sources, and the proof behind every metric.",
  alternates: { canonical: "/stats" },
};

const KING_DIMENSIONS: Array<{ label: string; score: number; max: number; color: string; glow: string }> = [
  { label: "Source Coverage", score: 40, max: 100, color: "#00E5FF", glow: "rgba(0,229,255,0.6)" },
  { label: "Live Feeds",      score: 10, max: 100, color: "#FF2DD6", glow: "rgba(255,45,214,0.5)" },
  { label: "Proof Archive",   score:  5, max: 100, color: "#FF6470", glow: "rgba(255,100,112,0.5)" },
  { label: "Metric Depth",    score: 65, max: 100, color: "#5FD9A3", glow: "rgba(95,217,163,0.5)" },
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

      <div className="border border-white/[0.08] bg-white/[0.04] p-6 flex flex-col sm:flex-row items-start gap-8">
        <div className="shrink-0">
          <ScoreRing score={61} label="King Standard" size={140} />
        </div>
        <div className="flex-1 min-w-0 space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-ink-400">Overall rating</p>
            <p className="mt-1 text-2xl font-bold text-white">King Standard: 61 / 100</p>
            <p className="mt-1 text-sm text-ink-300">
              Autonomous foundation — real sources, rights-gated, fixture-backed
            </p>
          </div>
          <div className="space-y-3">
            {KING_DIMENSIONS.map(({ label, score, max, color, glow }) => {
              const pct: number = max > 0 ? Math.min(100, Math.round((score / max) * 100)) : 0;
              return (
                <div key={label} className="flex items-center gap-3">
                  <span className="w-36 shrink-0 text-xs text-ink-300">{label}</span>
                  <div className="relative flex-1 h-2 rounded-full overflow-hidden bg-white/[0.03] border border-white/[0.08]/60">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, background: color, boxShadow: `0 0 6px ${glow}` }}
                    />
                  </div>
                  <span className="w-8 text-right text-xs font-mono tabular-nums" style={{ color }}>{score}</span>
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
      <p className="-mt-3 mb-4 max-w-2xl text-sm text-ink-400">{glossaryEntry("gpi")?.plain}</p>
      <BarChart items={top5.map(p => ({ label: p.name, value: p.galaxy_player_index, max: maxGpi }))} />

      <SectionHeader title="All Intelligence Surfaces" />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {SURFACES.map(({ label, href, note }) => (
          <Link
            key={href}
            href={href}
            className="group rounded-lg border border-white/[0.08] bg-white/[0.04] p-4 transition-all duration-200 hover:border-orbital-cyan/60 hover:-translate-y-0.5 hover:shadow-[0_0_18px_rgba(0,229,255,0.10)]"
          >
            <p className="font-semibold text-white transition-colors group-hover:text-orbital-cyan">
              {label}{" "}
              <span className="text-ink-500 transition-colors group-hover:text-orbital-cyan">→</span>
            </p>
            <p className="mt-1 text-xs text-ink-400">{note}</p>
          </Link>
        ))}
      </div>
    </Shell>
  );
}
