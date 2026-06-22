import Link from "next/link";
import type { Metadata } from "next";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { MethodologySection } from "@/components/ui/methodology-section";
import { RiskDisclosure } from "@/components/ui/risk-disclosure";
import { Reveal, Stagger } from "@/components/motion/reveal";
import { InteractiveGalaxyLazy } from "@/components/hero/interactive-galaxy-lazy";
import { CipherShard } from "@/components/cipher/cipher-shard";
import { CipherConsoleMount } from "@/components/cipher/cipher-console-mount";
import { BRAND_COLORS } from "@/lib/brand";
import { PRICE_PILLARS, LIVE_VS_ROADMAP, GSE_SCORE_FORMULA } from "@sports/prediction-engine";

export const metadata: Metadata = {
  title: "Methodology - The GSE PRICE Method",
  description:
    "The GSE PRICE Method — Proof, Read, Integrity, Context, Edge. How Galaxy Sports Edge reads the board, scores the math into one GSE Score, and gates the slate. Open framework; protected weights.",
  alternates: { canonical: "/methodology" },
};

// Plain-English label for each capability's wiring status (sourced from the engine spec).
const ROADMAP_STATUS_LABEL: Record<string, { label: string; tone: string }> = {
  PRICED: { label: "Live · in the score", tone: BRAND_COLORS.orbitalCyan },
  SURFACED_UNPRICED: { label: "Surfaced · not yet priced", tone: BRAND_COLORS.softUltraviolet },
  RND_BLOCKED: { label: "Research · blocked on data", tone: BRAND_COLORS.ionMagenta },
  BUILT_NOT_WIRED: { label: "Built · not yet activated", tone: BRAND_COLORS.softUltraviolet },
  PLANNED: { label: "Planned", tone: BRAND_COLORS.ionMagenta },
};

const FACTORS = [
  "Market consensus",
  "Book depth",
  "Line movement",
  "Volatility",
  "Head-to-head context",
  "Venue form",
  "Schedule stress",
  "Rest differential",
  "Cross-market agreement",
  "Data quality",
] as const;

const STACK = [
  {
    title: "Read the board",
    body: "The engine starts with observable market data: spread, total, moneyline, book count, price freshness, and line movement.",
  },
  {
    title: "Score the math",
    body: "A deterministic factor model scores the market and matchup context. The framework is public; weights, constants, and aggregation formula stay proprietary.",
  },
  {
    title: "Gate the slate",
    body: "Publish thresholds, freshness checks, and data-quality gates decide whether a pick reaches the board. Thin slates can produce zero picks.",
  },
] as const;

const CHANGELOG = [
  ["v5.0", "Bootstrap-canonical gating and settled-only learning policy."],
  ["v4.0", "Expanded factor snapshot storage for public audit trails."],
  ["v3.0", "Added schedule stress, rest, and cross-market checks."],
] as const;

const MARKET_READS = [
  {
    title: "The market's real price",
    body: "Every book's latest two-sided quote, de-vigged and taken to a median across books — the market's opinion with the margin stripped out. What the books actually think, not what they charge.",
    href: "/observatory",
    cta: "See the fair board",
  },
  {
    title: "The best of it",
    body: "The line shop finds the best available price for each side across the books we capture — the same line-shopping edge the pros use, shown as plain transparency. Shop the number; it's your money.",
    href: "/observatory",
    cta: "Open the line shop",
  },
  {
    title: "Did we beat the close?",
    body: "Closing line value grades whether the price we locked beat where the market closed — the sharp-credible leading indicator of a real edge, and the one number tout services never show. Published under the same gate as the win rate.",
    href: "/clv",
    cta: "See our CLV",
  },
] as const;

const ACCENTS = [BRAND_COLORS.orbitalCyan, BRAND_COLORS.softUltraviolet, BRAND_COLORS.ionMagenta];

