import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { Reveal } from "@/components/motion/reveal";
import { ConsensusEngine3DLazy } from "@/components/hero/consensus-engine-3d-lazy";
import { Ticker } from "@/components/ui/ticker";
import { ReasoningShowcase } from "@/components/intelligence/reasoning-showcase";
import { CipherShard } from "@/components/cipher/cipher-shard";
import { CipherConsoleMount } from "@/components/cipher/cipher-console-mount";
import { Atmosphere } from "@/components/ui/atmosphere";
import { GeneratedPlate } from "@/components/immersive/generated-plate";
import { SignalCourtroom } from "@/components/courtroom/signal-courtroom";
import { DecisionAutopsy } from "@/components/courtroom/decision-autopsy";
import { AgentWarRoom } from "@/components/war-room/agent-war-room";
import { ILLUSTRATIVE_BRIEF } from "@/lib/courtroom/courtroom";
import { BRAND_COLORS, CLOSING_LINE } from "@/lib/brand";
import { CapabilityMatrix } from "@/components/intelligence/capability-matrix";

const TICKER_PHRASES = [
  "Math you can read",
  "See the reasoning — not just the number",
  "Independent referees, judged on their own",
  "Edge lives in the disagreement",
  "Graded against the close",
  "It audits its own calibration",
  "A record that can't be rewritten",
  "Silence when there's nothing honest to say",
] as const;

export const metadata: Metadata = {
  title: "Inside the Signal — How the Intelligence Works",
  description:
    "A look inside the glass box: independent referees, consensus and divergence, calibrated edge, and a tamper-evident record. Methodology, not promises.",
  alternates: { canonical: "/intelligence" },
};

/**
 * /intelligence — the glass-box showpiece. Dark, cinematic, kinetic, accessible.
 *
 * DOCTRINE: explains METHODOLOGY only — never asserts a performance number (those
 * are gated behind the calibration readiness gate) and uses no banned-language.
 * The living hero is the brand's InteractiveGalaxy (reduced-motion-aware, aria-hidden);
 * a scrim guarantees text contrast; motion runs through <Reveal>; contrast is the
 * cyan/ultraviolet signal palette on obsidian (well above WCAG AA).
 */

const CHAIN: ReadonlyArray<{
  readonly step: string;
  readonly title: string;
  readonly body: string;
  readonly accent: string;
}> = [
  {
    step: "01",
    title: "Independent referees",
    body: "Several estimates score each game without looking at the sportsbook's price — a sharp exchange, a structured model, the wider market. Different lenses, judged on their own.",
    accent: BRAND_COLORS.orbitalCyan,
  },
  {
    step: "02",
    title: "Consensus & divergence",
    body: "We measure where the referees agree and where they pull apart. Agreement reads as confidence; a shared disagreement with the price is where an edge can live.",
    accent: BRAND_COLORS.softUltraviolet,
  },
  {
    step: "03",
    title: "Calibrated edge",
    body: "A signal surfaces only when independent estimates diverge from the price and agree on the direction. With nothing independent to say, the honest default is silence.",
    accent: BRAND_COLORS.orbitalCyan,
  },
  {
    step: "04",
    title: "Graded against the close",
    body: "Every signal carries an expected closing-line value and is graded against where the market actually settles — because beating the close is the claim worth making.",
    accent: BRAND_COLORS.ionMagenta,
  },
  {
    step: "05",
    title: "It audits itself",
    body: "The model watches its own calibration over time and raises a flag when accuracy drifts — so the system notices it is slipping before you do.",
    accent: BRAND_COLORS.softUltraviolet,
  },
  {
    step: "06",
    title: "A record that can't be rewritten",
    body: "Each published signal is committed cryptographically before the event. The history is tamper-evident: nothing gets quietly edited after the fact.",
    accent: BRAND_COLORS.orbitalCyan,
  },
];

