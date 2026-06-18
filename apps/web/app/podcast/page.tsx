import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { Reveal, Stagger } from "@/components/motion/reveal";
import { SignalRule } from "@/components/motion/signal-rule";
import { BRAND_NAME, BRAND_COLORS, SUPPORT_EMAIL } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Galaxy Desk Podcast — Sports Intelligence Audio",
  description:
    "The Galaxy Desk Podcast: 12–18 minutes per episode, five structured segments. Market Mirage, No-Bet Watch, one matchup signal, one public-narrative correction, and what we are not claiming yet. Building now.",
  alternates: { canonical: "/podcast" },
  openGraph: {
    title: `Galaxy Desk Podcast — ${BRAND_NAME}`,
    description:
      "The audio version of the Galaxy Desk brief. Market Mirage, No-Bet Watch, matchup signals, and public-narrative corrections. Episodes coming soon.",
    type: "website",
  },
};

const SEGMENT_FORMAT = [
  {
    label: "Market Mirage",
    desc: "What the public believes versus what market pricing implies. The gap is where the signal lives, and this segment names it plainly.",
    accent: BRAND_COLORS.orbitalCyan,
  },
  {
    label: "No-Bet Watch",
    desc: "The game everyone is talking about — and a structured look at why declining that action might be the sharpest position this week.",
    accent: BRAND_COLORS.softUltraviolet,
  },
  {
    label: "One Matchup Signal",
    desc: "One game, looked at in depth. Not a pick. A structured read: the market, the line, the pressure, and what it might mean.",
    accent: BRAND_COLORS.ionMagenta,
  },
  {
    label: "Public-Narrative Correction",
    desc: "One story the sports media has gotten wrong this week — or at least complicated — and what the underlying data actually shows.",
    accent: BRAND_COLORS.orbitalCyan,
  },
  {
    label: "What We Are Not Claiming Yet",
    desc: "Every episode ends here. What we looked at and did not reach a confident read on. Restraint is not a weakness — it is the standard.",
    accent: BRAND_COLORS.softUltraviolet,
  },
] as const;

const HONEST_STATE_NOTES = [
  "No episodes exist yet. We are not publishing a backlog of unreleased recordings.",
  "No download numbers — we have no audience data to report because there is no show yet.",
  "No ratings — fabricated social proof is something we do not do.",
  "No episode guests confirmed — future guests are not announced until they are recorded.",
] as const;

