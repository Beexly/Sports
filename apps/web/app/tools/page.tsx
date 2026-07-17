import Link from "next/link";
import type { Metadata } from "next";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { RiskDisclosure } from "@/components/ui/risk-disclosure";
import { Reveal, Stagger } from "@/components/motion/reveal";
import { FormulaPlaque } from "@/components/tools/formula-plaque";
import { BRAND_COLORS } from "@/lib/brand";

/**
 * /tools — the free public calculators hub.
 *
 * Rules for this surface (do not relax without a founder ruling):
 *   - Every calculator is free, with no paywall, account, or email gate.
 *   - Every result renders its formula in plain math notation next to it —
 *     "the math you can read," made literal, not just a brand line.
 *   - Zero performance claims, zero banned vocabulary (guaranteed/lock/
 *     risk-free/etc — the trust-gate guardrail enforces this), zero
 *     affiliate links, and nothing implying our own picks' results. These
 *     are generic tools any bettor could reproduce with a calculator.
 */

export const metadata: Metadata = {
  title: "Free Betting Calculators: EV, No-Vig, Odds, Parlay",
  description:
    "Free, formula-transparent betting calculators: expected value, no-vig fair odds, American/decimal converter, and parlay math. No account, no paywall, no affiliate links — every result shows its formula.",
  alternates: { canonical: "/tools" },
};

const CALCULATORS = [
  {
    title: "EV Calculator",
    href: "/tools/ev-calculator",
    body: "Enter your own win-probability estimate and a price. See the expected value per dollar staked, and exactly where the breakeven probability sits.",
    formula: "EV = p × decimal − 1",
    accent: BRAND_COLORS.orbitalCyan,
  },
  {
    title: "No-Vig Calculator",
    href: "/tools/no-vig-calculator",
    body: "Strip the bookmaker's margin out of a two-way (or n-way) market and see the fair, no-vig probability on each side, plus the hold percentage.",
    formula: "fair_i = (1/odds_i) / Σ(1/odds_j)",
    accent: BRAND_COLORS.softUltraviolet,
  },
  {
    title: "Odds Converter",
    href: "/tools/odds-converter",
    body: "American, decimal, and implied probability, all from one input. Type a price in either format and see all three update together.",
    formula: "decimal = 1 + A/100  (A > 0)",
    accent: BRAND_COLORS.ionMagenta,
  },
  {
    title: "Parlay Calculator",
    href: "/tools/parlay-calculator",
    body: "Combine two or more legs into a parlay's total decimal price, American price, and implied probability, assuming independent legs.",
    formula: "combined = odds₁ × odds₂ × ... × oddsₙ",
    accent: BRAND_COLORS.orbitalCyan,
  },
] as const;

const PRINCIPLES = [
  {
    title: "Free, not affiliate bait",
    body: "No email wall, no account, no download. A lot of odds converters exist to funnel you toward a sportsbook signup link; these don't carry any partner links at all.",
  },
  {
    title: "The formula is always visible",
    body: "Every result sits next to the exact formula that produced it, in plain math notation. Nothing is a black box, and nothing here claims to predict an outcome.",
  },
  {
    title: "Judgment calls are named, not hidden",
    body: "Where more than one honest convention exists — the no-vig method, how a parlay's legs are assumed to combine — the page says so in a one-line note next to the result.",
  },
] as const;

export default function ToolsHubPage(): JSX.Element {
  return (
    <div className="flex min-h-screen w-full flex-col overflow-x-hidden" style={{ backgroundColor: BRAND_COLORS.obsidianBlack }}>
      <Nav />
      <main id="main-content" className="flex-1">
        {/* Hero */}
        <section className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <Reveal>
              <p className="eyebrow" style={{ color: BRAND_COLORS.orbitalCyan }}>
                Free calculators
              </p>
            </Reveal>
            <Reveal delay={90}>
              <h1 className="mt-4 font-display text-display-xl text-balance text-white">
                Math you can read, not math you have to trust.
              </h1>
            </Reveal>
            <Reveal delay={180}>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-ink-300">
                Four small, free tools for the math behind a bet: expected
                value, no-vig fair odds, odds conversion, and parlay
                combining. No account, no email, no affiliate link — every
                result shows the formula that produced it.
              </p>
            </Reveal>
          </div>
        </section>

        {/* Calculator grid */}
        <section className="px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <Stagger className="grid gap-5 md:grid-cols-2" step={100}>
              {CALCULATORS.map((tool) => (
                <Link key={tool.href} href={tool.href} className="surface-card block p-6 transition-colors hover:border-orbital-cyan/60">
                  <span aria-hidden="true" className="block h-1 w-10 rounded-full" style={{ backgroundColor: tool.accent }} />
                  <h2 className="mt-4 text-xl font-semibold text-white">{tool.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-ink-300">{tool.body}</p>
                  <FormulaPlaque formula={tool.formula} className="mt-4" />
                  <span className="mt-4 inline-block font-mono text-sm font-semibold" style={{ color: tool.accent }}>
                    Open the calculator →
                  </span>
                </Link>
              ))}
            </Stagger>
          </div>
        </section>

        {/* Principles */}
        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <p className="eyebrow" style={{ color: BRAND_COLORS.softUltraviolet }}>
                Why these are free
              </p>
              <h2 className="mt-2 font-display text-3xl text-white sm:text-4xl">Same posture as the rest of the site.</h2>
            </Reveal>
            <Stagger className="mt-8 grid gap-5 md:grid-cols-3" step={100}>
              {PRINCIPLES.map((item, index) => (
                <article key={item.title} className="surface-card p-6">
                  <span aria-hidden="true" className="font-display text-2xl tabular-nums" style={{ color: [BRAND_COLORS.orbitalCyan, BRAND_COLORS.softUltraviolet, BRAND_COLORS.ionMagenta][index] }}>
                    0{index + 1}
                  </span>
                  <h3 className="mt-3 text-lg font-semibold text-white">{item.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-ink-300">{item.body}</p>
                </article>
              ))}
            </Stagger>
          </div>
        </section>

        {/* CTA */}
        <section className="px-4 pb-24 pt-8 sm:px-6 lg:px-8">
          <Reveal>
            <div className="mx-auto flex max-w-3xl flex-col items-center gap-5 text-center">
              <h2 className="font-display text-3xl text-white sm:text-4xl">Want to see the model these formulas feed?</h2>
              <p className="text-sm leading-6 text-ink-300">
                These calculators are generic — the same math anyone can run
                by hand. Our methodology page explains how the pick engine
                itself reads the board.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link href="/methodology" className="btn btn-primary">
                  Read the methodology
                </Link>
                <Link href="/board" className="btn btn-ghost">
                  Today&apos;s board
                </Link>
              </div>
              <RiskDisclosure variant="compact" className="text-center" />
            </div>
          </Reveal>
        </section>
      </main>
      <Footer />
    </div>
  );
}
