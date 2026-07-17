import Link from "next/link";
import type { Metadata } from "next";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { RiskDisclosure } from "@/components/ui/risk-disclosure";
import { Reveal } from "@/components/motion/reveal";
import { FormulaPlaque } from "@/components/tools/formula-plaque";
import { OddsConverterClient } from "./odds-converter-client";
import { BRAND_COLORS } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Odds Converter: American, Decimal & Implied Probability",
  description:
    "Free odds converter. Type a price in American or decimal notation and see American, decimal, and implied probability together, with the conversion formulas shown.",
  alternates: { canonical: "/tools/odds-converter" },
};

export default function OddsConverterPage(): JSX.Element {
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
                / Odds converter
              </p>
            </Reveal>
            <Reveal delay={80}>
              <h1 className="mt-4 font-display text-display-lg text-balance text-white">Odds converter</h1>
            </Reveal>
            <Reveal delay={150}>
              <p className="mt-4 max-w-2xl text-base leading-7 text-ink-300">
                American and decimal odds describe the same price two
                different ways. Type a value in either notation and see both
                forms plus the implied win probability, all at once.
              </p>
            </Reveal>
          </div>
        </section>

        <section className="px-4 pb-8 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <Reveal>
              <OddsConverterClient />
            </Reveal>
          </div>
        </section>

        <section className="px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <Reveal>
              <h2 className="font-display text-2xl text-white sm:text-3xl">The three formulas</h2>
              <FormulaPlaque
                className="mt-4"
                label="American -> decimal"
                formula={"decimal = 1 + A/100     (A ≥ +100)\ndecimal = 1 + 100/|A|   (A ≤ −100)"}
              />
              <FormulaPlaque
                className="mt-4"
                label="Decimal -> American"
                formula={"A = (decimal − 1) × 100   (decimal ≥ 2.0)\nA = −100 / (decimal − 1)  (decimal < 2.0)"}
              />
              <FormulaPlaque className="mt-4" label="Decimal -> implied probability" formula={"implied probability = 1 / decimal"} />
              <p className="mt-4 text-sm leading-6 text-ink-300">
                +100 and −100 both describe the same fair coin-flip price
                (decimal 2.0) quoted from either side; converting decimal 2.0
                back to American always returns +100, the standard
                convention.
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
                <Link href="/tools/no-vig-calculator" className="btn btn-ghost">
                  No-vig calculator
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
