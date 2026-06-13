import Link from "next/link";
import { Shell, HeroStat, BarChart, ScoreRing, InsightCard, SectionHeader, StatusRibbon } from "./_components";
import { loadSummary, loadActiveMetricManifest, rankPlayers } from "@/lib/statking/product";

export const metadata = {
  title: "Galaxy StatKing — NFL Player & Team Intelligence",
  description: "A rights-gated NFL stat intelligence system: players, teams, media signal, sources, and the proof behind every metric.",
  alternates: { canonical: "/stats" },
};

export default function Page() {
  const s = loadSummary();
  const m = loadActiveMetricManifest();
  const top5 = rankPlayers().slice(0, 5);
  const maxGpi = top5[0]?.galaxy_player_index ?? 1;

  return (
    <Shell title="Galaxy StatKing" eyebrow="NFL intelligence">
      <StatusRibbon status="fixture" label="Snapshot data — fixture-backed, not a live feed" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        <div className="flex justify-center md:justify-start">
          <ScoreRing score={61} label="King Standard" size={140} />
        </div>
        <div className="md:col-span-2 grid grid-cols-2 gap-4">
          <HeroStat label="Tracked sources" value={s.source_count} sublabel="rights-gated pipeline" />
          <HeroStat label="Active metrics" value={m.active_calculated_count} sublabel={`of ${m.total_manifest_count} total`} />
          <HeroStat label="Source candidates" value={s.candidate_count} sublabel="in evaluation" />
          <HeroStat label="Data systems" value={s.systems.length} sublabel="integrated" />
        </div>
      </div>

      <InsightCard
        eyebrow="King Standard · 61 / 100"
        headline="Autonomous foundation — not yet finished King of Stats"
        body="Source trust is seeded. Coverage is sample-level. Freshness is fixture-backed. Proof archive is empty — no live predictions yet. 61 is an honest score for a real, working foundation. 90+ requires live feeds, licenses, and settled picks."
        tone="warn"
      />

      <SectionHeader eyebrow="Top players by" title="Galaxy Player Index" action={{ label: "Full rankings →", href: "/stats/players" }} />
      <BarChart items={top5.map(p => ({ label: p.name, value: p.galaxy_player_index, max: maxGpi }))} />

      <SectionHeader title="Intelligence surfaces" />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Players",  href: "/stats/players",  note: "GPI rankings" },
          { label: "Teams",    href: "/stats/teams",    note: "Environment" },
          { label: "Compare",  href: "/stats/compare",  note: "Side-by-side" },
          { label: "Sources",  href: "/stats/sources",  note: "Data origin" },
          { label: "Media",    href: "/stats/media",    note: "Signal intel" },
          { label: "Ask",      href: "/stats/ask",      note: "Grounded Q&A" },
        ].map(({ label, href, note }) => (
          <Link key={href} href={href} className="border border-mineral bg-eclipse p-4 hover:border-orbital-cyan transition-colors">
            <p className="font-semibold text-ion-white">{label}</p>
            <p className="mt-1 text-xs text-ion-2">{note}</p>
          </Link>
        ))}
      </div>
    </Shell>
  );
}
