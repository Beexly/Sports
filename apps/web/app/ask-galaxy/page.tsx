import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { Reveal, Stagger } from "@/components/motion/reveal";
import { ShootingStars } from "@/components/motion/shooting-stars";
import { SignalRule } from "@/components/motion/signal-rule";
import { WorldSection } from "@/components/world/world-section";
import { RevenueHero } from "@/components/revenue/revenue-hero";
import { BRAND_NAME, BRAND_COLORS } from "@/lib/brand";
import { AskGalaxyForm } from "@/components/founding-desk/ask-galaxy-form";
import { TrackView } from "@/components/founding-desk/track-view";

export const metadata: Metadata = {
  title: `Ask Galaxy — Submit a Game for Manual Intelligence Review`,
  description:
    "Send us one game. A human analyst reads every submission and classifies it honestly: action signal, caution signal, no-bet signal, or insufficient data. Never automated betting advice.",
  alternates: { canonical: "/ask-galaxy" },
  openGraph: {
    title: `Ask Galaxy — Submit a Game | ${BRAND_NAME}`,
    description:
      "Submit one game for a manual intelligence read. We classify it: action signal, caution signal, no-bet signal, or insufficient data — honestly, never as betting advice.",
    type: "website",
  },
};

const HOW_IT_WORKS = [
  {
    eyebrow: "01",
    title: "You submit one game",
    body: "Tell us the matchup, what you are considering, and any context you think matters. The more signal you share, the sharper the read.",
    accent: BRAND_COLORS.orbitalCyan,
  },
  {
    eyebrow: "02",
    title: "SCOUT reads it manually",
    body: "A human intelligence analyst reviews every submission. This is never automated. No algorithm classifies your game; a person does.",
    accent: BRAND_COLORS.softUltraviolet,
  },
  {
    eyebrow: "03",
    title: "We classify it honestly",
    body: "Four possible outcomes: action signal, caution signal, no-bet signal, or insufficient data. We tell you what we see — including when the honest answer is that we do not have enough to say.",
    accent: BRAND_COLORS.ionMagenta,
  },
  {
    eyebrow: "04",
    title: "Never betting advice",
    body: "The classification is an intelligence read, not a directive. Galaxy Sports Network is a sports intelligence and media company — we do not accept wagers, place wagers, or operate as a sportsbook.",
    accent: BRAND_COLORS.orbitalCyan,
  },
] as const;

/**
 * The four honest classifications — the operating vocabulary of SCOUT.
 * Displayed prominently so visitors understand what they will receive.
 */
const CLASSIFICATIONS = [
  {
    label: "Action signal",
    description:
      "The read supports the position you are considering. There is enough signal to say so. Still your decision.",
    color: BRAND_COLORS.orbitalCyan,
  },
  {
    label: "Caution signal",
    description:
      "Something in the read warrants hesitation — a line move, a narrative mismatch, a market tell that deserves weight.",
    color: BRAND_COLORS.softUltraviolet,
  },
  {
    label: "No-bet signal",
    description:
      "The read says the honest position is no position. No-Bet is not a failure; it is a first-class outcome.",
    color: BRAND_COLORS.ionMagenta,
  },
  {
    label: "Insufficient data",
    description:
      "We do not have enough to say anything defensible. We say so plainly rather than manufacture a read.",
    color: BRAND_COLORS.orbitalCyan,
  },
] as const;