export default function PodcastPage() {
  return (
    <div
      className="flex min-h-screen flex-col"
      style={{ backgroundColor: BRAND_COLORS.obsidianBlack }}
    >
      <Nav />

      <main id="main-content" className="relative flex-1 overflow-hidden">

        {/* Hero */}
        <section className="relative px-4 pb-20 pt-28 sm:px-6 lg:px-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[65vh]"
            style={{
              background: `radial-gradient(55% 60% at 50% 0%, ${BRAND_COLORS.orbitalCyan}18, transparent 70%), radial-gradient(35% 50% at 85% 0%, ${BRAND_COLORS.ionMagenta}0e, transparent 70%)`,
            }}
          />
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <span
                className="inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em]"
                style={{
                  color: BRAND_COLORS.orbitalCyan,
                  borderColor: `${BRAND_COLORS.orbitalCyan}30`,
                  backgroundColor: `${BRAND_COLORS.orbitalCyan}0d`,
                }}
              >
                Galaxy Desk Podcast — Building Now
              </span>
            </Reveal>

            <Reveal delay={90}>
              <h1
                className="mt-5 font-display text-balance text-white"
                style={{
                  fontSize: "clamp(2.4rem, 6vw, 4.8rem)",
                  lineHeight: 1.0,
                  letterSpacing: "-0.02em",
                }}
              >
                The Galaxy{" "}
                <span
                  style={{
                    background: `linear-gradient(90deg, ${BRAND_COLORS.orbitalCyan} 0%, ${BRAND_COLORS.softUltraviolet} 100%)`,
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  Desk Podcast.
                </span>
              </h1>
            </Reveal>

            <Reveal delay={160}>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-ink-300">
                12 to 18 minutes. Five segments. The same calibrated
                intelligence from the Galaxy Desk brief — in audio form.
                Market Mirage, No-Bet Watch, one matchup signal, one
                public-narrative correction, and what we are not claiming yet.
              </p>
            </Reveal>

            <Reveal delay={240}>
              <div
                className="mt-6 inline-flex items-center gap-3 rounded-xl border px-5 py-3"
                style={{
                  borderColor: `${BRAND_COLORS.orbitalCyan}25`,
                  background: `${BRAND_COLORS.orbitalCyan}0a`,
                }}
              >
                <span
                  className="h-2 w-2 animate-pulse rounded-full"
                  style={{ backgroundColor: BRAND_COLORS.orbitalCyan }}
                  aria-hidden="true"
                />
                <span className="text-sm text-ink-300">
                  The show is in production.{" "}
                  <strong className="text-white">
                    First episodes coming — no launch date yet.
                  </strong>
                </span>
              </div>
            </Reveal>

            <Reveal delay={320}>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link href="/newsletter" className="btn btn-primary">
                  Notify me when episodes drop →
                </Link>
                <Link
                  href="/founding-desk"
                  className="btn btn-ghost"
                  style={{ color: BRAND_COLORS.orbitalCyan }}
                >
                  Galaxy Founding Desk →
                </Link>
              </div>
            </Reveal>

            <Reveal delay={400}>
              <p className="mt-4 text-xs text-ink-500">
                Sign up for the Galaxy Desk Note newsletter — you will hear
                when episodes are ready before anyone else.
              </p>
            </Reveal>
          </div>
        </section>

        <SignalRule className="mx-auto max-w-5xl px-4" />

        {/* Episode format */}
        <section className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <p
                className="eyebrow"
                style={{ color: BRAND_COLORS.orbitalCyan }}
              >
                Episode format
              </p>
              <h2
                className="mt-3 font-display text-white"
                style={{
                  fontSize: "clamp(1.8rem, 4vw, 3rem)",
                  lineHeight: 1.1,
                  letterSpacing: "-0.01em",
                }}
              >
                Five segments. Every episode.
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-ink-300">
                The format is structured and consistent. Every episode follows
                the same five-segment arc — so you know what you are getting
                before the first minute plays.
              </p>
            </Reveal>

            <Stagger className="mt-10 flex flex-col gap-4" step={80}>
              {SEGMENT_FORMAT.map((seg, i) => (
                <div
                  key={seg.label}
                  className="flex items-start gap-5 rounded-xl border p-5"
                  style={{
                    borderColor: `${seg.accent}20`,
                    background: `${seg.accent}06`,
                  }}
                >
                  <span
                    className="mt-0.5 shrink-0 font-display text-2xl tabular-nums"
                    style={{ color: seg.accent }}
                    aria-hidden="true"
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3
                      className="font-display text-lg font-semibold"
                      style={{ color: seg.accent }}
                    >
                      {seg.label}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-ink-300">
                      {seg.desc}
                    </p>
                  </div>
                </div>
              ))}
            </Stagger>
          </div>
        </section>

        <SignalRule className="mx-auto max-w-5xl px-4" />

        {/* Honest state declaration */}
        <section className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <p
                className="eyebrow"
                style={{ color: BRAND_COLORS.ionMagenta }}
              >
                Honest state of the show
              </p>
              <h2
                className="mt-3 font-display text-white"
                style={{
                  fontSize: "clamp(1.8rem, 4vw, 3rem)",
                  lineHeight: 1.1,
                  letterSpacing: "-0.01em",
                }}
              >
                What we are not claiming yet.
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-ink-300">
                This is the Galaxy standard. We do not fabricate audience
                numbers, download counts, ratings, or episode backlogs.
                The show is being built. When it is ready, you will know —
                because the restraint is the trust signal.
              </p>
            </Reveal>

            <Stagger className="mt-8 flex flex-col gap-4" step={70}>
              {HONEST_STATE_NOTES.map((note, i) => (
                <div
                  key={i}
                  className="flex items-start gap-4 rounded-xl border p-5"
                  style={{
                    borderColor: `${BRAND_COLORS.ionMagenta}20`,
                    background: `${BRAND_COLORS.ionMagenta}08`,
                  }}
                >
                  <span
                    aria-hidden="true"
                    className="mt-0.5 shrink-0 text-lg font-bold"
                    style={{ color: BRAND_COLORS.ionMagenta }}
                  >
                    ✕
                  </span>
                  <p className="text-sm leading-relaxed text-ink-300">{note}</p>
                </div>
              ))}
            </Stagger>
          </div>
        </section>

        <SignalRule className="mx-auto max-w-5xl px-4" />

        {/* Sponsor + CTA cluster */}
        <section className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl grid grid-cols-1 gap-6 md:grid-cols-2">

            {/* Notify CTA */}
            <Reveal>
              <div
                className="flex h-full flex-col rounded-2xl border p-8"
                style={{
                  borderColor: `${BRAND_COLORS.orbitalCyan}22`,
                  background: `radial-gradient(ellipse 80% 80% at 50% 100%, ${BRAND_COLORS.orbitalCyan}08, transparent 70%)`,
                }}
              >
                <p
                  className="font-mono text-[10px] font-bold uppercase tracking-[0.3em]"
                  style={{ color: BRAND_COLORS.orbitalCyan }}
                >
                  Be first
                </p>
                <h3
                  className="mt-3 font-display text-2xl text-white"
                  style={{ lineHeight: 1.15 }}
                >
                  Notify me when episodes drop.
                </h3>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-ink-300">
                  Sign up for the Galaxy Desk Note. Subscribers hear about new
                  episodes before they post anywhere else — plus the weekly
                  newsletter brief.
                </p>
                <div className="mt-6">
                  <Link href="/newsletter" className="btn btn-primary">
                    Join the Desk Note →
                  </Link>
                </div>
              </div>
            </Reveal>

            {/* Sponsor CTA */}
            <Reveal delay={100}>
              <div
                className="flex h-full flex-col rounded-2xl border p-8"
                style={{
                  borderColor: `${BRAND_COLORS.softUltraviolet}22`,
                  background: `radial-gradient(ellipse 80% 80% at 50% 100%, ${BRAND_COLORS.softUltraviolet}08, transparent 70%)`,
                }}
              >
                <p
                  className="font-mono text-[10px] font-bold uppercase tracking-[0.3em]"
                  style={{ color: BRAND_COLORS.softUltraviolet }}
                >
                  Sponsors
                </p>
                <h3
                  className="mt-3 font-display text-2xl text-white"
                  style={{ lineHeight: 1.15 }}
                >
                  Interested in sponsoring?
                </h3>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-ink-300">
                  We sell niche trust — not fake reach. Podcast sponsor slots
                  go to businesses whose audience overlaps with disciplined
                  sports thinkers. See the full media kit for categories,
                  pricing, and compliance constraints.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link href="/media-kit" className="btn btn-ghost" style={{ color: BRAND_COLORS.softUltraviolet }}>
                    View Media Kit →
                  </Link>
                  <a
                    href={`mailto:${SUPPORT_EMAIL}?subject=Podcast%20Sponsor%20Inquiry`}
                    className="btn btn-ghost"
                  >
                    Contact us →
                  </a>
                </div>
              </div>
            </Reveal>
          </div>

          {/* Founding Desk cross-link */}
          <Reveal delay={180}>
            <div className="mx-auto mt-6 max-w-5xl">
              <div
                className="rounded-2xl border p-6 text-center"
                style={{
                  borderColor: `${BRAND_COLORS.orbitalCyan}18`,
                  background: `${BRAND_COLORS.orbitalCyan}05`,
                }}
              >
                <p className="text-sm text-ink-300">
                  Want the written intelligence brief while you wait for the
                  podcast?
                </p>
                <Link
                  href="/founding-desk"
                  className="mt-3 inline-flex items-center gap-1 text-sm font-medium underline underline-offset-4"
                  style={{ color: BRAND_COLORS.orbitalCyan }}
                >
                  Galaxy Founding Desk — daily intelligence brief →
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
