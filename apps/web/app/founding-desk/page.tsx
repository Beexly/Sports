import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { Reveal, Stagger } from "@/components/motion/reveal";
import { ShootingStars } from "@/components/motion/shooting-stars";
import { SignalRule } from "@/components/motion/signal-rule";
import { WorldSection } from "@/components/world/world-section";
import { BRAND_NAME, BRAND_COLORS } from "@/lib/brand";
import { FOUNDING_DESK_OFFER } from "@/lib/pricing/pricing-phases";
import { FoundingDeskCta } from "@/components/founding-desk/founding-desk-cta";
import { TrackView } from "@/components/founding-desk/track-view";
import { RevenueHero } from "@/components/revenue/revenue-hero";
import { PriceHoldAnchor } from "@/components/founding-desk/price-hold-anchor";
import { SampleBriefCard } from "@/components/founding-desk/sample-brief-card";

export const metadata: Metadata = {
  title: "Galaxy Founding Desk — The Intelligence Ritual",
  description:
    "Before you bet, follow a pick, or make a sports decision — read the Desk. Daily calibrated signals, No-Bet Watch, Market Mirage, and Signal vs Noise. Founding pricing held for life.",
  alternates: { canonical: "/founding-desk" },
  openGraph: {
    title: `Galaxy Founding Desk — ${BRAND_NAME}`,
    description:
      "The intelligence ritual for people who are done being sold certainty. Daily Desk brief · No-Bet Watch · Market Mirage · Signal vs Noise.",
    type: "website",
  },
};

/**
 * The supporting benefits — the seven things that orbit the focal argument
 * (the daily brief itself). Rendered as a tighter surface-card grid below the
 * one benefit we lead with. Each is a real Desk capability, not a promise of
 * outcome.
 */
const SUPPORTING_BENEFITS = [
  {
    eyebrow: "02",
    title: "No-Bet Watch",
    body: "The game everyone wants action on — and a structured look at why declining might be the sharpest move. No-Bet is a first-class position, not a fallback.",
    accent: BRAND_COLORS.softUltraviolet,
  },
  {
    eyebrow: "03",
    title: "Market Mirage",
    body: "What the public believes set against what the price implies. The gap between narrative and number is where edge tends to hide.",
    accent: BRAND_COLORS.ionMagenta,
  },
  {
    eyebrow: "04",
    title: "Signal vs Noise",
    body: "A disciplined read that separates real signal from media-driven noise — labelled and reasoned through, so the decision you make is a cleaner one.",
    accent: BRAND_COLORS.orbitalCyan,
  },
  {
    eyebrow: "05",
    title: "Narrative vs Pressure",
    body: "The story the media tells, beside what the market is actually doing. Reading the gap is less about picking winners than about calibrating how you think.",
    accent: BRAND_COLORS.softUltraviolet,
  },
  {
    eyebrow: "06",
    title: "Submit one game",
    body: "Founding members can send one game per cycle for consideration. We classify it honestly — action, caution, no-bet, or insufficient data. Never as advice.",
    accent: BRAND_COLORS.ionMagenta,
  },
  {
    eyebrow: "07",
    title: "Early dashboard access",
    body: "First look at the intelligence dashboard as it ships, before it opens to the broader base. You help shape the product; we keep you ahead of it.",
    accent: BRAND_COLORS.orbitalCyan,
  },
  {
    eyebrow: "08",
    title: "Founder rate, held for life",
    body: "Your founding price is permanent. When the rate rises for new members as the record matures, yours stays exactly where it started.",
    accent: BRAND_COLORS.softUltraviolet,
  },
] as const;

/**
 * The restraint list — promoted to a hero-level moment. These are not legal
 * disclaimers; they are the operating honesty of the product, which is the
 * actual pitch.
 */
const WHAT_WE_DO_NOT_PROMISE = [
  "We do not promise wins or certain outcomes. No honest sports-intelligence product can — and the ones that do are selling you the part we refuse to sell.",
  "We do not quote a win-rate before our calibration history makes one defensible. The number goes public when the data earns it, not a day sooner.",
  "We do not give personalized gambling advice. The Desk is intelligence you read and reason with — it is not a betting service.",
  "We do not run a sportsbook. We accept no wagers, place no wagers, and are not a gambling product.",
  "We do not trade in certainty. Confidence is not certainty, and the Desk says so every single day.",
] as const;

/**
 * Receipts — the real, published record surfaces. We do not fabricate a number
 * here; we point to the pages that carry the actual evidence, including losses.
 */
