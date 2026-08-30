import Link from "next/link";
import { Shell, HeroStat, BarChart, ScoreRing, InsightCard, SectionHeader, StatusRibbon } from "./_components";
import { loadSummary, loadActiveMetricManifest, rankPlayers } from "@/lib/statking/product";
import { loadKingStandard } from "@/lib/statking/king-standard-loader";
import { KING_DIMENSION_LABELS, KING_DIMENSION_ORDER, isMeasured } from "@/lib/statking/king-standard";
import { glossaryEntry } from "@/lib/glossary";

export const metadata = {
  title: "Galaxy StatKing: NFL Player & Team Intelligence",
  description: "A rights-gated NFL stat intelligence system: players, teams, media signal, sources, and the proof behind every metric.",
  alternates: { canonical: "/stats" },
};

// King Standard's Proof Archive and Live Feeds dimensions read live DB state
// (settled-pick counts, ingestion freshness) — this page must not be
// statically frozen at build time. See lib/statking/king-standard-loader.ts.
export const dynamic = "force-dynamic";

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

export default async function Page() {
  const s = loadSummary();
  const m = loadActiveMetricManifest();
  const top5 = rankPlayers().slice(0, 5);
  const maxGpi: number = top5[0]?.galaxy_player_index ?? 1;
  const king = await loadKingStandard();
  const overallMeasured = king.overall.score !== null;

  return (
    <Shell title="Galaxy StatKing" eyebrow="NFL intelligence">
      <StatusRibbon status="fixture" label="Snapshot data: fixture-backed, not a live feed" />

      <div className="border border-mineral bg-eclipse p-6 flex flex-col sm:flex-row items-start gap-8">
        <div className="shrink-0">
          <ScoreRing
            score={king.overall.score ?? 0}
            notMeasured={!overallMeasured}
            label="King Standard"
            size={140}
          />
        </div>
        <div className="flex-1 min-w-0 space-y-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-ion-2">Overall rating</p>
            <p className="mt-1 text-2xl font-bold text-ion-white">
              {overallMeasured ? `King Standard: ${king.overall.score} / 100` : "King Standard: unmeasured"}
            </p>
            <p className="mt-1 text-sm text-ion-1">{king.overall.basis}</p>
          </div>
          <div className="space-y-3">
            {KING_DIMENSION_ORDER.map((key) => {
              const dimension = king.dimensions[key];
              const label = KING_DIMENSION_LABELS[key];
              const measured = isMeasured(dimension);
              return (
                <div key={key} className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span className="w-36 shrink-0 text-xs text-ion-1">{label}</span>
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden bg-carbon border border-mineral">
                      {measured && (
                        <div
                          className="h-full rounded-full bg-orbital-cyan"
                          style={{ width: `${dimension.score}%` }}
                        />
                      )}
                    </div>
                    <span className="w-24 shrink-0 text-right text-xs font-mono tabular-nums text-ion-white">
                      {measured ? dimension.score : (
                        <span className="font-sans normal-case text-ion-3">not measured</span>
                      )}
                    </span>
                  </div>
                  <p className="pl-[9.75rem] text-xs leading-snug text-ion-2">
                    {measured ? dimension.basis : dimension.reason}
                  </p>
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
        eyebrow={`King Standard · ${king.overall.basis}`}
        headline="King Standard foundation — public launch only when readiness clears"
        body="Every score above is computed from real state at request time, not asserted. A dimension without a live signal renders as unmeasured instead of a number — never a guessed score. 90+ requires live feeds, licenses, and a settled-pick archive that clears the platform readiness floor."
        tone="warn"
      />

      <SectionHeader eyebrow="Top players by" title="Galaxy Player Index" action={{ label: "Full rankings", href: "/stats/players" }} />
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
