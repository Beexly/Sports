import Link from "next/link";
import type { Metadata } from "next";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { RiskDisclosure } from "@/components/ui/risk-disclosure";
import { Reveal } from "@/components/motion/reveal";
import { FormulaPlaque } from "@/components/tools/formula-plaque";
import { HonestyNote } from "@/components/tools/honesty-note";
import { EvCalculatorClient } from "./ev-calculator-client";

export const metadata: Metadata = {
  title: "EV Calculator: Expected Value Per Dollar Staked",
  description:
    "Free expected-value calculator. Enter your own win-probability estimate and a price (American or decimal) to see EV per dollar staked and the price's breakeven probability, with the formula shown.",
  alternates: { canonical: "/tools/ev-calculator" },
};

export default function EvCalculatorPage(): JSX.Element {
  return (
    <div className="flex min-h-screen w-full flex-col overflow-x-hidden bg-obsidian">
      <Nav />
      <main id="main-content" className="flex-1">
        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <Reveal>
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-orbital-cyan">
                <Link href="/tools" className="hover:underline">
                  Free calculators
                </Link>{" "}
                / EV
              </p>
            </Reveal>
            <Reveal delay={80}>
              <h1 className="mt-4 font-display text-display-lg text-balance tracking-tight text-ion-white">EV calculator</h1>
            </Reveal>
            <Reveal delay={150}>
              <p className="mt-4 max-w-2xl text-base leading-7 text-ion-1">
                Expected value tells you what a bet is worth on average, per
                dollar staked, given your own estimate of the true win
                probability. Enter a probability and a price — the tool does
                no probability estimation of its own; that part is on you.
              </p>
            </Reveal>
          </div>
        </section>

        <section className="px-4 pb-8 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <Reveal>
              <EvCalculatorClient />
            </Reveal>
            <Reveal delay={80}>
              <HonestyNote className="mt-4">
                EV is only as good as the probability you put in. This tool does
                not estimate that probability for you and does not claim to
                predict any outcome — it just does the arithmetic once you supply
                a number.
              </HonestyNote>
            </Reveal>
          </div>
        </section>

        <section className="px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <Reveal>
              <h2 className="font-display text-2xl tracking-tight text-ion-white sm:text-3xl">How it&apos;s computed</h2>
              <p className="mt-3 text-sm leading-6 text-ion-1">
                Stake $1 at decimal price <em>d</em>. Win and you receive{" "}
                <em>d</em> back (profit <em>d</em> − 1); lose and you&apos;re
                down the $1 stake. Weighting each outcome by your probability{" "}
                <em>p</em> gives the expected value:
              </p>
              <FormulaPlaque
                className="mt-4"
                label="Derivation"
                formula={"EV = p·(d − 1) + (1 − p)·(−1)\n   = p·d − 1"}
              />
              <p className="mt-4 text-sm leading-6 text-ion-1">
                EV is exactly zero when your probability equals the price&apos;s
                own implied probability (1/<em>d</em>) — that&apos;s the
                breakeven point the calculator shows next to the result.
              </p>
            </Reveal>
          </div>
        </section>

        <section className="px-4 pb-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <Reveal>
              <div className="flex flex-wrap gap-3">
                <Link href="/tools/no-vig-calculator" className="btn btn-ghost">
                  No-vig calculator
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