export default function AskGalaxyPage() {
  return (
    <div
      className="flex min-h-screen flex-col"
      style={{ backgroundColor: BRAND_COLORS.obsidianBlack }}
    >
      <Nav />
      <TrackView event="ask_galaxy_started" />

      <main id="main-content" className="relative flex-1 overflow-hidden">
        <ShootingStars />

        {/* ── Hero — chrome + editorial-serif headline with a violet chrome tone
            to distinguish Ask Galaxy from Founding Desk (which uses ice + cyan). */}
        <RevenueHero
          chip="Ask Galaxy — Concierge Intelligence"
          chipTone="plasma"
          headline={
            <>
              <span className="gw-chrome-violet">Send Galaxy</span>{" "}
              <span className="gse-editorial text-orbital-cyan gw-text-glow-cyan">
                one game.
              </span>
            </>
          }
          lede={
            <>
              <span className="font-display text-xl text-white">
                We classify it. You decide what to do with it.
              </span>
              <span className="mt-3 block">
                Submit one game — the matchup, what you are considering, and why. A human
                analyst (SCOUT) reads every submission and classifies it:{" "}
                <strong className="text-white">
                  action signal, caution signal, no-bet signal, or insufficient data.
                </strong>{" "}
                Honest. Never automated betting advice.
              </span>
            </>
          }
        >
          <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <Link
              href="#submit"
              className="inline-flex items-center gap-1.5 font-semibold text-orbital-cyan transition-colors hover:text-white"
            >
              Submit your game
              <span aria-hidden="true">↓</span>
            </Link>
            <span className="text-ink-500">
              {BRAND_NAME} is a sports intelligence company — not a sportsbook.
            </span>
          </div>
        </RevenueHero>

        <SignalRule className="mx-auto max-w-5xl px-4" />

        {/* ── How it works — WorldSection with "void" tone. */}
        <WorldSection
          index="01"
          eyebrow="How it works"
          title={
            <>
              Manual intelligence,{" "}
              <span className="gw-chrome-violet">every time</span>.
            </>
          }
          lede="Every submission goes to a human. No algorithm touches your game. The read you receive carries the reasoning — and the classification is always one of four honest outcomes."
          tone="void"
        >
          <Stagger className="grid grid-cols-1 gap-5 md:grid-cols-2" step={70}>
            {HOW_IT_WORKS.map((item) => (
              <article
                key={item.eyebrow}
                className="surface-card gw-card-hover relative flex flex-col gap-3 overflow-hidden p-6"
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
        </WorldSection>

        {/* ── The four classifications — the vocabulary of the read. */}
        <WorldSection
          index="02"
          eyebrow="The honest vocabulary"
          title={
            <>
              Four outcomes.{" "}
              <span className="gse-editorial text-orbital-cyan gw-text-glow-cyan">
                All of them honest.
              </span>
            </>
          }
          lede="SCOUT can only return one of these four classifications. There is no fifth category where we hedge, soften, or imply something we cannot support."
          tone="nebula"
        >
          <Stagger className="grid grid-cols-1 gap-4 sm:grid-cols-2" step={70}>
            {CLASSIFICATIONS.map((c) => (
              <article
                key={c.label}
                className="surface-card gw-card-hover flex flex-col gap-3 p-6"
              >
                <span
                  className="font-mono text-[10px] font-bold uppercase tracking-[0.22em]"
                  style={{ color: c.color }}
                >
                  {c.label}
                </span>
                <p className="text-sm leading-relaxed text-ink-300">{c.description}</p>
              </article>
            ))}
          </Stagger>
        </WorldSection>

        {/* ── The concierge form — focal point of this page. */}
        <WorldSection
          id="submit"
          index="03"
          eyebrow="Submit your game"
          title={
            <>
              One game.{" "}
              <span className="gw-chrome-violet">One honest read.</span>
            </>
          }
          lede="Fill in what you know. SCOUT will read it and classify it — honestly, even if the honest answer is insufficient data."
          tone="deep"
        >
          <Reveal delay={120}>
            {/* Premium framing: surface-card + glow atmosphere */}
            <div className="relative mx-auto max-w-3xl">
              {/* Subtle glow behind the card */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 -z-10 rounded-2xl"
                style={{
                  background: `radial-gradient(ellipse 80% 60% at 50% 0%, ${BRAND_COLORS.orbitalCyan}12, transparent 70%)`,
                }}
              />
              <div className="surface-card gw-card-hover overflow-hidden rounded-2xl">
                {/* Card header accent bar */}
                <div
                  aria-hidden="true"
                  className="h-0.5 w-full"
                  style={{
                    background: `linear-gradient(90deg, ${BRAND_COLORS.orbitalCyan}cc, ${BRAND_COLORS.softUltraviolet}66 55%, transparent)`,
                  }}
                />
                <div className="p-6 sm:p-8">
                  <AskGalaxyForm />
                </div>
              </div>
            </div>
          </Reveal>
        </WorldSection>

        <SignalRule className="mx-auto max-w-5xl px-4" />

        {/* ── Related CTAs */}
        <section className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <div className="surface-card gw-card-hover rounded-2xl p-8 text-center">
                <span className="gw-chip-cyan">Want the daily brief?</span>
                <h2 className="mt-5 font-display text-display-lg font-semibold text-balance text-white">
                  Get the{" "}
                  <span className="gse-editorial text-orbital-cyan gw-text-glow-cyan">
                    Galaxy Desk Note
                  </span>
                  .
                </h2>
                <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-ink-300">
                  The free newsletter — market signals, No-Bet Watch, and the reasoning
                  behind the reads. Sent when the brief earns it, not on a schedule.
                </p>
                <div className="mt-7 flex flex-wrap justify-center gap-4">
                  <Link href="/newsletter" className="btn btn-primary">
                    Join the Desk Note
                  </Link>
                  <Link href="/founding-desk" className="btn btn-ghost">
                    Join the Founding Desk →
                  </Link>
                </div>
                <p className="mt-6 text-xs text-ink-500">
                  Not a sportsbook. We do not accept or place wagers.{" "}
                  <Link
                    href="/responsible-play"
                    className="underline underline-offset-4 transition-colors hover:text-ink-300"
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
