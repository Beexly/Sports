import type { Metadata } from "next";
import { TASTE_CRITERIA, TASTE_DIMENSIONS } from "@/lib/design-review/taste-criteria";
import type { TasteVerdict } from "@/lib/design-review/taste-criteria";
import { TrustStrip } from "@/components/trust";

export const metadata: Metadata = {
  title: "Design Lab — Cockpit",
  robots: { index: false, follow: false },
};

const VERDICT_COLOR: Record<TasteVerdict, string> = {
  fail: "text-red-400 border-red-800 bg-red-900/20",
  neutral: "text-gray-400 border-gray-700 bg-gray-800/20",
  pass: "text-emerald-400 border-emerald-800 bg-emerald-900/20",
  exemplary: "text-violet-400 border-violet-800 bg-violet-900/20",
};

const SURFACES = [
  { id: "trust-strip", label: "TrustStrip", description: "Inline evidence provenance row" },
  { id: "pick-card", label: "Pick Card", description: "Full pick evidence card" },
  { id: "no-bet-card", label: "No-Bet Card", description: "Discipline pass card" },
  { id: "parlay-mri", label: "Parlay MRI", description: "Correlation risk scanner" },
  { id: "autopsy-timeline", label: "Autopsy Timeline", description: "Decision grading sequence" },
  { id: "market-mirage", label: "Market Mirage", description: "Narrative distortion meter" },
  { id: "command-center", label: "Command Center", description: "12-widget decision home" },
  { id: "report-dossier", label: "Report Dossier", description: "Intelligence report layouts" },
  { id: "academy-card", label: "Academy Card", description: "Simulation learning cards" },
  { id: "orbit", label: "Orbit", description: "Cinematic intelligence page" },
] as const;

export default function DesignLabPage() {
  return (
    <div className="space-y-10 px-6 py-8">
      <header>
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray-500">
          Cockpit · Design Lab
        </p>
        <h1 className="mt-1 text-2xl font-bold text-white">Design Variant Scoring</h1>
        <p className="mt-1 text-sm text-gray-400">
          {SURFACES.length} surfaces · {TASTE_DIMENSIONS.length} taste dimensions ·
          all from <code className="font-mono text-[11px] text-gray-400">lib/design-review/taste-criteria.ts</code>
        </p>
      </header>

      {/* ── TrustStrip live variant ── */}
      <section className="space-y-3">
        <p className="font-mono text-[10px] uppercase tracking-widest text-gray-500">
          TrustStrip · live render
        </p>
        <div className="space-y-3">
          <TrustStrip
            surfaceId="picks"
            source="galaxy-model"
            freshness="fresh"
            surfaceKind="habit-loop"
            tier="pro"
            uncertainty="live"
            showMethodology
            showResponsiblePlay
          />
          <TrustStrip
            surfaceId="parlay-mri"
            source="aggregate"
            freshness="sample"
            surfaceKind="decision-quality"
            tier="all"
            uncertainty="sample"
          />
          <TrustStrip
            surfaceId="academy"
            source="editorial"
            freshness="stale"
            surfaceKind="academy"
            tier="all"
            uncertainty="preview"
          />
        </div>
      </section>

      {/* ── Taste criteria reference ── */}
      <section className="space-y-4">
        <p className="font-mono text-[10px] uppercase tracking-widest text-gray-500">
          Taste criteria · {TASTE_DIMENSIONS.length} dimensions
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {TASTE_CRITERIA.map((c) => (
            <div key={c.dimension} className="rounded-xl border border-mineral bg-gray-900/40 p-4 space-y-2">
              <p className="font-mono text-[9px] uppercase tracking-widest text-gray-500">
                {c.dimension}
              </p>
              <p className="text-sm text-gray-300">{c.question}</p>
              <div className="space-y-1">
                <p className="font-mono text-[8px] uppercase tracking-widest text-red-500">Failing</p>
                <ul className="space-y-0.5">
                  {c.failingSignals.map((s) => (
                    <li key={s} className="text-xs text-gray-500">· {s}</li>
                  ))}
                </ul>
              </div>
              <div className="space-y-1">
                <p className="font-mono text-[8px] uppercase tracking-widest text-emerald-500">Passing</p>
                <ul className="space-y-0.5">
                  {c.passingSignals.map((s) => (
                    <li key={s} className="text-xs text-gray-500">· {s}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Surface index ── */}
      <section className="space-y-3">
        <p className="font-mono text-[10px] uppercase tracking-widest text-gray-500">
          Surfaces in scope
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SURFACES.map((s) => (
            <div key={s.id} className="rounded-xl border border-mineral bg-gray-900/40 p-4">
              <p className="font-mono text-[10px] uppercase tracking-widest text-white">
                {s.label}
              </p>
              <p className="mt-1 text-xs text-gray-500">{s.description}</p>
              <p className="mt-2 font-mono text-[8px] text-gray-700">{s.id}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Verdict legend ── */}
      <section className="space-y-3">
        <p className="font-mono text-[10px] uppercase tracking-widest text-gray-500">
          Verdict scale
        </p>
        <div className="flex flex-wrap gap-2">
          {(["exemplary", "pass", "neutral", "fail"] as TasteVerdict[]).map((v) => (
            <span
              key={v}
              className={[
                "rounded border px-3 py-1 font-mono text-[9px] uppercase tracking-widest",
                VERDICT_COLOR[v],
              ].join(" ")}
            >
              {v}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
