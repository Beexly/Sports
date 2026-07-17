import Link from "next/link";
import type { Metadata } from "next";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { RiskDisclosure } from "@/components/ui/risk-disclosure";
import { Reveal } from "@/components/motion/reveal";
import { FormulaPlaque } from "@/components/tools/formula-plaque";
import { NoVigCalculatorClient } from "./no-vig-calculator-client";
import { BRAND_COLORS } from "@/lib/brand";

export const metadata: Metadata = {
  title: "No-Vig Calculator: Fair Odds & Hold Percentage",
  description:
    "Free no-vig (de-vig) calculator. Strip a bookmaker's margin out of a two-way or n-way market using the proportional method to see the fair probability on each side and the hold percentage.",
  alternates: { canonical: "/tools/no-vig-calculator" },
};

export default function NoVigCalculatorPage(): JSX.Element {
  return (
    <div className="flex min-h-screen w-full flex-col overflow-x-hidden" style={{ backgroundColor: BRAND_COLORS.obsidianBlack }}>
      <Nav />
      <main id="main-content" className="flex-1">
        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <Reveal>
              <p className="eyebrow" style={{ color: BRAND_COLORS.orbitalCyan }}>
                <Link href="/tools" className="hover:underline">
                  Free calculators
                </Link>{" "}
                / No-vig
              </p>
            </Reveal>
            <Reveal delay={80}>
              <h1 className="mt-4 font-display text-display-lg text-balance text-white">No-vig calculator</h1>
            </Reveal>
            <Reveal delay={150}>
              <p className="mt-4 max-w-2xl text-base leading-7 text-ink-300">
                A bookmaker's quoted prices always add up to more than 100%
                implied probability — that extra margin is the vig. This
                strips it back out, proportionally, to estimate the market's
                fair probability on each side.
              </p>
            </Reveal>
          </div>
        </section>

        <section className="px-4 pb-8 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <Reveal>
              <NoVigCalculatorClient />
            </Reveal>
          </div>
        </section>

        <section className="px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <Reveal>
              <h2 className="font-display text-2xl text-white sm:text-3xl">How it&apos;s computed</h2>
              <p className="mt-3 text-sm leading-6 text-ink-300">
                Each price implies a raw probability (1 / decimal odds).
                Summed across every outcome, that total is the market&apos;s
                "overround." The proportional method divides every raw
                implied probability by that overround, so the fair
                probabilities sum to exactly 100%:
              </p>
              <FormulaPlaque
                className="mt-4"
                label="Proportional de-vig"
                formula={"implied_i = 1 / odds_i\nfair_i = implied_i / Σ(implied_j)"}
              />
              <p className="mt-4 text-sm leading-6 text-ink-300">
                This is the same proportional convention the pick engine
                itself uses as its house default for de-vigging a market —
                see{" "}
                <Link href="/methodology" className="underline">
                  the methodology page
                </Link>
                . It is deliberately the simpler of two documented methods:
                Shin&apos;s model is the other, and it corrects a bias
                proportional de-vig leaves on longshots. This calculator only
                runs the proportional version, so it stays fully
                explainable in one formula.
              </p>
            </Reveal>
          </div>
        </section>

        <section className="px-4 pb-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <Reveal>
              <div className="flex flex-wrap gap-3">
                <Link href="/tools/ev-calculator" className="btn btn-ghost">
                  EV calculator
                </Link>
                <Link href="/tools/odds-converter" className="btn btn-ghost">
                  Odds converter
                </Link>
                <Link href="/tools/parlay-calculator" className="btn btn-ghost">
                  Parlay calculator
                </Link>
              </div>
              <RiskDisclosure variant="compact" className="mt-8" />
            </Reveal>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
