import Link from "next/link";
import type { Metadata } from "next";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { RiskDisclosure } from "@/components/ui/risk-disclosure";
import { Reveal } from "@/components/motion/reveal";
import { FormulaPlaque } from "@/components/tools/formula-plaque";
import { HonestyNote } from "@/components/tools/honesty-note";
import { ClvCalculatorClient } from "./clv-calculator-client";

export const metadata: Metadata = {
  title: "CLV Calculator: Closing Line Value in Basis Points",
  description:
    "Free CLV calculator. Enter your decision price and the close to see closing-line value in basis points. Your numbers only — not a Galaxy Sports Edge track record.",
  alternates: { canonical: "/tools/clv-calculator" },
};

export default function ClvCalculatorPage(): JSX.Element {
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
                / CLV
              </p>
            </Reveal>
            <Reveal delay={80}>
              <h1 className="mt-4 font-display text-display-lg text-balance tracking-tight text-ion-white">
                CLV calculator
              </h1>
            </Reveal>
            <Reveal delay={150}>
              <p className="mt-4 max-w-2xl text-base leading-7 text-ion-1">
                Closing-line value measures price quality vs the close. This tool
                only converts the two prices you enter into basis points — it
                does not load Galaxy picks or publish a track record.
              </p>
            </Reveal>
          </div>
        </section>
        <section className="px-4 pb-8 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <Reveal>
              <ClvCalculatorClient />
            </Reveal>
            <Reveal delay={80}>
              <HonestyNote className="mt-4">
                CLV is not win rate. Positive CLV means better price than the
                close; it does not prove long-run profit. Galaxy performance
                pages stay gated while calibration eligibility is RED.
              </HonestyNote>
            </Reveal>
          </div>
        </section>
        <section className="px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <FormulaPlaque
              label="CLV (bps)"
              formula={"CLV bps = 10000 × (1/closeDecimal − 1/decisionDecimal)"}
            />
          </div>
        </section>
      </main>
      <RiskDisclosure />
      <Footer />
    </div>
  );
}
