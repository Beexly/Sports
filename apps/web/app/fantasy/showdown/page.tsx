import type { Metadata } from "next";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { Reveal } from "@/components/motion/reveal";
import { Atmosphere } from "@/components/ui/atmosphere";
import { ShowdownLab } from "@/components/fantasy/showdown-lab";

export const metadata: Metadata = {
  title: "Showdown Room: Single-Game Lineups, Solved Exactly",
  description:
    "DraftKings Showdown solved on its own terms: one captain at 1.5x points and salary, five flex slots, and both teams represented. Every lineup is checked against the cap and shown with the exact combinations we searched. Illustrative slate — the math is real, the players are fictional.",
  alternates: { canonical: "/fantasy/showdown" },
};

export default function ShowdownPage(): JSX.Element {
  return (
    <div className="flex min-h-screen flex-col bg-obsidian">
      <Atmosphere />
      <Nav />
      <main id="main-content" className="flex-1">
        <section className="relative isolate overflow-hidden px-4 pb-8 pt-24 sm:px-6 lg:px-8">
          <div
            aria-hidden={true}
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-80"
            style={{
              background:
                "radial-gradient(55% 80% at 50% 0%, rgba(168,85,247,0.12), transparent 70%)",
            }}
          />
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <p className="eyebrow inline-flex items-center gap-2 text-ion-1">
                <span className="live-dot" /> Single game
              </p>
            </Reveal>
            <Reveal delay={90}>
              <h1
                className="mt-5 max-w-3xl font-display text-balance text-ion-white"
                style={{
                  fontSize: "clamp(2.4rem, 7vw, 5rem)",
                  lineHeight: 0.98,
                  letterSpacing: "-0.02em",
                }}
              >
                One game. Six slots.{" "}
                <span className="gse-editorial" style={{ fontSize: "1.08em" }}>
                  No coin flips.
                </span>
              </h1>
            </Reveal>
            <Reveal delay={160}>
              <p className="mt-5 max-w-2xl text-lg text-ion-1">
                Showdown is a different puzzle from a full slate: the captain doubles
                your points and your salary at the same time, and the roster has to span
                both teams. We solve it exactly over the pool we searched, then show you
                how many combinations that took.
              </p>
            </Reveal>
            <Reveal delay={220}>
              <p className="mt-5 max-w-2xl rounded-xl border border-mineral bg-eclipse/40 p-4 text-sm text-ion-1">
                <span className="font-semibold text-ion-white">Illustrative slate.</span>{" "}
                The players are fictional and the salaries are a demonstration. The
                solver, the cap check, the captain multiplier and the search count are
                the real implementation. Nothing here is a promise of a result.
              </p>
            </Reveal>
          </div>
        </section>

        <section className="px-4 pb-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <ShowdownLab />
            </Reveal>
            <Reveal delay={120}>
              <p className="mt-8 text-xs leading-relaxed text-ion-2">
                Showdown is a contest format, not a projection product: nothing on this
                page forecasts an outcome, and past results never predict future results.
                For the full-slate engine see the{" "}
                <a
                  href="/fantasy/dfs"
                  className="font-semibold text-orbital-cyan hover:text-ion-white"
                >
                  DFS tournament lab
                </a>
                , and for how we grade ourselves see the{" "}
                <a
                  href="/performance"
                  className="font-semibold text-orbital-cyan hover:text-ion-white"
                >
                  calibration report
                </a>
                .
              </p>
            </Reveal>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}