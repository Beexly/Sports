import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { Reveal, Stagger } from "@/components/motion/reveal";
import { ShootingStars } from "@/components/motion/shooting-stars";
import { SignalRule } from "@/components/motion/signal-rule";
import { BRAND_NAME, BRAND_COLORS } from "@/lib/brand";
import { FOUNDING_DESK_OFFER } from "@/lib/pricing/pricing-phases";
import { FoundingDeskCta } from "@/components/founding-desk/founding-desk-cta";
import { TrackView } from "@/components/founding-desk/track-view";

export const metadata: Metadata = {
  title: "Galaxy Founding Desk — The Intelligence Ritual",
  description:
    "Before you bet, follow a pick, or make a sports decision — read the Desk. Daily calibrated signals, No-Bet Watch, Market Mirage, and Signal vs Noise. Founding pricing, locked for the life of your membership.",
  alternates: { canonical: "/founding-desk" },
  openGraph: {
    title: `Galaxy Founding Desk — ${BRAND_NAME}`,
    description:
      "The intelligence ritual for people who are done being sold certainty. Daily Desk brief · No-Bet Watch · Market Mirage · Signal vs Noise.",
  },
};

const WHAT_YOU_GET = [
  {
    eyebrow: "01",
    title: "Daily (or near-daily) Galaxy Desk Brief",
    body: "A focused intelligence read before the slate opens: what the market is pricing, where the pressure is, and what signal is worth considering — with the reasoning attached.",
    accent: BRAND_COLORS.orbitalCyan,
  },
  {
    eyebrow: "02",
    title: "No-Bet Watch",
    body: "The game everyone wants action on — and a structured look at why declining the action might be the sharpest move. No-Bet is a first-class position, not a fallback.",
    accent: BRAND_COLORS.softUltraviolet,
  },
  {
    eyebrow: "03",
    title: "Market Mirage",
    body: "What the public believes versus what market pricing implies. The gap between narrative and number is often where edge lives.",
    accent: BRAND_COLORS.ionMagenta,
  },
  {
    eyebrow: "04",
    title: "Signal vs Noise",
    body: "A disciplined read on what is real signal and what is media-driven noise — separated, labeled, and reasoned through so you can make a cleaner decision.",
    accent: BRAND_COLORS.orbitalCyan,
  },
  {
    eyebrow: "05",
    title: "Public Narrative vs Market Pressure",
    body: "The story the media tells versus what the market is actually doing. Understanding the gap is not about picking winners — it is about calibrating how you think.",
    accent: BRAND_COLORS.softUltraviolet,
  },
  {
    eyebrow: "06",
    title: "Submit One Game",
    body: "Founding members can submit one game per brief cycle for consideration. We classify it: action signal, caution signal, no-bet signal, or insufficient data — honestly, never as advice.",
    accent: BRAND_COLORS.ionMagenta,
  },
  {
    eyebrow: "07",
    title: "Early Dashboard Access",
    body: "First look at the intelligence dashboard as it ships, before it opens to the broader subscriber base. You help shape the product; we keep you ahead.",
    accent: BRAND_COLORS.orbitalCyan,
  },
  {
    eyebrow: "08",
    title: "Founder Pricing — Held for Life",
    body: "Founding members keep this price permanently. When the price rises for new members as the product matures, yours never does.",
    accent: BRAND_COLORS.softUltraviolet,
  },
] as const;

const WHAT_WE_DO_NOT_PROMISE = [
  "Promised wins or certain outcomes — no honest sports-intelligence product can offer them.",
  "A verified win-rate before our calibration history makes one defensible — we publish the number when the data earns it, not before.",
  "Personalized gambling advice — the Desk is intelligence, not a betting service.",
  "Sportsbook operations — we do not accept wagers, we do not place wagers, we are not a gambling product.",
  "Certainty of any kind — confidence is not certainty, and the Desk will always say so.",
] as const;

