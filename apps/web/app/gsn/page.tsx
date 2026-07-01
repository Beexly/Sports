import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { Reveal } from "@/components/motion/reveal";
import { Atmosphere } from "@/components/ui/atmosphere";
import { GSNTransmission } from "@/components/gsn/transmission";
import { SAMPLE_TRANSMISSION } from "@/lib/gsn/transmission";
import { BRAND_COLORS } from "@/lib/brand";

export const metadata: Metadata = {
  title: "GSN — Galaxy Sports Network",
  description:
    "Not a blog — a daily intelligence transmission. The whole slate read as a mission-control briefing: Galaxy Brief, Market Mirages, Roster Shocks, Coaching Edges, and Line-Movement Autopsies.",
  alternates: { canonical: "/gsn" },
};

export default function GSNPage() {
  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: BRAND_COLORS.obsidianBlack }}>
      <Atmosphere />
      <Nav />

      <main id="main-content" className="flex-1">
        {/* Hero */}
        <section className="relative isolate overflow-hidden px-4 pb-8 pt-24 sm:px-6 lg:px-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-96"
            style={{
              background: `radial-gradient(60% 80% at 50% 0%, ${BRAND_COLORS.orbitalCyan}16, transparent 70%), radial-gradient(40% 60% at 74% 8%, ${BRAND_COLORS.softUltraviolet}12, transparent 70%)`,
            }}
          />
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <p className="eyebrow inline-flex items-center gap-2" style={{ color: BRAND_COLORS.orbitalCyan }}>
                <span className="live-dot" />
                Galaxy Sports Network
              </p>
            </Reveal>
            <Reveal delay={90}>
              <h1
                className="mt-5 font-display text-balance text-white"
                style={{ fontSize: "clamp(2.5rem, 8vw, 5.5rem)", lineHeight: 0.98, letterSpacing: "-0.02em" }}
              >
                GSN — the{" "}
                <span className="gse-editorial" style={{ fontSize: "1.08em" }}>transmission</span>, not the blog.
              </h1>
            </Reveal>
            <Reveal delay={170}>
              <p className="mt-5 max-w-2xl text-lg text-ink-300">
                Every day the engine reads the whole board and files an intelligence briefing —
                the mirages the crowd is walking into, the roster shocks re-pricing the slate, the
                coaching edges the market underweights, and last night&apos;s autopsies. Content
                becomes an event.
              </p>
            </Reveal>
          </div>
        </section>

        {/* The transmission */}
        <section className="px-4 pb-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <GSNTransmission transmission={SAMPLE_TRANSMISSION} />
            </Reveal>
          </div>
        </section>

        {/* Note */}
        <section className="px-4 pb-24 pt-4 sm:px-6 lg:px-8">
          <Reveal>
            <div
              className="mx-auto max-w-3xl rounded-2xl p-8 text-center"
              style={{ border: `1px solid ${BRAND_COLORS.steelGray}`, background: `linear-gradient(180deg, ${BRAND_COLORS.steelGray}55, transparent)` }}
            >
              <p className="eyebrow" style={{ color: BRAND_COLORS.orbitalCyan }}>
                Connected to the engine
              </p>
              <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-ink-300">
                The sample above shows the format. Live daily transmissions are generated from the
                real slate once it&apos;s wired behind the readiness gate — every segment will link
                straight into the live object it describes, so the story and the data are the same
                thing.
              </p>
              <div className="mt-7 flex flex-wrap justify-center gap-3">
                <Link href="/observatory" className="btn btn-primary">
                  Enter the slate
                </Link>
                <Link href="/academy" className="btn btn-ghost">
                  Train in the Academy
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
