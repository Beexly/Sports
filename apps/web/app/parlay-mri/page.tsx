import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { Reveal } from "@/components/motion/reveal";
import { Atmosphere } from "@/components/ui/atmosphere";
import { ParlayGenome } from "@/components/parlay/parlay-genome";
import { BRAND_COLORS } from "@/lib/brand";
import { getViewerEntitlements } from "@/lib/pricing/tier-access";
import { TierGatePanel } from "@/components/pricing/tier-gate-panel";

export const metadata: Metadata = {
  title: "Parlay MRI — The Portfolio Surgeon",
  description:
    "See a parlay's genome: per-leg risk, survivability, expected value, the compounded house edge, and hidden same-game correlation. Toggle legs and watch the math move. Risk made legible.",
  alternates: { canonical: "/parlay-mri" },
};

export default async function ParlayMriPage() {
  const viewer = await getViewerEntitlements();
  if (!viewer.canUseParlayMri) {
    return (
      <div className="flex min-h-screen flex-col" style={{ backgroundColor: BRAND_COLORS.obsidianBlack }}>
        <Atmosphere />
        <Nav />
        <main className="flex flex-1 flex-col items-center justify-center gap-10 px-4 py-28 sm:px-6">
          <div className="text-center">
            <p className="eyebrow justify-center" style={{ color: BRAND_COLORS.ionMagenta }}>
              Parlay MRI
            </p>
            <h1 className="mt-4 max-w-3xl font-display text-balance text-white" style={{ fontSize: "clamp(2.2rem, 6vw, 4rem)", lineHeight: 1 }}>
              Stacked risk, made <span className="gse-editorial" style={{ fontSize: "1.08em" }}>visible</span>.
            </h1>
          </div>
          <TierGatePanel
            need="PRO"
            surface="The Parlay MRI"
            blurb="Per-leg survivability, compounded house edge, hidden same-game correlation — the full genome of any parlay, with legs you can toggle live. This is the portfolio surgeon, and it operates for Pro members."
          />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: BRAND_COLORS.obsidianBlack }}>
      <Atmosphere />
      <Nav />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative isolate overflow-hidden px-4 pb-8 pt-24 sm:px-6 lg:px-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-96"
            style={{
              background: `radial-gradient(60% 80% at 50% 0%, ${BRAND_COLORS.ionMagenta}1a, transparent 70%), radial-gradient(40% 60% at 72% 8%, ${BRAND_COLORS.softUltraviolet}14, transparent 70%)`,
            }}
          />
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <p className="eyebrow inline-flex items-center gap-2" style={{ color: BRAND_COLORS.ionMagenta }}>
                <span className="live-dot" />
                Risk, made legible
              </p>
            </Reveal>
            <Reveal delay={90}>
              <h1
                className="mt-5 font-display text-balance text-white"
                style={{ fontSize: "clamp(2.5rem, 7vw, 5rem)", lineHeight: 1.0, letterSpacing: "-0.02em" }}
              >
                Parlay{" "}
                <span className="gse-editorial" style={{ fontSize: "1.1em", color: BRAND_COLORS.softUltraviolet }}>
                  MRI
                </span>
              </h1>
            </Reveal>
            <Reveal delay={170}>
              <p className="mt-5 max-w-2xl text-lg text-ink-300">
                Most apps sell you the payout. We show you the genome. Every leg carries risk;
                the ticket as a whole has vitals you can read — survivability, expected value,
                the house edge compounding across legs, and the same-game correlation the book
                already priced. Operate on it and watch the math move.
              </p>
            </Reveal>
          </div>
        </section>

        {/* The tool */}
        <section className="px-4 pb-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <div className="surface-card p-5 sm:p-7">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <h2 className="font-display text-2xl text-white">The Portfolio Surgeon</h2>
                  <span
                    className="rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-ink-300"
                    style={{ borderColor: BRAND_COLORS.steelGray }}
                  >
                    Illustrative legs · transparent math
                  </span>
                </div>
                <ParlayGenome />
              </div>
            </Reveal>
          </div>
        </section>

        {/* Doctrine / responsible-play note */}
        <section className="px-4 pb-24 pt-4 sm:px-6 lg:px-8">
          <Reveal>
            <div
              className="mx-auto max-w-3xl rounded-2xl p-8 text-center"
              style={{ border: `1px solid ${BRAND_COLORS.steelGray}`, background: `linear-gradient(180deg, ${BRAND_COLORS.steelGray}55, transparent)` }}
            >
              <p className="eyebrow" style={{ color: BRAND_COLORS.orbitalCyan }}>
                Why we built this
              </p>
              <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-ink-300">
                The whole industry hypes the longshot ticket. We&apos;d rather make its fragility
                legible. This tool runs on illustrative legs and transparent math you can check —
                its job is to teach how parlay structure changes the odds, so the smartest move is
                often the one you don&apos;t make.
              </p>
              <div className="mt-7 flex flex-wrap justify-center gap-3">
                <Link href="/responsible-play" className="btn btn-primary">
                  Play responsibly
                </Link>
                <Link href="/intelligence" className="btn btn-ghost">
                  Inside the engine
                </Link>
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      <Footer />
    </div>
  );
}
