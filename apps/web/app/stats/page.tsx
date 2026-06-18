import Link from "next/link";
import { Shell, HeroStat, ScoreRing, InsightCard, SectionHeader, StatusRibbon } from "./_components";
import { loadSummary, loadActiveMetricManifest, loadKingScorecard, rankPlayers } from "@/lib/statking/product";
import { glossaryEntry } from "@/lib/glossary";

export const metadata = {
  title: "Galaxy StatKing — NFL Player & Team Intelligence",
  description: "A rights-gated NFL stat intelligence system: players, teams, media signal, sources, and the proof behind every metric.",
  alternates: { canonical: "/stats" },
};

/**
 * King Standard dimensions are surfaced straight from the authoritative
 * scorecard (data/statking/crown/king_standard_scorecard.json) — four real,
 * named moats with their real scores. No fabricated breakdown (rule #2).
 * Colors use only brand accents (cyan / ultraviolet) — decorative bars must
 * not borrow the magenta/alert/caution semantic roles.
 */
const KING_DIMENSION_MOATS: Array<{ label: string; moat: string; color: string; glow: string }> = [
  { label: "Source Trust",       moat: "source trust moat",      color: "#00E5FF", glow: "rgba(0,229,255,0.6)" },
  { label: "Explanation / UX",   moat: "explanation/UX moat",    color: "#7A5CFF", glow: "rgba(122,92,255,0.5)" },
  { label: "Proof & Backtesting",moat: "proof/backtesting moat", color: "#00E5FF", glow: "rgba(0,229,255,0.6)" },
  { label: "Model & Prediction", moat: "model/prediction moat",  color: "#7A5CFF", glow: "rgba(122,92,255,0.5)" },
];

type SurfaceStatus = "LIVE" | "ACCRUING" | "GATED" | "SOON";

const STATUS_STYLE: Record<SurfaceStatus, { color: string; bg: string; border: string }> = {
  LIVE:     { color: "#00E5FF", bg: "rgba(0,229,255,0.08)",   border: "rgba(0,229,255,0.20)" },
  ACCRUING: { color: "#FFB454", bg: "rgba(255,180,84,0.08)",  border: "rgba(255,180,84,0.20)" },
  GATED:    { color: "#9D86FF", bg: "rgba(122,92,255,0.10)",  border: "rgba(122,92,255,0.26)" },
  SOON:     { color: "#AEB6C2", bg: "rgba(154,163,178,0.08)", border: "rgba(154,163,178,0.18)" },
};

const SURFACES: ReadonlyArray<{ label: string; href: string; note: string; status: SurfaceStatus }> = [
  { label: "Players",           href: "/stats/players",      note: "GPI rankings",      status: "LIVE" },
  { label: "Teams",             href: "/stats/teams",        note: "Environment",        status: "LIVE" },
  { label: "Compare",           href: "/stats/compare",      note: "Side-by-side",       status: "LIVE" },
  { label: "Comps",             href: "/stats/comps",        note: "Similar players",    status: "LIVE" },
  { label: "Depth",             href: "/stats/depth",        note: "Role & opportunity", status: "LIVE" },
  { label: "Status & Movement", href: "/stats/injuries",     note: "Injuries + risers",  status: "ACCRUING" },
  { label: "Trenches",          href: "/stats/trenches",     note: "Line play",          status: "LIVE" },
  { label: "Scouting",          href: "/stats/scouting",     note: "First-party notes",  status: "GATED" },
  { label: "Media",             href: "/stats/media",        note: "Signal intel",       status: "LIVE" },
  { label: "Sources",           href: "/stats/sources",      note: "Data origin",        status: "LIVE" },
  { label: "Proof",             href: "/stats/proof",        note: "Backtests",          status: "ACCRUING" },
  { label: "Ask",               href: "/stats/ask",          note: "Grounded Q&A",       status: "LIVE" },
  { label: "Expert Board",      href: "/stats/expert-board", note: "Analyst signals",    status: "SOON" },
];