export default function FoundingDeskPage() {
  return (
    <div
      className="flex min-h-screen flex-col"
      style={{ backgroundColor: BRAND_COLORS.obsidianBlack }}
    >
      <Nav />
      <TrackView event="founding_desk_view" />

      <main id="main-content" className="relative flex-1 overflow-hidden">
        <ShootingStars />

        {/* Hero */}
        <section className="relative px-4 pb-20 pt-28 sm:px-6 lg:px-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[70vh]"
            style={{
              background: `radial-gradient(55% 60% at 50% 0%, ${BRAND_COLORS.softUltraviolet}1a, transparent 70%), radial-gradient(40% 50% at 75% 0%, ${BRAND_COLORS.orbitalCyan}12, transparent 70%)`,
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
                Founding Desk — Early Access
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
                Galaxy{" "}
                <span
                  style={{
                    background: `linear-gradient(90deg, ${BRAND_COLORS.orbitalCyan} 0%, ${BRAND_COLORS.softUltraviolet} 100%)`,
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  Founding Desk.
                </span>
              </h1>
            </Reveal>

            <Reveal delay={160}>
              <p
                className="mt-5 font-display text-xl text-white"
                style={{ opacity: 0.85 }}
              >
                The intelligence ritual.
              </p>
              <p className="mt-3 max-w-2xl text-lg leading-8 text-ink-300">
                Before you bet, follow a pick, or make a fantasy or sports decision —{" "}
                <strong className="text-white">read the Desk.</strong> A daily
                structured intelligence brief that separates signal from noise,
                identifies the market pressure behind the line, and tells you when
                the right move is no move at all.
              </p>
            </Reveal>

            <Reveal delay={240}>
              <p className="mt-4 max-w-xl text-base leading-7 text-ink-300">
                {BRAND_NAME} is a sports intelligence and media company — not a
                sportsbook, not a tout service, not a gambling product. The Desk is
                the ritual. You decide what to do with it.
              </p>
            </Reveal>

            <Reveal delay={320}>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <FoundingDeskCta
                  displayPrice={FOUNDING_DESK_OFFER.beta14day}
                  offerLabel={FOUNDING_DESK_OFFER.tagline}
                />
                <Link
                  href="/sample-desk"
                  className="btn btn-ghost"
                  style={{ color: BRAND_COLORS.orbitalCyan }}
                >
                  See a sample brief first →
                </Link>
              </div>
            </Reveal>

            <Reveal delay={400}>
              <p className="mt-4 text-xs text-ink-500">
                ${FOUNDING_DESK_OFFER.beta14day} for the {FOUNDING_DESK_OFFER.tagline}.
                Founding price — held for life.
              </p>
            </Reveal>
          </div>
        </section>

        <SignalRule className="mx-auto max-w-5xl px-4" />

        {/* What members get */}
        <section className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <p
                className="eyebrow"
                style={{ color: BRAND_COLORS.orbitalCyan }}
              >
                What Founding Members receive
              </p>
              <h2
                className="mt-3 font-display text-white"
                style={{
                  fontSize: "clamp(1.8rem, 4vw, 3rem)",
                  lineHeight: 1.1,
                  letterSpacing: "-0.01em",
                }}
              >
                Eight things the Desk delivers.
              </h2>
            </Reveal>

            <Stagger className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2" step={70}>
              {WHAT_YOU_GET.map((item) => (
                <article
                  key={item.eyebrow}
                  className="surface-card group relative flex flex-col gap-3 overflow-hidden p-6"
                  style={{ borderColor: `${item.accent}1f` }}
                >
                  <div
                    className="mb-1 h-0.5 w-full rounded-full"
                    style={{
                      background: `linear-gradient(90deg, ${item.accent}, transparent 70%)`,
                    }}
                    aria-hidden="true"
                  />
                  <span
                    className="font-display text-3xl tabular-nums"
                    style={{ color: item.accent }}
                  >
                    {item.eyebrow}
                  </span>
                  <h3 className="font-display text-xl text-white">{item.title}</h3>
                  <p className="text-sm leading-relaxed text-ink-300">{item.body}</p>
                </article>
              ))}
            </Stagger>
          </div>
        </section>

        <SignalRule className="mx-auto max-w-5xl px-4" />

        {/* What we do NOT promise */}
        <section className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <p
                className="eyebrow"
                style={{ color: BRAND_COLORS.ionMagenta }}
              >
                Honest limits
              </p>
              <h2
                className="mt-3 font-display text-white"
                style={{
                  fontSize: "clamp(1.8rem, 4vw, 3rem)",
                  lineHeight: 1.1,
                  letterSpacing: "-0.01em",
                }}
              >
                What the Founding Desk does not promise.
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-ink-300">
                These are not legal disclaimers. They are the operating honesty of
                this product. We state them plainly because the restraint is the
                trust pitch — not a weakness.
              </p>
            </Reveal>

            <Stagger className="mt-8 flex flex-col gap-4" step={80}>
              {WHAT_WE_DO_NOT_PROMISE.map((item, i) => (
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
                  <p className="text-sm leading-relaxed text-ink-300">{item}</p>
                </div>
              ))}
            </Stagger>
          </div>
        </section>

        <SignalRule className="mx-auto max-w-5xl px-4" />

        {/* CTA repeat */}
        <section className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <div
                className="rounded-2xl border p-8 text-center"
                style={{
                  borderColor: `${BRAND_COLORS.orbitalCyan}22`,
                  background: `radial-gradient(ellipse 60% 80% at 50% 100%, ${BRAND_COLORS.orbitalCyan}08, transparent 70%)`,
                }}
              >
                <p
                  className="font-mono text-[10px] font-bold uppercase tracking-[0.3em]"
                  style={{ color: BRAND_COLORS.orbitalCyan }}
                >
                  Ready to join
                </p>
                <h2
                  className="mt-3 font-display text-white"
                  style={{
                    fontSize: "clamp(1.6rem, 3.5vw, 2.5rem)",
                    lineHeight: 1.15,
                  }}
                >
                  Back the Desk before the record exists.
                </h2>
                <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-ink-300">
                  Founding pricing is held for the life of your membership — the
                  lowest price the Desk will ever carry. When the verified record
                  grows and prices rise for new members, yours stays put.
                </p>
                <div className="mt-7 flex flex-wrap justify-center gap-4">
                  <FoundingDeskCta
                    displayPrice={FOUNDING_DESK_OFFER.beta14day}
                    offerLabel={FOUNDING_DESK_OFFER.tagline}
                  />
                  <Link href="/trust-room" className="btn btn-ghost">
                    How confidence works →
                  </Link>
                </div>
                <p className="mt-6 text-xs text-ink-500">
                  Not a sportsbook. We do not accept or place wagers.{" "}
                  <Link
                    href="/responsible-play"
                    className="underline underline-offset-4"
                    style={{ color: BRAND_COLORS.orbitalCyan }}
                  >
                    Responsible play
                  </Link>
                  .
                </p>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
