import type { Metadata } from "next";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { Reveal } from "@/components/motion/reveal";
import { Atmosphere } from "@/components/ui/atmosphere";
import { GeneratedPlate } from "@/components/immersive/generated-plate";
import { TheBeat } from "@/components/news/the-beat";
import { GalaxyBroadcast } from "@/components/news/galaxy-broadcast";
import { buildBroadcast } from "@/lib/fantasy/host";
import { WIRE_DISCLAIMER } from "@/lib/news/wire";
import { BRAND_COLORS } from "@/lib/brand";

export const metadata: Metadata = {
  title: "The Beat · Galaxy Broadcast & Reliability-Tiered Newsroom",
  description:
    "A constantly-running transmission: Nova reports the week's top signals on location, then the Signal Ledger scores every breaking report the instant it lands. Source reliability, the players and lines it moves, and the move to make before the market prices it in.",
  alternates: { canonical: "/the-beat" },
};

export default function TheBeatPage() {
  const broadcast = buildBroadcast();

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: BRAND_COLORS.obsidianBlack }}>
      <Atmosphere />
      <Nav />

      <main id="main-content" className="flex-1">
        {/* ── BROADCAST · the always-on transmission ───────────────────── */}
        <section className="relative isolate overflow-hidden px-4 pb-10 pt-24 sm:px-6 lg:px-8">
          {/* Cinematic GSN control-room plate. Decorative, reduced-motion safe.
              Motion plate (Seedance/Kling i2v) lands once generation is approved;
              the still is the premium upgrade in the meantime. */}
          <GeneratedPlate
            className="-z-10 opacity-[0.2]"
            still="/immersive/gsn-broadcast-plate.webp"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-96"
            style={{ background: `radial-gradient(55% 80% at 50% 0%, ${BRAND_COLORS.orbitalCyan}16, transparent 70%)` }}
          />
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <p className="eyebrow inline-flex items-center gap-2" style={{ color: BRAND_COLORS.orbitalCyan }}>
                <span className="live-dot" /> The Beat · On air
              </p>
            </Reveal>
            <Reveal delay={90}>
              <h1
                className="mt-5 max-w-3xl font-display text-balance text-white"
                style={{ fontSize: "clamp(2.4rem, 7vw, 5rem)", lineHeight: 0.98, letterSpacing: "-0.02em" }}
              >
                Breaking news, <span className="gse-editorial" style={{ fontSize: "1.08em" }}>scored</span>.
              </h1>
            </Reveal>
            <Reveal delay={160}>
              <p className="mt-5 max-w-2xl text-lg text-ink-300">
                Sports media is a market too. Noisy, and now accountable. Nova brings you the week&apos;s
                top signals on location; below, the Signal Ledger scores every report the instant it lands.
              </p>
            </Reveal>

            <Reveal delay={220}>
              <div className="mt-8">
                <GalaxyBroadcast broadcast={broadcast} />
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── SIGNAL LEDGER · the graded feed (proof preserved) ─────────── */}
        <section className="px-4 pb-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            {/* The transmission flows down into the ledger */}
            <div aria-hidden className="mx-auto h-10 w-px" style={{ background: `linear-gradient(to bottom, transparent, ${BRAND_COLORS.orbitalCyan}66)` }} />
            <Reveal>
              <div className="flex flex-col gap-2 pt-2">
                <p className="eyebrow" style={{ color: BRAND_COLORS.orbitalCyan }}>The Signal Ledger</p>
                <h2 className="font-display text-2xl font-semibold text-white sm:text-3xl">
                  Every report, weighed the instant it lands.
                </h2>
                <p className="max-w-2xl text-sm leading-6 text-ink-300">
                  The instant a report lands we weigh the source by tier, map it to the players and lines it
                  moves, decay it by freshness, and tell you the move. Before it&apos;s priced in.
                </p>
              </div>
            </Reveal>
            <div className="mt-8">
              <TheBeat />
            </div>
            <Reveal delay={120}>
              <p className="mt-6 text-xs leading-relaxed text-ink-500">{WIRE_DISCLAIMER}</p>
            </Reveal>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