const ARCH_LAYERS = [
  {
    id: "layer-data",
    name: "RAW DATA",
    desc: "Rights-cleared intake",
    color: BRAND_COLORS.orbitalCyan,
    nodes: ["The Odds API", "nflverse", "Media Signal", "Market Movement"],
  },
  {
    id: "layer-signal",
    name: "SIGNAL EXTRACTION",
    desc: "Factor scoring",
    color: BRAND_COLORS.softUltraviolet,
    nodes: ["Line Movement", "Factor Score", "Scheme Context", "Opportunity Index"],
  },
  {
    id: "consensus",
    name: "CONSENSUS",
    desc: "Multi-agent agreement",
    color: "#FFB454",
    nodes: ["Agent 1", "Agent 2", "Agent 3", "Divergence Check"],
  },
  {
    id: "layer-decision",
    name: "DECISION",
    desc: "Gate + receipt",
    color: BRAND_COLORS.ionMagenta,
    nodes: ["Confidence ≥55?", "No-Bet Gate", "Published Pick", "Tamper-Evident Receipt"],
  },
] as const;

function ConsensusField() {
  // Decorative "referees converging on consensus" motif — the precise companion
  // to the ambient galaxy. Purely visual.
  const dots = [
    { cx: 70, cy: 60, fill: BRAND_COLORS.orbitalCyan },
    { cx: 330, cy: 70, fill: BRAND_COLORS.softUltraviolet },
    { cx: 60, cy: 250, fill: BRAND_COLORS.ionMagenta },
    { cx: 340, cy: 240, fill: BRAND_COLORS.orbitalCyan },
    { cx: 200, cy: 40, fill: BRAND_COLORS.softUltraviolet },
    { cx: 200, cy: 270, fill: BRAND_COLORS.orbitalCyan },
  ];
  return (
    <svg viewBox="0 0 400 320" aria-hidden="true" role="presentation" className="h-full w-full">
      <defs>
        <radialGradient id="core" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={BRAND_COLORS.orbitalCyan} stopOpacity="0.9" />
          <stop offset="100%" stopColor={BRAND_COLORS.orbitalCyan} stopOpacity="0" />
        </radialGradient>
        <filter id="cf-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3.2" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {dots.map((d, i) => (
        <line
          key={`l${i}`}
          x1={d.cx}
          y1={d.cy}
          x2={200}
          y2={155}
          stroke={d.fill}
          strokeOpacity="0.4"
          strokeWidth="1.25"
        />
      ))}
      <circle cx="200" cy="155" r="78" fill="url(#core)" className="motion-safe:animate-pulse" />
      <g filter="url(#cf-glow)">
        {dots.map((d, i) => (
          <circle key={`d${i}`} cx={d.cx} cy={d.cy} r="6.5" fill={d.fill} />
        ))}
        <circle cx="200" cy="155" r="11" fill={BRAND_COLORS.ionWhite} />
      </g>
    </svg>
  );
}

