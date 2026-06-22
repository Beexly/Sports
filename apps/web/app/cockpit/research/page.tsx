import Link from "next/link";
import {
  COMPETITOR_INTELLIGENCE,
  summarizeCompetitorCategories,
} from "@/lib/research/competitor-intelligence";
import {
  REVENUE_MODELS,
  coreRevenueModels,
} from "@/lib/research/revenue-intelligence";
import {
  FIRST_OF_KIND_SYSTEMS,
  confirmedUniqueCount,
  liveOrInSprintSystems,
} from "@/lib/research/first-of-kind-systems";
import {
  DOMAIN_TRANSFERS,
  v1ReadyTransfers,
} from "@/lib/research/outside-domain-transfer";
import {
  SIGNAL_DEFINITIONS,
  NO_PLAY_DOCTRINE,
  primarySignals,
} from "@/lib/research/prediction-methods";

export const dynamic = "force-dynamic";

interface ResearchModule {
  title: string;
  description: string;
  href: string;
  stats: Array<{ label: string; value: string }>;
  color: string;
}

export default function ResearchCockpitPage(): JSX.Element {
  const confirmedUnique = confirmedUniqueCount();
  const liveOrSprint = liveOrInSprintSystems();
  const coreModels = coreRevenueModels();
  const v1Transfers = v1ReadyTransfers();
  const primarySigs = primarySignals();
  const competitorCategoryRecord = summarizeCompetitorCategories(COMPETITOR_INTELLIGENCE);
  const competitorCategoryCount = Object.keys(competitorCategoryRecord).length;

  const modules: ResearchModule[] = [
    {
      title: "Competitor Intelligence",
      description: "Full competitive landscape map — 32+ competitors across fantasy, DFS, prediction, and analytics.",
      href: "/cockpit/competitors",
      stats: [
        { label: "Competitors", value: String(COMPETITOR_INTELLIGENCE.length) },
        { label: "Categories", value: String(competitorCategoryCount) },
        { label: "Confirmed unique GSE features", value: String(confirmedUnique) },
      ],
      color: "text-cyan-300",
    },
    {
      title: "Revenue Intelligence",
      description: "15 revenue models, competitor pricing, affiliate risk map, and proof-gated pricing ladder.",
      href: "/cockpit/revenue",
      stats: [
        { label: "Revenue models", value: String(REVENUE_MODELS.length) },
        { label: "Core (FOUNDING tier)", value: String(coreModels.length) },
        { label: "Competitors priced", value: "9" },
      ],
      color: "text-emerald-300",
    },
    {
      title: "First-of-Kind Product Map",
      description: "30+ product systems with no competitor equivalent, including scoring models and build phases.",
      href: "/cockpit/product-map",
      stats: [
        { label: "Systems documented", value: String(FIRST_OF_KIND_SYSTEMS.length) },
        { label: "Confirmed unique", value: String(confirmedUnique) },
        { label: "Live or in sprint", value: String(liveOrSprint.length) },
      ],
      color: "text-violet-300",
    },
    {
      title: "Prediction Methods",
      description: "Vegas mechanics, calibration science (MAE, RMSE, Brier, CLV), signal taxonomy, and No-Play doctrine.",
      href: "/cockpit/research/prediction",
      stats: [
        { label: "Calibration metrics", value: "9" },
        { label: "Primary signals", value: String(primarySigs.length) },
        { label: "No-Play reasons", value: String(NO_PLAY_DOCTRINE.length) },
      ],
      color: "text-yellow-300",
    },
    {
      title: "Outside Domain Transfers",
      description: "15 domains (finance, poker, aviation, NASA, medical) and their concrete V1/V2 GSE applications.",
      href: "/cockpit/research/outside-domain",
      stats: [
        { label: "Domains", value: String(DOMAIN_TRANSFERS.length) },
        { label: "V1 ready", value: String(v1Transfers.length) },
        { label: "V2 roadmap", value: String(DOMAIN_TRANSFERS.length - v1Transfers.length) },
      ],
      color: "text-orange-300",
    },
    {
      title: "Source Rights",
      description: "Source registry, scraping clearance gates, integrity invariants, and compliance requirements.",
      href: "/cockpit/source-rights",
      stats: [
        { label: "Sources registered", value: "9+" },
        { label: "Signals tracked", value: String(SIGNAL_DEFINITIONS.length) },
        { label: "Integrity invariants", value: "11" },
      ],
      color: "text-red-300",
    },
  ];

  const researchDocs = [
    { file: "GSE_2026_MASTER_COMPETITIVE_INTELLIGENCE.md", lines: "~2,800", status: "committed" },
    { file: "GSE_2026_FANTASY_DFS_PREDICTION_MARKET_MAP.md", lines: "~1,100", status: "committed" },
    { file: "GSE_2026_REVENUE_MONETIZATION_PLAYBOOK.md", lines: "~800", status: "committed" },
    { file: "GSE_2026_PREDICTION_ANALYTICS_AND_VEGAS_RESEARCH.md", lines: "~900", status: "committed" },
    { file: "GSE_2026_OUTSIDE_DOMAIN_ANALYTICS_TRANSFER.md", lines: "~580", status: "committed" },
    { file: "GSE_2026_FIRST_OF_KIND_PRODUCT_SYSTEMS.md", lines: "~2,800", status: "committed" },
    { file: "GSE_2026_LEAGUE_MEMORY_AND_VOICE_JARVIS.md", lines: "~900", status: "committed" },
    { file: "GSE_2026_SOURCE_RIGHTS_AND_COMPLIANCE.md", lines: "~720", status: "committed" },
    { file: "GSE_2026_IMPLEMENTATION_ROADMAP.md", lines: "~820", status: "committed" },
    { file: "GSE_2026_GAP_ANALYSIS.md", lines: "~350", status: "committed" },
    { file: "GSE_2026_OWNER_REPORT.md", lines: "~600", status: "committed" },
    { file: "GSE_2026_CLAUDE_CODE_HANDOFF.md", lines: "~580", status: "committed" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-yellow-300">
            Research Command Center
          </p>
          <h1 className="mt-1 text-2xl font-bold text-ion-white">GSE 2026 Research Hub</h1>
        </div>
        <p className="max-w-3xl text-sm leading-6 text-ion-2">
          Complete research intelligence for Galaxy Sports Edge. All data contracts are TypeScript-strict,
          machine-readable, and linked to the implementation roadmap.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((mod) => (
          <Link key={mod.href} href={mod.href} className="rounded-2xl border border-titanium/40 bg-eclipse/40 p-5 transition-colors hover:border-titanium/60 hover:bg-eclipse/60">
            <p className={`text-[10px] font-semibold uppercase tracking-widest ${mod.color}`}>
              Research Module
            </p>
            <p className="mt-1 font-semibold text-ion-white">{mod.title}</p>
            <p className="mt-2 text-xs leading-5 text-ion-2">{mod.description}</p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {mod.stats.map((stat) => (
                <div key={stat.label}>
                  <p className="font-numerals text-lg font-semibold text-ion-white">{stat.value}</p>
                  <p className="text-[10px] leading-4 text-ion-3">{stat.label}</p>
                </div>
              ))}
            </div>
          </Link>
        ))}
      </section>

      <section className="overflow-hidden rounded-2xl border border-titanium/40 bg-obsidian/60">
        <div className="border-b border-titanium/40 px-4 py-3">
          <h2 className="text-sm font-semibold text-ion-white">Research documents</h2>
          <p className="mt-1 text-xs text-ion-3">
            Located at docs/research/. All committed to claude/laughing-wozniak-gyryjx.
          </p>
        </div>
        <div className="divide-y divide-titanium/30">
          {researchDocs.map((doc) => (
            <div key={doc.file} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <p className="min-w-0 flex-1 font-mono text-xs text-ion-1">{doc.file}</p>
              <span className="font-mono text-[10px] text-ion-3">{doc.lines} lines</span>
              <span className="rounded border border-emerald-500/30 bg-emerald-950/30 px-1.5 py-0.5 text-[10px] text-emerald-200">
                {doc.status}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-titanium/40 bg-eclipse/40 p-5">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-ion-3">TypeScript data contracts</h2>
        <p className="mt-2 text-sm text-ion-2">
          Machine-readable data contracts under apps/web/lib/. All TypeScript strict mode, no any.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {[
            "lib/research/competitor-intelligence.ts",
            "lib/research/revenue-intelligence.ts",
            "lib/research/prediction-methods.ts",
            "lib/research/outside-domain-transfer.ts",
            "lib/research/first-of-kind-systems.ts",
            "lib/fantasy/draft-intelligence-roadmap.ts",
            "lib/fantasy/league-memory-roadmap.ts",
            "lib/fantasy/voice-jarvis-roadmap.ts",
            "lib/fantasy/historical-draft-intelligence.ts",
            "lib/gse/decision-graph-roadmap.ts",
            "lib/gse/revenue-operating-model.ts",
            "lib/gse/source-rights-gates.ts",
          ].map((path) => (
            <div key={path} className="rounded-lg border border-titanium/40 bg-obsidian/70 px-3 py-2">
              <p className="font-mono text-[11px] text-ion-1">{path}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