export default function MethodologyPage(): JSX.Element {
  return (
    <div className="flex min-h-screen w-full flex-col overflow-x-hidden" style={{ backgroundColor: BRAND_COLORS.obsidianBlack }}>
      <Nav />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative isolate overflow-hidden">
          <div aria-hidden="true" className="absolute inset-0 -z-20">
            <InteractiveGalaxyLazy />
          </div>
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10"
            style={{
              background: `linear-gradient(180deg, ${BRAND_COLORS.obsidianBlack}cc 0%, ${BRAND_COLORS.obsidianBlack}40 42%, ${BRAND_COLORS.obsidianBlack}66 72%, ${BRAND_COLORS.obsidianBlack} 100%)`,
            }}
          />
          <div className="mx-auto flex min-h-[70vh] max-w-5xl flex-col justify-center px-4 py-24 sm:px-6 lg:px-8">
            <Reveal>
              <p className="eyebrow" style={{ color: BRAND_COLORS.orbitalCyan }}>
                Published framework
              </p>
            </Reveal>
            <Reveal delay={90}>
              <h1 className="mt-4 max-w-4xl font-display text-display-xl text-balance text-white">
                Deterministic scoring. Open method. Protected weights.
              </h1>
            </Reveal>
            <Reveal delay={180}>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-ink-300">
                Galaxy Sports Edge publishes the factors and decision philosophy behind the model.
                The exact weights, constants, and aggregation formula remain proprietary.
              </p>
            </Reveal>
          </div>
        </section>

        {/* The stack */}
        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <Stagger className="mx-auto grid max-w-6xl gap-5 md:grid-cols-3" step={100}>
            {STACK.map((item, index) => (
              <article key={item.title} className="surface-card p-6">
                <span aria-hidden="true" className="font-display text-2xl tabular-nums" style={{ color: ACCENTS[index] }}>
                  0{index + 1}
                </span>
                <h2 className="mt-3 text-2xl font-bold text-white">{item.title}</h2>
                <p className="mt-3 text-sm leading-6 text-ink-300">{item.body}</p>
              </article>
            ))}
          </Stagger>
        </section>

        {/* The GSE PRICE Method — five named pillars */}
        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <p className="eyebrow" style={{ color: BRAND_COLORS.orbitalCyan }}>
                The GSE PRICE Method
              </p>
              <h2 className="mt-2 font-display text-3xl text-white sm:text-4xl">
                Five pillars, one name: <span style={{ color: BRAND_COLORS.orbitalCyan }}>PRICE</span>.
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-ink-300">
                Read the board, score the math, gate the slate — built on five pillars whose
                initials spell PRICE. Each one is a real part of the engine, not a slogan.
              </p>
            </Reveal>
            <Stagger className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5" step={70}>
              {PRICE_PILLARS.map((pillar, index) => (
                <article key={pillar.letter} className="surface-card flex flex-col p-5">
                  <span
                    aria-hidden="true"
                    className="font-display text-3xl tabular-nums"
                    style={{ color: ACCENTS[index % ACCENTS.length] }}
                  >
                    {pillar.letter}
                  </span>
                  <h3 className="mt-2 text-lg font-semibold text-white">{pillar.name}</h3>
                  <p className="mt-2 flex-1 text-sm leading-6 text-ink-300">{pillar.tagline}</p>
                </article>
              ))}
            </Stagger>
          </div>
        </section>

        {/* The GSE Score — what it is, and what it is not */}
        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <p className="eyebrow" style={{ color: BRAND_COLORS.orbitalCyan }}>
                The GSE Score
              </p>
              <h2 className="mt-2 font-display text-3xl text-white sm:text-4xl">
                One score, derived honestly.
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-ink-300">
                The GSE Score is a single 0–100 number: our confidence read, adjusted only by how
                provably we can stand behind the pick. A fully proven, pre-committed pick keeps its
                full score; an unproven or stale one is discounted to no less than{" "}
                {Math.round(GSE_SCORE_FORMULA.multiplierFloor * 100)}% of it.
              </p>
            </Reveal>
            <Stagger className="mt-8 grid gap-5 md:grid-cols-2" step={100}>
              <article className="surface-card p-6">
                <h3 className="text-lg font-semibold text-white">What it is</h3>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-ink-300">
                  <li>· A ranking signal that blends the read, the edge, the context, and our proof state.</li>
                  <li>· Shown next to its inputs — confidence and the public Edge Index — never alone.</li>
                  <li>· Deterministic and versioned, so the same facts always produce the same score.</li>
                </ul>
              </article>
              <article className="surface-card p-6">
                <h3 className="text-lg font-semibold text-white">What it is not</h3>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-ink-300">
                  <li>· Not a win probability — we only show calibrated probabilities once settled results prove them.</li>
                  <li>· Not a promise. No outcome is ever promised in an uncertain market.</li>
                  <li>· Not a bet instruction. It is information; the decision is yours.</li>
                </ul>
              </article>
            </Stagger>
          </div>
        </section>

        {/* Live now vs. roadmap — sourced from the engine spec */}
        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <p className="eyebrow" style={{ color: BRAND_COLORS.orbitalCyan }}>
                Live now vs. roadmap
              </p>
              <h2 className="mt-2 font-display text-3xl text-white sm:text-4xl">
                What scores today — and what doesn&apos;t yet.
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-ink-300">
                We label every capability. Some signals move the score today; others are built and
                visible but deliberately not yet priced in until the proof clears.
              </p>
            </Reveal>
            <Reveal delay={120}>
              <div className="surface-card mt-8 overflow-hidden p-0">
                {LIVE_VS_ROADMAP.map((row) => {
                  const meta =
                    ROADMAP_STATUS_LABEL[row.status] ??
                    { label: "Planned", tone: BRAND_COLORS.ionMagenta };
                  return (
                    <div
                      key={row.name}
                      className="grid gap-2 px-5 py-4 sm:grid-cols-[1fr_auto]"
                      style={{ borderBottom: `1px solid ${BRAND_COLORS.steelGray}` }}
                    >
                      <div>
                        <p className="text-sm font-semibold text-white">{row.name}</p>
                        <p className="mt-1 text-sm leading-6 text-ink-300">{row.detail}</p>
                      </div>
                      <span
                        className="self-start whitespace-nowrap font-mono text-xs font-semibold sm:text-right"
                        style={{ color: meta.tone }}
                      >
                        {meta.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Reveal>
          </div>
        </section>

        {/* Factor inventory */}
        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                  <p className="eyebrow" style={{ color: BRAND_COLORS.orbitalCyan }}>
                    Factor inventory
                  </p>
                  <h2 className="mt-2 font-display text-3xl text-white sm:text-4xl">What the model can read</h2>
                </div>
                <p className="max-w-sm text-sm text-ink-300 sm:text-right">
                  Factors are visible. Exact scoring weights are not published.
                </p>
              </div>
            </Reveal>
            <Stagger className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5" step={50}>
              {FACTORS.map((factor) => (
                <div key={factor} className="surface-card min-h-20 p-4">
                  <p className="text-sm font-semibold text-white">{factor}</p>
                </div>
              ))}
            </Stagger>
          </div>
        </section>

        <MethodologySection />

        {/* Reading the market — and grading ourselves */}
        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <p className="eyebrow" style={{ color: BRAND_COLORS.orbitalCyan }}>
                Reading the market
              </p>
              <h2 className="mt-2 font-display text-3xl text-white sm:text-4xl">
                What the market thinks — and whether we beat it.
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-ink-300">
                Three reads, all built from odds we actually capture — never a
                projection dressed up as a market.
              </p>
            </Reveal>
            <Stagger className="mt-8 grid gap-5 md:grid-cols-3" step={100}>
              {MARKET_READS.map((m, index) => (
                <article key={m.title} className="surface-card flex flex-col p-6">
                  <span
                    aria-hidden="true"
                    className="block h-1 w-10 rounded-full"
                    style={{ backgroundColor: ACCENTS[index] }}
                  />
                  <h3 className="mt-4 text-lg font-semibold text-white">{m.title}</h3>
                  <p className="mt-2 flex-1 text-sm leading-6 text-ink-300">{m.body}</p>
                  <Link
                    href={m.href}
                    className="mt-4 font-mono text-sm font-semibold"
                    style={{ color: BRAND_COLORS.orbitalCyan }}
                  >
                    {m.cta} →
                  </Link>
                </article>
              ))}
            </Stagger>
          </div>
        </section>

        {/* Changelog */}
        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <p className="eyebrow" style={{ color: BRAND_COLORS.orbitalCyan }}>
                Version changelog
              </p>
              <h2 className="mt-2 font-display text-3xl text-white sm:text-4xl">Model changes are named.</h2>
            </Reveal>
            <Reveal delay={120}>
              <div className="surface-card mt-8 overflow-hidden p-0">
                {CHANGELOG.map(([version, note]) => (
                  <div
                    key={version}
                    className="grid gap-2 px-5 py-4 sm:grid-cols-[120px_1fr]"
                    style={{ borderBottom: `1px solid ${BRAND_COLORS.steelGray}` }}
                  >
                    <span className="font-mono text-sm" style={{ color: BRAND_COLORS.orbitalCyan }}>
                      {version}
                    </span>
                    <span className="text-sm text-ink-300">{note}</span>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        {/* CTA */}
        <section className="px-4 pb-24 pt-8 sm:px-6 lg:px-8">
          <Reveal>
            <div className="mx-auto flex max-w-3xl flex-col items-center gap-5 text-center">
              <h2 className="font-display text-3xl text-white sm:text-4xl">See the framework on today&apos;s board.</h2>
              <p className="text-sm leading-6 text-ink-300">
                The public board shows every published pick and every free Edge Index.
                Pro keeps the detailed factor breakdown.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link href="/board" className="btn btn-primary">
                  Open today&apos;s board
                </Link>
                <Link href="/performance" className="btn btn-ghost">
                  View calibration
                </Link>
              </div>
              <RiskDisclosure variant="compact" className="text-center" />
            </div>
          </Reveal>
        </section>
      </main>
      <Footer />
      {/* Glass Box Cipher — shard 02 hides here; console nudge */}
      <CipherShard page="methodology" />
      <CipherConsoleMount />
    </div>
  );
}
