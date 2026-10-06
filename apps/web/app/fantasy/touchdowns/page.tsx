import type { Metadata } from "next";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { Reveal } from "@/components/motion/reveal";
import { Atmosphere } from "@/components/ui/atmosphere";
import { TdBoard } from "@/components/fantasy/td-board";

export const metadata: Metadata = {
  title: "Anytime TD Board: Glass-Box Touchdown Probabilities",
  description:
    "Anytime touchdown probabilities from a published four-factor composite — season TD rate, red-zone volume, goal-line volume, and implied team total — with the weights, the logistic, and every missing input stated in the open. Illustrative pool, educational use; no outcome is promised.",
  alternates: { canonical: "/fantasy/touchdowns" },
};

export default function TouchdownsPage(): JSX.Element {
  return (
    <div className="flex min-h-screen flex-col bg-obsidian">
      <Atmosphere />
      <Nav />
      <main id="main-content" className="flex-1">
        <section className="relative isolate overflow-hidden px-4 pb-8 pt-24 sm:px-6 lg:px-8">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-80"
            style={{ background: "radial-gradient(55% 80% at 50% 0%, rgba(255,138,76,0.10), transparent 70%)" }}
          />
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <p className="eyebrow inline-flex items-center gap-2 text-ion-1">
                <span className="live-dot" /> Touchdown intelligence
              </p>
            </Reveal>
            <Reveal delay={90}>
              <h1
                className="mt-5 max-w-3xl font-display text-balance text-ion-white"
                style={{ fontSize: "clamp(2.4rem, 7vw, 5rem)", lineHeight: 0.98, letterSpacing: "-0.02em" }}
              >
                Who finds the{" "}
                <span className="gse-editorial" style={{ fontSize: "1.08em" }}>
                  end zone.
                </span>
              </h1>
            </Reveal>
            <Reveal delay={160}>
              <p className="mt-5 max-w-2xl text-lg text-ion-1">
                Anytime-touchdown probability from four public factors, weighted in the open and
                pushed through a stated logistic. Hand the board to a skeptic and they can
                recompute every number without trusting us.
              </p>
            </Reveal>
            <Reveal delay={220}>
              <p className="mt-5 max-w-2xl rounded-xl border border-mineral bg-eclipse/40 p-4 text-sm text-ion-1">
                <span className="font-semibold text-ion-white">What we will not do:</span> show you
                a hit rate we have not earned on our own data, or print an &ldquo;edge&rdquo;
                against a market price we do not have a license to read. Where the board is
                unpriceable it says so.
              </p>
            </Reveal>
          </div>
        </section>
        <section className="px-4 pb-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl space-y-8">
            <Reveal>
              <TdBoard />
            </Reveal>
            <Reveal delay={120}>
              <p className="mt-8 text-xs leading-relaxed text-ion-2">
                Educational modelling on an illustrative player pool — the names are fictional, so
                no probability is ever pinned to a real person. Past results do not predict future
                results, and nothing here is a promise an outcome. Building the proof layer? See
                the public{" "}
                <a href="/clv" className="font-semibold text-orbital-cyan hover:text-ion-white">
                  CLV report
                </a>{" "}
                and the{" "}
                <a href="/performance" className="font-semibold text-orbital-cyan hover:text-ion-white">
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
