import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { Reveal, Stagger } from "@/components/motion/reveal";
import { Atmosphere } from "@/components/ui/atmosphere";
import { GeneratedPlate } from "@/components/immersive/generated-plate";
import { BRAND_COLORS } from "@/lib/brand";
import { loadSummary, loadKingScorecard } from "@/lib/statking/product";
import { STATUS_STYLE, CAPABILITY_COLUMNS, type StatusKey } from "@/lib/intelligence/capabilities";
import { ConsensusConstellationLazy } from "@/components/hero/consensus-constellation-lazy";

export const metadata: Metadata = {
  title: "Intelligence Stack — How Galaxy Sports Edge Works",
  description:
    "Every component of the Galaxy pick-generation engine — rights-gated data sources, multi-factor intelligence layers, decision gates, and tamper-evident receipts — in one transparent diagram.",
  alternates: { canonical: "/stack" },
};

// ─── Data layer ───────────────────────────────────────────────────────────────

// Real moats surfaced from the King Standard scorecard (rule #2: no fabricated
// breakdown). Decorative bars use brand accents only — never the magenta/alert
// semantic roles. Scores are read at render from the scorecard file.
const KING_DIM_MOATS = [
  { label: "Source Trust",        moat: "source trust moat",      color: BRAND_COLORS.orbitalCyan },
  { label: "Explanation / UX",    moat: "explanation/UX moat",    color: BRAND_COLORS.softUltraviolet },
  { label: "Proof & Backtesting", moat: "proof/backtesting moat", color: BRAND_COLORS.orbitalCyan },
  { label: "Model & Prediction",  moat: "model/prediction moat",  color: BRAND_COLORS.softUltraviolet },
] as const;


const BOTTOM_FEATURES = [
  {
    accent: BRAND_COLORS.orbitalCyan,
    title: "Rights-gated pipeline",
    body: "Every data source passes through a clearance engine before a single byte is ingested. Sources without approved rights status never touch the prediction stack.",
  },
  {
    accent: BRAND_COLORS.softUltraviolet,
    title: "Calibrated confidence",
    body: "Confidence scores are graded against real settled outcomes — not trained on cherry-picked wins. The model audits its own calibration over time.",
  },
  {
    accent: BRAND_COLORS.ionMagenta,
    title: "Tamper-evident receipts",
    body: "Every published pick is cryptographically committed before the event. The history cannot be quietly edited — not even by us.",
  },
] as const;

// ─── Node-graph data ───────────────────────────────────────────────────────────

// viewBox 900×520, center at (450, 260)
const NODES = [
  // Center
  { id: "core",     x: 450, y: 260, r: 44, label: "GALAXY\nENGINE", color: BRAND_COLORS.orbitalCyan,    isCore: true },
  // Layer 1: Data In (cardinal)
  { id: "odds",     x: 450, y:  55, r: 32, label: "Odds API",         color: BRAND_COLORS.orbitalCyan,   isCore: false },
  { id: "nfl",      x: 740, y: 260, r: 32, label: "nflverse",         color: BRAND_COLORS.orbitalCyan,   isCore: false },
  { id: "market",   x: 450, y: 465, r: 32, label: "Market\nSignal",   color: BRAND_COLORS.orbitalCyan,   isCore: false },
  { id: "media",    x: 160, y: 260, r: 32, label: "Media\nIntel",     color: BRAND_COLORS.orbitalCyan,   isCore: false },
  // Layer 2: Intelligence (diagonal)
  { id: "conf",     x: 650, y: 110, r: 28, label: "Confidence\nScore", color: BRAND_COLORS.softUltraviolet, isCore: false },
  { id: "clv",      x: 650, y: 410, r: 28, label: "CLV\nCalib.",      color: BRAND_COLORS.softUltraviolet, isCore: false },
  { id: "factor",   x: 250, y: 410, r: 28, label: "Factor\nModel",    color: BRAND_COLORS.softUltraviolet, isCore: false },
  { id: "gate",     x: 250, y: 110, r: 28, label: "No-Bet\nGate",     color: "#FFB454",                    isCore: false },
] as const;