const RECEIPTS = [
  {
    label: "Closing-line value",
    href: "/clv",
    body: "Whether our number beat the market's closing number — the honest measure of a process, before any win-rate exists.",
  },
  {
    label: "Performance & calibration",
    href: "/performance",
    body: "The published record once it can support a number: wins, losses, pushes, and how well-calibrated the confidence was.",
  },
  {
    label: "Accountability",
    href: "/accountability",
    body: "Where decisions get x-rayed in public — what we read, what moved, and what the result taught us. Losses included by design.",
  },
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

        {/* ── Hero — chrome + serif headline, lede, and the founding-price
            anchor above the fold (the single most important conversion element). */}
        <RevenueHero
          chip="Founding Desk · Early Access"
          chipTone="cyan"
          headline={
            <>
              <span className="gw-chrome-ice">Galaxy</span>{" "}
              <span className="gse-editorial text-orbital-cyan gw-text-glow-cyan">
                Founding Desk
              </span>
              .
            </>
          }
          lede={
            <>
              <span className="font-display text-xl text-white">
                Before you bet, read the Desk.
              </span>
              <span className="mt-3 block">
                A daily intelligence brief that pulls the signal out of the noise, names
                the market pressure behind the line, and tells you — out loud — when the
                right move is no move at all. {BRAND_NAME} is an intelligence and media
                company. Not a sportsbook. Not a tout. You decide what to do with the read.
              </span>
            </>
          }
        >
          <PriceHoldAnchor />
          <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <Link
              href="/sample-desk"
              className="inline-flex items-center gap-1.5 font-semibold text-orbital-cyan transition-colors hover:text-white"
            >
              See a sample brief first
              <span aria-hidden="true">→</span>
            </Link>
            <span className="text-ink-500">
              Not a sportsbook. We do not accept or place wagers.
            </span>
          </div>
        </RevenueHero>

        {/* ── Honesty as the product — promoted directly under the hero.
            A confident, framed moment, not a buried magenta list. */}
        <section className="gw-nebula relative isolate overflow-hidden px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <p className="gw-chapter-index">
                <span className="text-orbital-cyan">01</span>
                The honesty is the product
              </p>
              <h2 className="mt-4 max-w-3xl font-display text-display-lg font-semibold text-balance text-white">
                What the Desk{" "}
                <span className="gse-editorial gw-chrome-plasma">refuses</span> to promise.
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-ink-300">
                Most picks products win you over by overclaiming. We win you over by saying
                the quiet part first. The list below is the operating honesty of this
                product — and that restraint is exactly what you are paying for. Everyone
                else removes the caveats. We lead with them.
              </p>
            </Reveal>

            <Stagger className="mt-9 grid grid-cols-1 gap-4 md:grid-cols-2" step={70}>
              {WHAT_WE_DO_NOT_PROMISE.map((item, i) => (
                <div
                  key={i}
                  className="surface-card gw-card-hover flex items-start gap-4 p-5"
                >
                  <span
                    aria-hidden="true"
                    className="mt-0.5 shrink-0 font-mono text-sm font-bold"
                    style={{ color: BRAND_COLORS.ionMagenta }}
                  >
                    ✕
                  </span>
                  <p className="text-sm leading-relaxed text-ink-300">{item}</p>
                </div>
              ))}
            </Stagger>

            <Reveal delay={120}>
              <p className="mt-7 max-w-2xl text-sm leading-7 text-ink-400">
                A product confident enough to publish its limits is a product confident in
                everything else it says. That is the whole pitch.
              </p>
            </Reveal>
          </div>
        </section>

        <SignalRule className="mx-auto max-w-5xl px-4" />

        {/* ── Receipts — point to the real, published record. No fabricated
            numbers; the evidence lives on these pages, losses included. */}
        <section className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <div className="flex flex-wrap items-center gap-2">
                <span className="gw-chip-cyan">We publish the record</span>
                <span className="gw-chip-plasma">Losses included</span>
              </div>
              <h2 className="mt-5 max-w-3xl font-display text-display-lg font-semibold text-balance text-white">
                Don&apos;t take our word.{" "}
                <span className="gse-editorial text-orbital-cyan gw-text-glow-cyan">
                  Read the receipts
                </span>
                .
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-ink-300">
                A track record is something you can check, not something we assert. These
                pages carry the evidence as it accumulates — closing-line value, the
                calibration of our confidence, and the public autopsy of decisions after
                they settle. When a number is not yet defensible, the page says so plainly
                rather than inventing one.
              </p>
            </Reveal>

            <Stagger className="mt-9 grid grid-cols-1 gap-4 md:grid-cols-3" step={80}>
              {RECEIPTS.map((r) => (
                <Link
                  key={r.href}
                  href={r.href}
                  className="surface-card gw-card-hover group flex flex-col gap-2.5 p-6"
                >
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-orbital-cyan">
                    {r.label}
                  </p>
                  <p className="text-sm leading-relaxed text-ink-300">{r.body}</p>
                  <span className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-orbital-cyan transition-colors group-hover:text-white">
                    Open the page
                    <span aria-hidden="true">→</span>
                  </span>
                </Link>
              ))}
            </Stagger>
          </div>
        </section>

        <SignalRule className="mx-auto max-w-5xl px-4" />

        {/* ── What members get — ONE focal benefit (the daily brief itself),
            then the seven supporting benefits in a tighter grid. */}
        <WorldSection
          index="02"
          eyebrow="What Founding Members receive"
          title={
            <>
              One brief, read before the slate{" "}
              <span className="gw-chrome-ice">opens</span>.
            </>
          }
          lede="Everything the Desk does orbits a single deliverable: a daily intelligence read that lifts the quality of the decision you were already going to make. The rest sharpens it."
          tone="deep"
        >
          {/* The focal argument — larger, leading. */}
          <Reveal>
            <article className="surface-card gw-card-hover relative overflow-hidden p-7 sm:p-9">
              <div
                aria-hidden="true"
                className="mb-6 h-0.5 w-full rounded-full"
                style={{ background: "linear-gradient(90deg, rgba(0,229,255,0.85), rgba(122,92,255,0.45) 55%, transparent)" }}
              />
              <div className="grid gap-7 lg:grid-cols-[0.42fr_0.58fr] lg:items-center">
                <div>
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-orbital-cyan">
                    01 · The focal deliverable
                  </p>
                  <h3 className="mt-3 font-display text-3xl font-semibold leading-tight text-white sm:text-4xl">
                    The daily Galaxy Desk brief.
                  </h3>
                </div>
                <p className="text-base leading-7 text-ink-300">
                  A focused read before the slate opens: what the market is pricing, where
                  the pressure sits, which signal is worth weighing — and the reasoning
                  attached to every line of it. It is built to raise your decision quality,
                  not to replace your judgement. You finish the brief understanding the
                  game better than the person who only saw the line.
                </p>
              </div>
            </article>
          </Reveal>

          {/* The seven supporting benefits — tighter grid. */}
          <Stagger className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" step={60}>
            {SUPPORTING_BENEFITS.map((item) => (
              <article
                key={item.eyebrow}
                className="surface-card gw-card-hover flex flex-col gap-2.5 p-5"
              >
                <span
                  className="font-display text-2xl tabular-nums"
                  style={{ color: item.accent }}
                >
                  {item.eyebrow}
                </span>
                <h4 className="font-display text-lg text-white">{item.title}</h4>
                <p className="text-sm leading-relaxed text-ink-300">{item.body}</p>
              </article>
            ))}
          </Stagger>
        </WorldSection>

        {/* ── Show the product — an inline, clearly-labelled mini-brief so
            visitors SEE the Desk, with a link to the full sample. */}
        <WorldSection
          index="03"
          eyebrow="See the Desk, don't just read about it"
          title={
            <>
              A page from a{" "}
              <span className="gse-editorial gw-chrome-violet">real brief</span>.
            </>
          }
          lede="This is the format Founding members read every day. The structure is real; the game details are illustrative — here to show you the shape of the thing, not to be traded on."
          tone="nebula"
        >
          <div className="grid gap-7 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
            <Reveal>
              <p className="text-base leading-7 text-ink-300">
                Every brief runs the same recurring sections — Market Mirage, No-Bet Watch,
                Signal vs Noise, Narrative vs Pressure — so the read becomes a ritual rather
                than a scramble. Here is one section, in the real format, so you know exactly
                what you would receive.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                <Link
                  href="/sample-desk"
                  className="inline-flex items-center gap-1.5 font-semibold text-orbital-cyan transition-colors hover:text-white"
                >
                  Read a full sample brief
                  <span aria-hidden="true">→</span>
                </Link>
                <Link
                  href="/trust-room"
                  className="inline-flex items-center gap-1.5 text-ink-300 transition-colors hover:text-white"
                >
                  How confidence works
                  <span aria-hidden="true">→</span>
                </Link>
              </div>
            </Reveal>
            <Reveal delay={120}>
              <SampleBriefCard />
            </Reveal>
          </div>
        </WorldSection>

        {/* ── Final CTA — premium grammar, chrome headline, nebula. */}
        <section className="gw-nebula-deep relative isolate overflow-hidden px-4 py-24 sm:px-6 lg:px-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[60vh]"
            style={{
              background: `radial-gradient(ellipse 60% 80% at 50% 100%, ${BRAND_COLORS.orbitalCyan}14, transparent 70%)`,
            }}
          />
          <div className="mx-auto max-w-3xl text-center">
            <Reveal>
              <span className="gw-chip-cyan">Join the Founding Desk</span>
              <h2 className="mt-6 font-display text-display-lg font-semibold leading-[1.05] text-balance text-white">
                The lowest price the Desk{" "}
                <span className="gse-editorial text-orbital-cyan gw-text-glow-cyan">
                  will ever carry
                </span>
                .
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-ink-300">
                Founding pricing is held for the life of your membership. As the record
                grows and the rate rises for new members, yours holds. You back the Desk
                before the full record exists — and we are honest about that from the first
                word.
              </p>
            </Reveal>

            <Reveal delay={120}>
              <div className="mt-9 flex flex-col items-center gap-4">
                <FoundingDeskCta
                  displayPrice={FOUNDING_DESK_OFFER.beta14day}
                  offerLabel={FOUNDING_DESK_OFFER.tagline}
                />
                <Link
                  href="/responsible-play"
                  className="text-xs text-ink-500 underline underline-offset-4 transition-colors hover:text-ink-300"
                >
                  Responsible play
                </Link>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