export default function Page() {
  const s = loadSummary();
  const m = loadActiveMetricManifest();
  const scorecard = loadKingScorecard();
  const kingScore: number = scorecard.overall_score || 0;
  const dimensions = KING_DIMENSION_MOATS.map((d) => ({
    ...d,
    score: scorecard.dimensions[d.moat] ?? 0,
  }));
  const top5 = rankPlayers().slice(0, 5);
  const maxGpi: number = top5[0]?.galaxy_player_index ?? 1;

  return (
    <Shell title="Galaxy StatKing" eyebrow="NFL intelligence">
      <StatusRibbon status="fixture" label="Snapshot data — fixture-backed, not a live feed" />

      <div className="border border-white/[0.08] bg-white/[0.04] p-6 flex flex-col sm:flex-row items-start gap-8">
        <div className="shrink-0">
          <ScoreRing score={kingScore} label="King Standard" size={140} />
        </div>
        <div className="flex-1 min-w-0 space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-ink-400">Overall rating</p>
            <p className="mt-1 text-2xl font-bold text-white">King Standard: {kingScore} / 100</p>
            <p className="mt-1 text-sm text-ink-300">
              Autonomous foundation — real sources, rights-gated, fixture-backed
            </p>
          </div>
          <div className="space-y-3">
            {dimensions.map(({ label, score, color, glow }) => {
              const pct: number = Math.min(100, Math.max(0, Math.round(score)));
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
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-500">
            Four of {Object.keys(scorecard.dimensions).length} scored moats · from the King Standard scorecard
          </p>
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
        eyebrow={`King Standard · ${kingScore} / 100`}
        headline="Autonomous foundation — not yet finished King of Stats"
        body="Source trust is seeded. Coverage is sample-level. Freshness is fixture-backed. Proof archive is empty — no live predictions yet. 61 is an honest score for a real, working foundation. 90+ requires live feeds, licenses, and settled picks."
        tone="warn"
      />

      <SectionHeader eyebrow="Top players by" title="Galaxy Player Index" action={{ label: "Full rankings →", href: "/stats/players" }} />
      <p className="-mt-3 mb-4 max-w-2xl text-sm text-ink-400">{glossaryEntry("gpi")?.plain}</p>
      <div className="space-y-2">
        {top5.map((p, i) => {
          const pct = maxGpi > 0 ? Math.min(100, Math.max(0, (p.galaxy_player_index / maxGpi) * 100)) : 0;
          // Brand accents only — rank ordering must not borrow the status-badge hues.
          const rankColor = i === 0 ? "#00E5FF" : "#7A5CFF";
          return (
            <Link
              key={p.player_id}
              href={`/stats/player/${p.player_id}`}
              className="flex items-center gap-4 rounded-lg border border-white/[0.06] bg-white/[0.03] px-4 py-3 transition-all duration-200 hover:border-orbital-cyan/40 hover:-translate-y-px hover:shadow-[0_0_20px_rgba(0,229,255,0.08)]"
            >
              <span
                className="w-8 shrink-0 font-display text-3xl font-bold tabular-nums"
                style={{ color: rankColor }}
              >
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-white">{p.name}</p>
                <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-500">
                  {p.team} · {p.position}
                </p>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.04]">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${rankColor}, ${rankColor}88)`, boxShadow: `0 0 8px ${rankColor}44` }}
                  />
                </div>
              </div>
              <span
                className="shrink-0 font-mono text-xl font-bold tabular-nums"
                style={{ color: rankColor }}
              >
                {p.galaxy_player_index}
              </span>
            </Link>
          );
        })}
      </div>

      <SectionHeader title="All Intelligence Surfaces" />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {SURFACES.map(({ label, href, note, status }) => {
          const st = STATUS_STYLE[status];
          return (
            <Link
              key={href}
              href={href}
              className="group relative rounded-lg border border-white/[0.08] bg-white/[0.04] p-4 transition-all duration-200 hover:border-orbital-cyan/60 hover:-translate-y-0.5 hover:shadow-[0_0_24px_rgba(0,229,255,0.12)]"
            >
              <span
                className="absolute right-2.5 top-2.5 rounded-full px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em]"
                style={{ color: st.color, background: st.bg, border: `1px solid ${st.border}` }}
              >
                {status}
              </span>
              <p className="mt-0.5 font-semibold text-white transition-colors group-hover:text-orbital-cyan">
                {label}{" "}
                <span className="text-ink-500 transition-colors group-hover:text-orbital-cyan">→</span>
              </p>
              <p className="mt-1 text-xs text-ink-400">{note}</p>
            </Link>
          );
        })}
      </div>
    </Shell>
  );
}