// Lines: pairs of node IDs
const EDGES: ReadonlyArray<[string, string]> = [
  ["core", "odds"], ["core", "nfl"], ["core", "market"], ["core", "media"],
  ["core", "conf"], ["core", "clv"], ["core", "factor"], ["core", "gate"],
  ["odds", "conf"], ["nfl", "conf"], ["nfl", "clv"], ["market", "clv"],
  ["market", "factor"], ["media", "factor"], ["media", "gate"], ["odds", "gate"],
];

// ─── Sub-components ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: StatusKey }) {
  const s = STATUS_STYLE[status];
  return (
    <span
      className="rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em]"
      style={{ color: s.color, background: s.bg, borderColor: s.border }}
    >
      {status}
    </span>
  );
}

function NodeGraph() {
  const nodeMap = Object.fromEntries(NODES.map((n) => [n.id, n]));

  return (
    <div
      className="relative mx-auto w-full overflow-hidden rounded-2xl"
      style={{
        maxWidth: 900,
        background: "rgba(0,0,0,0.30)",
        border: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <svg
        viewBox="0 0 900 520"
        aria-hidden="true"
        role="presentation"
        className="w-full"
        style={{ display: "block" }}
      >
        <defs>
          {/* Glow filters per color */}
          <filter id="glow-cyan" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="4" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="glow-uv" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="glow-core" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="8" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <radialGradient id="core-fill" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(0,229,255,0.25)" />
            <stop offset="60%" stopColor="rgba(122,92,255,0.15)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </radialGradient>
        </defs>

        {/* Background ambient glow */}
        <circle cx="450" cy="260" r="200" fill="url(#core-fill)" />

        {/* Edges */}
        {EDGES.map(([a, b]) => {
          const na = nodeMap[a];
          const nb = nodeMap[b];
          if (!na || !nb) return null;
          const isCore = a === "core" || b === "core";
          return (
            <line
              key={`${a}-${b}`}
              x1={na.x} y1={na.y}
              x2={nb.x} y2={nb.y}
              stroke={isCore ? "rgba(0,229,255,0.18)" : "rgba(122,92,255,0.12)"}
              strokeWidth={isCore ? 1.2 : 0.8}
              strokeDasharray={isCore ? "none" : "4 6"}
            />
          );
        })}

        {/* Nodes */}
        {NODES.map((node) => {
          const lines = node.label.split("\n");
          return (
            <g key={node.id} filter={node.isCore ? "url(#glow-core)" : "url(#glow-cyan)"}>
              {/* Outer glow ring */}
              <circle
                cx={node.x} cy={node.y} r={node.r + 8}
                fill="none"
                stroke={node.color}
                strokeWidth={0.5}
                strokeOpacity={0.25}
              />
              {/* Main circle */}
              <circle
                cx={node.x} cy={node.y} r={node.r}
                fill={node.isCore ? "rgba(0,229,255,0.12)" : `${node.color}16`}
                stroke={node.color}
                strokeWidth={node.isCore ? 1.5 : 1}
                strokeOpacity={node.isCore ? 0.9 : 0.7}
              />
              {/* Label */}
              {lines.map((line, i) => (
                <text
                  key={i}
                  x={node.x} y={node.y + (lines.length === 1 ? 0 : i === 0 ? -7 : 9)}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={node.isCore ? "white" : node.color}
                  fontSize={node.isCore ? 10 : 8}
                  fontFamily="JetBrains Mono, monospace"
                  fontWeight={node.isCore ? "700" : "500"}
                  letterSpacing="0.04em"
                >
                  {line}
                </text>
              ))}
            </g>
          );
        })}

        {/* Animated pulse ring on core */}
        <circle
          cx="450" cy="260" r="55"
          fill="none"
          stroke="rgba(0,229,255,0.25)"
          strokeWidth="1"
          style={{ animation: "node-pulse 3s ease-in-out infinite" }}
        />
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-t px-6 py-3" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
        {[
          { color: BRAND_COLORS.orbitalCyan, label: "Data In" },
          { color: BRAND_COLORS.softUltraviolet, label: "Intelligence" },
          { color: "#FFB454", label: "Gate" },
          { color: BRAND_COLORS.ionMagenta, label: "Output" },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
            <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink-500">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StackPage() {
  const summary = loadSummary();
  const scorecard = loadKingScorecard();
  const kingScore: number = scorecard.overall_score || 0;
  const kingDims = KING_DIM_MOATS.map((d) => ({ ...d, score: scorecard.dimensions[d.moat] ?? 0 }));

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: BRAND_COLORS.obsidianBlack }}>
      <Atmosphere />
      <Nav />

      <main id="main-content" className="flex-1">
        {/* ── Hero ── */}
        <section className="relative isolate overflow-hidden px-4 pb-16 pt-24 sm:px-6 lg:px-8">
          <GeneratedPlate assetId="engine-core" className="-z-20 opacity-40" />
          {/* Living galaxy backdrop — between the plate (-z-20) and the radial
              scrim/content. Decorative, aria-hidden, lazy + reduced-motion safe. */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-[15] opacity-50">
            <ConsensusConstellationLazy />
          </div>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[30rem]"
            style={{
              background: `radial-gradient(55% 80% at 50% 0%, rgba(0,229,255,0.12), transparent 65%), radial-gradient(40% 55% at 80% 25%, rgba(122,92,255,0.10), transparent 60%)`,
            }}
          />
          <div className="mx-auto max-w-4xl text-center">
            <Reveal>
              <span
                className="inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em]"
                style={{
                  color: BRAND_COLORS.orbitalCyan,
                  borderColor: "rgba(0,229,255,0.30)",
                  backgroundColor: "rgba(0,229,255,0.08)",
                }}
              >
                Intelligence Stack
              </span>
            </Reveal>
            <Reveal delay={90}>
              <h1
                className="mt-5 font-display text-balance text-white"
                style={{ fontSize: "clamp(2.4rem, 7vw, 5rem)", lineHeight: 1.0, letterSpacing: "-0.02em" }}
              >
                One engine.{" "}
                <span
                  style={{
                    background: `linear-gradient(90deg, ${BRAND_COLORS.orbitalCyan} 0%, ${BRAND_COLORS.softUltraviolet} 100%)`,
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  Endless edge.
                </span>
              </h1>
            </Reveal>
            <Reveal delay={160}>
              <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-ink-300">
                Every component of the Galaxy pick-generation engine — its data sources,
                intelligence layers, decision gates, and proof trail — in one transparent
                diagram. Nothing hidden. Every layer earns its place or gets cut.
              </p>
            </Reveal>
          </div>
        </section>

        {/* ── Node-graph visualization ── */}
        <section className="px-4 pb-10 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <p className="eyebrow" style={{ color: BRAND_COLORS.orbitalCyan }}>
                Architecture diagram
              </p>
              <h2
                className="mt-3 font-display text-white"
                style={{ fontSize: "clamp(1.6rem, 3.5vw, 2.4rem)", lineHeight: 1.1 }}
              >
                How the components connect.
              </h2>
              <p className="mt-3 max-w-2xl text-sm text-ink-400">
                The engine is a layered system — data flows in, gets scored and gated, and only
                then publishes. Receipts close the loop. Every node is live or marked otherwise.
              </p>
            </Reveal>
            <Reveal delay={80}>
              <div className="mt-8">
                <NodeGraph />
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── Stack capability grid ── */}
        <section className="px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <Reveal>
              <h2
                className="font-display text-white"
                style={{ fontSize: "clamp(1.6rem, 3.5vw, 2.4rem)", lineHeight: 1.1 }}
              >
                The capability matrix.
              </h2>
              <p className="mt-3 max-w-2xl text-sm text-ink-400">
                Four layers, each with a clear job. Status badges are live — nothing gets
                LIVE until it actually is.
              </p>
            </Reveal>
            <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
              {CAPABILITY_COLUMNS.map((col) => (
                <Reveal key={col.label}>
                  <div
                    className="flex flex-col overflow-hidden rounded-2xl border"
                    style={{
                      borderColor: `${col.color}22`,
                      background: `linear-gradient(160deg, ${col.color}06 0%, rgba(8,6,20,0.9) 100%)`,
                    }}
                  >
                    {/* Column header */}
                    <div
                      className="border-b px-4 py-3"
                      style={{ borderColor: `${col.color}20`, background: `${col.color}08` }}
                    >
                      <span
                        className="rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em]"
                        style={{ color: col.color, borderColor: `${col.color}40`, background: `${col.color}12` }}
                      >
                        {col.label}
                      </span>
                    </div>
                    {/* Items */}
                    <div className="flex flex-col divide-y" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                      {col.items.map((item) => (
                        <div key={item.name} className="flex items-center justify-between gap-3 px-4 py-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-white truncate">{item.name}</p>
                            <p className="text-xs text-ink-400 truncate">{item.note}</p>
                          </div>
                          <StatusBadge status={item.status} />
                        </div>
                      ))}
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── King Standard readiness ── */}
        <section className="px-4 py-10 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <Reveal>
              <div
                className="overflow-hidden rounded-2xl border p-6"
                style={{
                  borderColor: "rgba(0,229,255,0.20)",
                  background: "linear-gradient(135deg, rgba(0,229,255,0.06) 0%, rgba(8,6,20,0.9) 100%)",
                }}
              >
                <div className="flex items-start justify-between gap-6">
                  <div>
                    <p className="eyebrow" style={{ color: BRAND_COLORS.orbitalCyan }}>
                      King Standard
                    </p>
                    <p className="mt-1 font-display text-4xl font-extrabold tabular-nums text-white">
                      {kingScore} <span className="text-xl text-ink-500">/ 100</span>
                    </p>
                    <p className="mt-2 text-sm text-ink-300">
                      Autonomous foundation — real sources, rights-gated, fixture-backed.
                      90+ requires live feeds, active licenses, and a settled-pick archive.
                    </p>
                  </div>
                  {/* Dimensional score summary */}
                  <div className="hidden shrink-0 sm:block">
                    <p className="mb-3 font-mono text-[9px] uppercase tracking-[0.2em] text-ink-500">
                      Breakdown
                    </p>
                    {kingDims.map(({ label, score, color }) => (
                      <div key={label} className="mb-2 flex items-center gap-3">
                        <span className="w-28 text-xs text-ink-400 truncate">{label}</span>
                        <div className="relative h-1.5 w-24 overflow-hidden rounded-full bg-white/[0.06]">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${Math.min(100, Math.max(0, score))}%`, background: color, boxShadow: `0 0 6px ${color}80` }}
                          />
                        </div>
                        <span className="w-6 text-right font-mono text-xs tabular-nums" style={{ color }}>
                          {score}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap gap-3">
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-400">
                    {summary.source_count} sources tracked
                  </span>
                  <span className="text-ink-600">·</span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-400">
                    {summary.systems.length} data systems
                  </span>
                  <span className="text-ink-600">·</span>
                  <Link href="/stats" className="font-mono text-[10px] uppercase tracking-[0.14em] text-orbital-cyan hover:text-white transition-colors">
                    Full StatKing dashboard →
                  </Link>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── Bottom 3-feature strip ── */}
        <section className="px-4 pb-24 pt-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <Stagger className="grid grid-cols-1 gap-4 sm:grid-cols-3" step={80}>
              {BOTTOM_FEATURES.map((f) => (
                <div
                  key={f.title}
                  className="overflow-hidden rounded-2xl border p-5"
                  style={{
                    borderColor: `${f.accent}20`,
                    background: `${f.accent}06`,
                    borderTopWidth: "3px",
                    borderTopColor: `${f.accent}60`,
                  }}
                >
                  <p className="font-display text-base font-semibold text-white">{f.title}</p>
                  <p className="mt-2 text-sm leading-6 text-ink-300">{f.body}</p>
                </div>
              ))}
            </Stagger>

            {/* Cross-links */}
            <Reveal delay={160}>
              <Stagger className="mt-10 flex flex-wrap gap-3 text-sm" step={50}>
                {[
                  { href: "/intelligence", label: "Inside the signal →" },
                  { href: "/methodology", label: "How a pick is scored →" },
                  { href: "/clv", label: "Closing line value →" },
                  { href: "/accountability", label: "Full accountability →" },
                  { href: "/observatory", label: "Live market & lines →" },
                ].map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="rounded-lg border px-4 py-2 text-ink-300 transition-colors hover:border-orbital-cyan/30 hover:text-white"
                    style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.025)" }}
                  >
                    {link.label}
                  </Link>
                ))}
              </Stagger>
            </Reveal>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
