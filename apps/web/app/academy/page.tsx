import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { Reveal } from "@/components/motion/reveal";
import { Atmosphere } from "@/components/ui/atmosphere";
import { AcademySimulator } from "@/components/academy/academy-simulator";
import { BRAND_COLORS } from "@/lib/brand";

export const metadata: Metadata = {
  title: "The Academy — Train on Process, Not Luck",
  description:
    "Decide on historical-style slates blind to the outcome, then get graded on the quality of the decision — restraint included. Earn rank by calibration, not hot streaks.",
  alternates: { canonical: "/academy" },
};

const STEPS = [
  { n: "01", t: "Read the state", b: "The lines, the injury report, public pressure, the model view, and the counter-evidence — exactly what was knowable at lock." },
  { n: "02", t: "Decide blind", b: "Play, Watchlist, or No-Bet — before the result can contaminate the read. That's the whole skill." },
  { n: "03", t: "Graded on process", b: "The disciplined verdict and the outcome are revealed, and your decision is scored — a lucky win is flagged, a correct read that lost is respected." },
];

export default function AcademyPage() {
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
            style={{ background: `radial-gradient(60% 80% at 50% 0%, ${BRAND_COLORS.softUltraviolet}18, transparent 70%), radial-gradient(40% 60% at 72% 8%, ${BRAND_COLORS.orbitalCyan}12, transparent 70%)` }}
          />
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <p className="eyebrow inline-flex items-center gap-2" style={{ color: BRAND_COLORS.orbitalCyan }}>
                <span className="live-dot" />
                The Academy
              </p>
            </Reveal>
            <Reveal delay={90}>
              <h1
                className="mt-5 font-display text-balance text-white"
                style={{ fontSize: "clamp(2.5rem, 7vw, 5rem)", lineHeight: 1.0, letterSpacing: "-0.02em" }}
              >
                Train on the <span className="gse-editorial" style={{ fontSize: "1.08em" }}>process</span>, not the luck.
              </h1>
            </Reveal>
            <Reveal delay={170}>
              <p className="mt-5 max-w-2xl text-lg text-ink-300">
                Read a historical-style slate exactly as it looked at lock, decide before you can
                see the result, then get graded on the quality of the decision. Restraint counts.
                Lucky wins don&apos;t. You earn rank by calibration — not hot streaks.
              </p>
            </Reveal>
          </div>
        </section>

        {/* How it works */}
        <section className="px-4 py-8 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-3">
            {STEPS.map((s) => (
              <Reveal key={s.n} delay={80}>
                <div className="surface-card h-full p-5">
                  <span className="font-display text-2xl tabular-nums" style={{ color: BRAND_COLORS.softUltraviolet }}>{s.n}</span>
                  <h2 className="mt-2 text-base font-semibold text-white">{s.t}</h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-300">{s.b}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* The simulator */}
        <section className="px-4 pb-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <Reveal>
              <AcademySimulator />
            </Reveal>
          </div>
        </section>

        {/* Note */}
        <section className="px-4 pb-24 pt-2 sm:px-6 lg:px-8">
          <Reveal>
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-sm leading-relaxed text-ink-500">
                Training scenarios are illustrative. The leaderboard rewards calibration and
                restraint, never streaks — the same standard the engine holds itself to.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link href="/intelligence" className="btn btn-ghost">Inside the engine</Link>
                <Link href="/parlay-mri" className="btn btn-ghost">Parlay MRI</Link>
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      <Footer />
    </div>
  );
}
