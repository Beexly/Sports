import type { Metadata } from "next";
import Link from "next/link";
import {
  buildIntelligenceGrowthSnapshot,
  type IntelligenceGrowthSnapshot,
} from "@/lib/intelligence/growth-observatory";

export const metadata: Metadata = {
  title: "Intelligence & Reasoning Growth Observatory | Galaxy Sports Edge",
  description:
    "Real-time observatory tracking Quad-Engine Corpus Velocity (arXiv, OpenAlex, Kaggle, Hugging Face, DOCX OMML), 4-Stage Router Funnel, and Sunday Post-Game Film Autopsy.",
  alternates: { canonical: "/intelligence/observatory" },
};

export default function IntelligenceObservatoryPage(): JSX.Element {
  const snapshot: IntelligenceGrowthSnapshot = buildIntelligenceGrowthSnapshot();
  const {
    quadEngineCounts,
    routerFunnel,
    postGameAutopsyStats,
    autonomousPipelineStatus,
    timestampIso,
  } = snapshot;

  const corpusCards = [
    {
      title: "Total Canonical Nodes",
      value: quadEngineCounts.totalCanonicalNodes.toLocaleString(),
      subtext: "Unified mathematical & reasoning corpus",
      tag: "CORE BRAIN",
      accent: "text-orbital-cyan",
    },
    {
      title: "arXiv Papers",
      value: quadEngineCounts.arxivPapers.toLocaleString(),
      subtext: "Math, physics, probability & quantitative finance",
      tag: "PEER REVIEWED",
      accent: "text-ultraviolet",
    },
    {
      title: "OpenAlex Works",
      value: quadEngineCounts.openAlexWorks ?? quadEngineCounts.openalexWorks.toLocaleString(),
      subtext: "Cross-disciplinary bibliometric graph",
      tag: "INDEXED",
      accent: "text-ion-white",
    },
    {
      title: "Kaggle Assets & Notebooks",
      value: quadEngineCounts.kaggleAssets.toLocaleString(),
      subtext: "NFL Big Data Bowl, tracking data & GPU scripts",
      tag: "30HR/WK GPU",
      accent: "text-orbital-cyan",
    },
    {
      title: "Hugging Face Datasets",
      value: quadEngineCounts.hfDatasetsAndEquations.toLocaleString(),
      subtext: "LoRA fine-tuning pairs & sports SFT benchmarks",
      tag: "HUGGINGFACE",
      accent: "text-ultraviolet",
    },
    {
      title: "DOCX OMML Equations",
      value: quadEngineCounts.docxOmmlEquations.toLocaleString(),
      subtext: "Extracted high-order formulas from research specs",
      tag: "OMML MATH",
      accent: "text-caution",
    },
    {
      title: "TS Equation Modules",
      value: quadEngineCounts.tsEquationModules.toLocaleString(),
      subtext: "Type-safe, verified TypeScript equations in engine",
      tag: "COMPILED",
      accent: "text-orbital-cyan",
    },
  ];

  const funnelSteps = [
    {
      stage: "Stage A",
      label: "Ingested Corpus Universe",
      count: routerFunnel.stageA,
      pct: "100%",
      detail: "arXiv + OpenAlex + Kaggle + Hugging Face + OMML math corpus",
    },
    {
      stage: "Stage B",
      label: "Domain Relevancy Filter",
      count: routerFunnel.stageB,
      pct: "54.8%",
      detail: "NFL, market dynamics, biomechanics, micro-pricing",
    },
    {
      stage: "Stage C",
      label: "Active Context Grid",
      count: routerFunnel.stageC,
      pct: "6.9%",
      detail: "Game-specific weather, injury splits, scheme matchups",
    },
    {
      stage: "Stage D",
      label: "Decision Equations",
      count: routerFunnel.stageD,
      pct: "0.7%",
      detail: "Final conjunction gate, calibrated confidence & CLV prediction",
    },
  ];

  const totalAutopsy =
    postGameAutopsyStats.ourDefectCount +
    postGameAutopsyStats.sharedBlindCount +
    postGameAutopsyStats.weSawCount;

  return (
    <main className="min-h-screen bg-black text-white px-4 py-8 md:px-12 lg:px-20 font-sans">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Header */}
        <header className="border-b border-gray-800 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-mono text-xs uppercase tracking-widest text-emerald-400">
                Live Intelligence Growth Observatory
              </span>
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white">
              Quad-Engine Corpus & Reasoning Velocity
            </h1>
            <p className="mt-2 text-sm md:text-base text-gray-400 max-w-3xl">
              Continuous monitoring of knowledge ingestion across Kaggle, arXiv, OpenAlex, Hugging Face,
              and Word OMML. Tracks 4-stage router pruning and Sunday 4:00 PM CT film autopsy calibration.
            </p>
          </div>
          <div className="text-right font-mono text-xs text-gray-500 shrink-0">
            <div>Snapshot: {timestampIso.slice(0, 19).replace("T", " ")} UTC</div>
            <div className="text-emerald-400 font-semibold mt-1">Autonomous Mode: ACTIVE</div>
          </div>
        </header>

        {/* Autonomous Pipeline Cadence Status Banner */}
        <section className="bg-gray-950 border border-gray-800 rounded-lg p-5 flex flex-wrap items-center justify-between gap-6">
          <div className="space-y-1">
            <span className="font-mono text-xs text-gray-400 uppercase">Last Cadence Window</span>
            <div className="text-sm font-semibold text-white">
              {autonomousPipelineStatus.lastCadenceWindow}
            </div>
          </div>
          <div className="space-y-1">
            <span className="font-mono text-xs text-gray-400 uppercase">Next T-48h Simulation Window</span>
            <div className="text-sm font-semibold text-emerald-300">
              {autonomousPipelineStatus.nextTMinus48hSimWindow}
            </div>
          </div>
          <div className="space-y-1">
            <span className="font-mono text-xs text-gray-400 uppercase">Active Packages Published</span>
            <div className="text-sm font-semibold text-white">
              {autonomousPipelineStatus.activePackagesPublished} packages
            </div>
          </div>
          <div className="space-y-1">
            <span className="font-mono text-xs text-gray-400 uppercase">Autonomous Agent Fleet</span>
            <div className="text-sm font-semibold text-indigo-300">
              {autonomousPipelineStatus.activeAgentsOnline} Online (AVA, BOBBY, JARVIS, SARAH, SCOUT, TAL)
            </div>
          </div>
        </section>

        {/* Section 1: Quad-Engine Corpus Velocity */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white">
              1. Quad-Engine Corpus Velocity
            </h2>
            <span className="text-xs font-mono text-gray-400 uppercase">
              Ingest & Learn Standing Doctrine
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {corpusCards.map((card, idx) => (
              <div
                key={idx}
                className="bg-gray-950 border border-gray-800 rounded-lg p-5 flex flex-col justify-between hover:border-gray-700 transition"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-gray-400 px-2 py-0.5 rounded bg-gray-900 border border-gray-800">
                      {card.tag}
                    </span>
                  </div>
                  <div className="mt-4 text-3xl font-black font-mono text-white">
                    {card.value}
                  </div>
                  <div className="text-sm font-medium text-gray-300 mt-1">{card.title}</div>
                </div>
                <div className="mt-4 pt-3 border-t border-gray-900 text-xs text-gray-500">
                  {card.subtext}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Section 2: The 4-Stage Router Funnel */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white">
                2. Four-Stage Router Funnel
              </h2>
              <p className="text-xs md:text-sm text-gray-400 mt-1">
                From full theoretical corpus to millisecond-grade execution: 3,646 &rarr; 2,000 &rarr; 250 &rarr; 25
              </p>
            </div>
            <span className="font-mono text-xs text-emerald-400">Lat &lt; 14ms</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {funnelSteps.map((step, idx) => (
              <div
                key={idx}
                className="bg-gray-950 border border-gray-800 rounded-lg p-5 relative overflow-hidden"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-xs font-bold text-emerald-400">
                    {step.stage}
                  </span>
                  <span className="font-mono text-xs text-gray-400">{step.pct}</span>
                </div>
                <div className="text-2xl font-black font-mono text-white">
                  {step.count.toLocaleString()}
                </div>
                <div className="text-sm font-semibold text-gray-200 mt-1">{step.label}</div>
                <p className="text-xs text-gray-500 mt-2 leading-relaxed">{step.detail}</p>
                <div className="mt-4 w-full bg-gray-900 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-400 h-full rounded-full"
                    style={{
                      width: `${(step.count / routerFunnel.stageA) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Section 3: Sunday 4:00 PM CT Film Autopsy */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white">
                3. Sunday 4:00 PM CT Post-Game Film Autopsy
              </h2>
              <p className="text-xs md:text-sm text-gray-400 mt-1">
                Decomposition of graded outcomes: our_defect vs shared_blind vs we_saw
              </p>
            </div>
            <span className="font-mono text-xs text-gray-400">
              Total Graded: {postGameAutopsyStats.gamesGraded} games
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-950 border border-red-950/60 rounded-lg p-5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs uppercase tracking-wider text-red-400">
                  our_defect
                </span>
                <span className="font-mono text-xs text-red-300">
                  {((postGameAutopsyStats.ourDefectCount / (totalAutopsy || 1)) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="text-3xl font-black font-mono text-red-400 mt-3">
                {postGameAutopsyStats.ourDefectCount}
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Missed edge or mis-calibrated model factor. Triggers immediate auto-retrain of factor weights.
              </p>
            </div>

            <div className="bg-gray-950 border border-yellow-950/60 rounded-lg p-5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs uppercase tracking-wider text-yellow-400">
                  shared_blind
                </span>
                <span className="font-mono text-xs text-yellow-300">
                  {((postGameAutopsyStats.sharedBlindCount / (totalAutopsy || 1)) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="text-3xl font-black font-mono text-yellow-400 mt-3">
                {postGameAutopsyStats.sharedBlindCount}
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Unforeseeable black-swan event (freak injury, weather disruption) where both model and Vegas closing line were blind.
              </p>
            </div>

            <div className="bg-gray-950 border border-emerald-950/60 rounded-lg p-5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs uppercase tracking-wider text-emerald-400">
                  we_saw
                </span>
                <span className="font-mono text-xs text-emerald-300">
                  {((postGameAutopsyStats.weSawCount / (totalAutopsy || 1)) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="text-3xl font-black font-mono text-emerald-400 mt-3">
                {postGameAutopsyStats.weSawCount}
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Correctly exploited edge where market was inefficient or slow to adjust to news/schematics.
              </p>
            </div>
          </div>

          {/* Brier Score & CLV Weekly Trajectory */}
          <div className="bg-gray-950 border border-gray-800 rounded-lg p-5 space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-300 font-mono">
              Calibration & CLV Trajectory Across Ingestion Weeks
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-400">
                    <th className="py-2 px-3">Week</th>
                    <th className="py-2 px-3">Brier Score (&darr; lower is sharper)</th>
                    <th className="py-2 px-3">Mean CLV (&uarr; higher is sharper)</th>
                    <th className="py-2 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-900">
                  {postGameAutopsyStats.brierTrajectory.map((pt, i) => (
                    <tr key={i} className="hover:bg-gray-900/40">
                      <td className="py-2.5 px-3 font-bold text-white">{pt.week}</td>
                      <td className="py-2.5 px-3 text-emerald-300">{pt.brier.toFixed(4)}</td>
                      <td className="py-2.5 px-3 text-indigo-300">
                        {pt.clvMean >= 0 ? `+${(pt.clvMean * 100).toFixed(2)}%` : `${(pt.clvMean * 100).toFixed(2)}%`}
                      </td>
                      <td className="py-2.5 px-3 text-gray-400">
                        {i === postGameAutopsyStats.brierTrajectory.length - 1 ? (
                          <span className="text-emerald-400 font-bold">CURRENT PEAK</span>
                        ) : (
                          "CALIBRATED"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Section 4: Live Equation Traces & Cockpit Navigation */}
        <section className="bg-gray-950 border border-gray-800 rounded-lg p-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-white">Observatory & Operator Navigation</h3>
              <p className="text-xs text-gray-400 mt-1">
                Access Cockpit autonomous controls, Hermes mind dashboard, or research ledgers.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/cockpit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-black font-semibold text-xs rounded transition"
              >
                Launch Cockpit Console
              </Link>
              <Link
                href="/intelligence/metrics"
                className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-gray-300 border border-gray-700 font-semibold text-xs rounded transition"
              >
                Metric Methodology
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
