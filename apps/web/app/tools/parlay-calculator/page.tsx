import Link from "next/link";
import type { Metadata } from "next";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { RiskDisclosure } from "@/components/ui/risk-disclosure";
import { Reveal } from "@/components/motion/reveal";
import { FormulaPlaque } from "@/components/tools/formula-plaque";
import { HonestyNote } from "@/components/tools/honesty-note";
import { ParlayCalculatorClient } from "./parlay-calculator-client";
import { PARLAY_CORRELATION_CAVEAT } from "@/lib/tools/betting-math";

export const metadata: Metadata = {
  title: "Parlay Calculator: Combined Odds & Implied Probability",
  description:
    "Free parlay calculator. Combine two or more legs into a total decimal price, American price, and implied probability, assuming independent legs, with the honest correlation caveat shown.",
  alternates: { canonical: "/tools/parlay-calculator" },
};

export default function ParlayCalculatorPage(): JSX.Element {
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
                / Parlay
              </p>
            </Reveal>
            <Reveal delay={80}>
              <h1 className="mt-4 font-display text-display-lg text-balance tracking-tight text-ion-white">Parlay calculator</h1>
            </Reveal>
            <Reveal delay={150}>
              <p className="mt-4 max-w-2xl text-base leading-7 text-ion-1">
                Combine two or more legs into a single parlay price. This
                assumes independent legs — read the honest note below before
                you use it on a same-game parlay.
              </p>
            </Reveal>
          </div>
        </section>

        <section className="px-4 pb-8 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <Reveal>
              <ParlayCalculatorClient />
            </Reveal>
          </div>
        </section>

        <section className="px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <Reveal>
              <h2 className="font-display text-2xl tracking-tight text-ion-white sm:text-3xl">How it&apos;s computed</h2>
              <p className="mt-3 text-sm leading-6 text-ion-1">
                Under an independence assumption, a parlay&apos;s combined
                decimal price is simply the product of each leg&apos;s own
                decimal price:
              </p>
              <FormulaPlaque
                className="mt-4"
                label="Combined price"
                formula={"combined = odds₁ × odds₂ × ... × oddsₙ\nimplied probability = 1 / combined"}
              />
              <HonestyNote className="mt-4">{PARLAY_CORRELATION_CAVEAT}</HonestyNote>
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
                <Link href="/tools/no-vig-calculator" className="btn btn-ghost">
                  No-vig calculator
                </Link>
                <Link href="/tools/odds-converter" className="btn btn-ghost">
                  Odds converter
                </Link>
                <Link href="/parlay-mri" className="btn btn-ghost">
                  Parlay MRI (Pro)
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