export default function IntelligencePage() {
  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: BRAND_COLORS.obsidianBlack }}>
      <Atmosphere />
      <Nav />

      <main className="flex-1">
        {/* Hero — the interactive engine itself, full-screen intro */}
        <section className="relative isolate min-h-screen overflow-hidden">
          <GeneratedPlate assetId="intelligence-deepsignal" className="-z-20 opacity-60" />
          <div className="absolute inset-0 z-0">
            <ConsensusEngine3DLazy />
          </div>
          {/* Local bottom scrim — readable headline without hiding the upper labels */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] h-3/5"
            style={{
              background: `linear-gradient(180deg, transparent 0%, ${BRAND_COLORS.obsidianBlack}cc 65%, ${BRAND_COLORS.obsidianBlack} 100%)`,
            }}
          />
          <div className="pointer-events-none relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col justify-end px-4 pb-20 pt-32 sm:px-6 lg:px-8">
            <Reveal>
              <p className="eyebrow inline-flex items-center gap-2" style={{ color: BRAND_COLORS.orbitalCyan }}>
                <span
                  aria-hidden="true"
                  className="inline-block h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: BRAND_COLORS.orbitalCyan, boxShadow: `0 0 12px ${BRAND_COLORS.orbitalCyan}` }}
                />
                Inside the glass box
              </p>
            </Reveal>
            <Reveal delay={90}>
              <h1
                className="mt-5 max-w-4xl font-display text-balance text-white"
                style={{ fontSize: "clamp(2.75rem, 7.2vw, 5.75rem)", lineHeight: 1.02, letterSpacing: "-0.02em" }}
              >
                See the <span className="gse-editorial" style={{ fontSize: "1.08em" }}>reasoning</span>,{" "}
                <span
                  style={{
                    backgroundImage: `linear-gradient(115deg, ${BRAND_COLORS.orbitalCyan}, ${BRAND_COLORS.softUltraviolet} 48%, ${BRAND_COLORS.ionMagenta})`,
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    color: "transparent",
                  }}
                >
                  not just the number.
                </span>
              </h1>
            </Reveal>
            <Reveal delay={180}>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-300">
                Most products hand you a pick and ask for trust. We show the work
                behind every one: the confidence score, the factors that drove it,
                and how the market has moved — each signal graded and recorded, so
                you can check it instead of just taking it.
              </p>
            </Reveal>
            <Reveal delay={260}>
              <div className="pointer-events-auto mt-9 flex flex-wrap gap-3">
                <Link href="/methodology" className="btn btn-primary">
                  The full methodology →
                </Link>
                <Link href="/picks" className="btn btn-ghost">
                  Today&apos;s board
                </Link>
              </div>
            </Reveal>
          </div>
        </section>

        {/* Engine Architecture — 4-layer horizontal stack diagram */}
        <section className="px-4 py-16 sm:px-6 lg:px-8" aria-labelledby="arch-heading">
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <p className="eyebrow" style={{ color: BRAND_COLORS.orbitalCyan }}>Engine Architecture</p>
            </Reveal>
            <Reveal delay={80}>
              <h2 id="arch-heading" className="mt-3 font-display text-3xl text-white sm:text-4xl">
                Four layers from raw data to auditable signal.
              </h2>
            </Reveal>
            <Reveal delay={160}>
              <p className="mt-4 max-w-2xl text-ink-300">
                Every pick traces a path through four distinct layers — each with its own
                logic, failure mode, and tamper-evident log. Nothing skips a layer.
              </p>
            </Reveal>

            <div className="mt-10 flex flex-col gap-2">
              {ARCH_LAYERS.map((layer, i) => (
                <Reveal key={layer.id} delay={120 + i * 80}>
                  <div
                    id={layer.id}
                    className="group relative overflow-hidden rounded-xl border px-5 py-4 transition-all duration-300 hover:border-opacity-60"
                    style={{ borderColor: `${layer.color}28`, background: `${layer.color}05` }}
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                      {/* Layer label */}
                      <div className="w-44 shrink-0">
                        <p className="font-mono text-[9px] uppercase tracking-[0.2em]" style={{ color: layer.color }}>
                          Layer {String(i + 1).padStart(2, "0")}
                        </p>
                        <p className="mt-0.5 font-mono text-sm font-bold text-white">{layer.name}</p>
                        <p className="mt-1 text-[11px] leading-4 text-ink-500">{layer.desc}</p>
                      </div>

                      {/* Node row */}
                      <div className="flex flex-1 flex-wrap items-center gap-2">
                        {layer.nodes.map((node, ni) => (
                          <div key={node} className="flex items-center gap-2">
                            <span
                              className="rounded-lg border px-3 py-1.5 font-mono text-[11px] leading-tight transition-all duration-200 group-hover:scale-[1.02]"
                              style={{
                                borderColor: `${layer.color}30`,
                                background: `${layer.color}0d`,
                                color: layer.color,
                              }}
                            >
                              {node}
                            </span>
                            {ni < layer.nodes.length - 1 && (
                              <span className="font-mono text-xs" style={{ color: `${layer.color}50` }}>→</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Bottom-gradient connector to next layer */}
                    {i < ARCH_LAYERS.length - 1 && (
                      <div
                        aria-hidden="true"
                        className="absolute bottom-0 left-0 right-0 h-px"
                        style={{ background: `linear-gradient(90deg, transparent, ${layer.color}20, ${ARCH_LAYERS[i + 1]!.color}20, transparent)` }}
                      />
                    )}
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Kinetic ticker — doctrine in motion */}
        <Ticker items={TICKER_PHRASES} durationSec={42} />

        {/* The convergence — the precise companion to the ambient hero */}
        <section className="px-4 py-20 sm:px-6 lg:px-8" aria-labelledby="converge-heading">
          <div className="mx-auto grid max-w-5xl items-center gap-12 lg:grid-cols-2">
            <div>
              <Reveal>
                <p className="eyebrow" style={{ color: BRAND_COLORS.softUltraviolet }}>
                  Many reads, one signal
                </p>
              </Reveal>
              <Reveal delay={90}>
                <h2 id="converge-heading" className="mt-3 font-display text-3xl text-white sm:text-4xl">
                  Edge lives in the disagreement.
                </h2>
              </Reveal>
              <Reveal delay={170}>
                <p className="mt-5 text-ink-300">
                  Independent referees each price the game on their own. When they
                  converge, that&apos;s confidence. When they agree the market is
                  wrong in the same direction — that&apos;s the signal worth
                  surfacing, with the reasoning attached.
                </p>
              </Reveal>
            </div>
            <Reveal direction="scale" delay={140} className="mx-auto w-full max-w-md">
              <div className="surface-card aspect-[5/4] p-6">
                <ConsensusField />
              </div>
            </Reveal>
          </div>
        </section>

        {/* Reasoning chain — auto-advancing "watch it run" walkthrough */}
        <section className="px-4 py-12 sm:px-6 lg:px-8" aria-labelledby="chain-heading">
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <h2 id="chain-heading" className="font-display text-3xl text-white sm:text-4xl">
                From many independent reads to one auditable signal.
              </h2>
            </Reveal>
            <Reveal delay={120}>
              <div className="mt-10">
                <ReasoningShowcase steps={CHAIN} />
              </div>
            </Reveal>
          </div>
        </section>

        {/* Capability Matrix — full stack in one view */}
        <section className="px-4 py-12 sm:px-6 lg:px-8" aria-labelledby="matrix-heading">
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <p className="eyebrow" style={{ color: BRAND_COLORS.orbitalCyan }}>
                Full capability map
              </p>
            </Reveal>
            <Reveal delay={80}>
              <h2 id="matrix-heading" className="mt-3 font-display text-3xl text-white sm:text-4xl">
                Every layer, every component.
              </h2>
            </Reveal>
            <Reveal delay={160}>
              <p className="mt-4 max-w-2xl text-ink-300">
                Data in, intelligence applied, gates enforced, output issued and receipted.
                Status is live — ACCRUING means real history is building, GATED means the
                gate is working, SOON means it&apos;s on the roadmap.
              </p>
            </Reveal>
            <Reveal delay={200}>
              <div className="mt-8">
                <CapabilityMatrix />
              </div>
            </Reveal>
          </div>
        </section>

        {/* The Signal Courtroom — a signal is a case, not a badge */}
        <section className="px-4 py-12 sm:px-6 lg:px-8" aria-labelledby="courtroom-heading">
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <p className="eyebrow" style={{ color: BRAND_COLORS.ionMagenta }}>
                A signal is a case, not a badge
              </p>
            </Reveal>
            <Reveal delay={90}>
              <h2 id="courtroom-heading" className="mt-3 font-display text-3xl text-white sm:text-4xl">
                Every signal is prosecuted before it&apos;s published.
              </h2>
            </Reveal>
            <Reveal delay={160}>
              <p className="mt-5 max-w-2xl text-ink-300">
                No lonely confidence number. The engine argues the case against itself —
                evidence, counter-evidence, and the falsifier that would break it — then
                returns a verdict, including the honest verdict of <em>no-bet</em>.
              </p>
            </Reveal>
            <Reveal delay={140} className="mt-10">
              <SignalCourtroom brief={ILLUSTRATIVE_BRIEF} />
            </Reveal>
          </div>
        </section>

        {/* The Agent War Room — the living council behind the verdict */}
        <section className="px-4 py-12 sm:px-6 lg:px-8" aria-labelledby="warroom-heading">
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <p className="eyebrow" style={{ color: BRAND_COLORS.orbitalCyan }}>
                Not one engine — a council
              </p>
            </Reveal>
            <Reveal delay={90}>
              <h2 id="warroom-heading" className="mt-3 font-display text-3xl text-white sm:text-4xl">
                Watch the verdict change — and see which agent moved it.
              </h2>
            </Reveal>
            <Reveal delay={160}>
              <p className="mt-5 max-w-2xl text-ink-300">
                Behind every read is a council of specialist agents — each with one job and an
                escalation threshold. When the recommendation changes, you can trace exactly
                which agent escalated and why. No opaque black box.
              </p>
            </Reveal>
            <Reveal delay={140} className="mt-10">
              <AgentWarRoom />
            </Reveal>
          </div>
        </section>

        {/* The Decision Autopsy — grade the thinking, not the scoreboard */}
        <section className="px-4 py-12 sm:px-6 lg:px-8" aria-labelledby="autopsy-heading">
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <p className="eyebrow" style={{ color: BRAND_COLORS.softUltraviolet }}>
                After the whistle
              </p>
            </Reveal>
            <Reveal delay={90}>
              <h2 id="autopsy-heading" className="mt-3 font-display text-3xl text-white sm:text-4xl">
                We grade the thinking, not the scoreboard.
              </h2>
            </Reveal>
            <Reveal delay={160}>
              <p className="mt-5 max-w-2xl text-ink-300">
                A win is not proof and a loss is not failure. Every settled signal is
                graded on the square it actually lands in — so a lucky win gets flagged and
                a correct read that lost gets respected.
              </p>
            </Reveal>
            <Reveal delay={140} className="mt-10">
              <DecisionAutopsy />
            </Reveal>
          </div>
        </section>

        {/* Closing band */}
        <section className="px-4 pb-24 pt-12 sm:px-6 lg:px-8">
          <Reveal>
            <div
              className="mx-auto max-w-5xl rounded-2xl p-10 text-center"
              style={{
                border: `1px solid ${BRAND_COLORS.steelGray}`,
                background: `linear-gradient(180deg, ${BRAND_COLORS.steelGray}66, transparent)`,
              }}
            >
              <p className="eyebrow" style={{ color: BRAND_COLORS.orbitalCyan }}>
                Transparency is the product
              </p>
              <p className="mx-auto mt-4 max-w-2xl font-display text-2xl text-white sm:text-3xl">
                {CLOSING_LINE}
              </p>
              <p className="mx-auto mt-4 max-w-xl text-sm text-ink-300">
                Numbers about our track record stay hidden until there&apos;s enough
                settled, calibrated history to publish them honestly. Until then,
                this is the part we can show you in full: the method.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link href="/methodology" className="btn btn-primary">
                  How it works
                </Link>
                <Link href="/responsible-play" className="btn btn-ghost">
                  Play responsibly
                </Link>
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      <Footer />
      {/* Glass Box Cipher — shard 01 hides here; console nudge */}
      <CipherShard page="intelligence" />
      <CipherConsoleMount />
    </div>
  );
}
