import Link from "next/link";
import type { Metadata } from "next";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { RiskDisclosure } from "@/components/ui/risk-disclosure";
import { Reveal } from "@/components/motion/reveal";
import { FormulaPlaque } from "@/components/tools/formula-plaque";
import { HonestyNote } from "@/components/tools/honesty-note";
import { LineMovementClient } from "./line-movement-client";

export const metadata: Metadata = {
  title: "Line Movement Calculator: Open vs Close",
  description:
    "Free line-movement calculator. Enter open and current American odds to see implied-probability shift. Pure arithmetic — no sharp/public claims, no Galaxy performance numbers.",
  alternates: { canonical: "/tools/line-movement" },
};

export default function LineMovementPage(): JSX.Element {
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
                / Line movement
              </p>
            </Reveal>
            <Reveal delay={80}>
              <h1 className="mt-4 font-display text-display-lg text-balance tracking-tight text-ion-white">
                Line movement
              </h1>
            </Reveal>
            <Reveal delay={150}>
              <p className="mt-4 max-w-2xl text-base leading-7 text-ion-1">
                Compare an open price to a current or closing price. The tool
                only does the arithmetic on the numbers you supply — it does not
                fetch books or claim anyone is sharp.
              </p>
            </Reveal>
          </div>
        </section>
        <section className="px-4 pb-8 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <Reveal>
              <LineMovementClient />
            </Reveal>
            <Reveal delay={80}>
              <HonestyNote className="mt-4">
                This is generic market math. It is not a Galaxy Sports Edge
                track record, not a sharp/public split, and not a betting tip.
              </HonestyNote>
            </Reveal>
          </div>
        </section>
        <section className="px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <FormulaPlaque
              label="Moneyline move"
              formula={"impl = 1 / decimal(odds)\nΔimpl = impl(close) − impl(open)"}
            />
          </div>
        </section>
      </main>
      <RiskDisclosure />
      <Footer />
    </div>
  );
}
