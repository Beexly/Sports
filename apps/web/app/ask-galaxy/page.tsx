import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { Reveal, Stagger } from "@/components/motion/reveal";
import { ShootingStars } from "@/components/motion/shooting-stars";
import { SignalRule } from "@/components/motion/signal-rule";
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

        {/* Hero */}
        <section className="relative px-4 pb-20 pt-28 sm:px-6 lg:px-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[70vh]"
            style={{
              background: `radial-gradient(55% 60% at 50% 0%, ${BRAND_COLORS.orbitalCyan}1a, transparent 70%), radial-gradient(40% 50% at 75% 0%, ${BRAND_COLORS.softUltraviolet}12, transparent 70%)`,
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
                Ask Galaxy — Concierge Intelligence
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
                Send Galaxy{" "}
                <span
                  style={{
                    background: `linear-gradient(90deg, ${BRAND_COLORS.orbitalCyan} 0%, ${BRAND_COLORS.softUltraviolet} 100%)`,
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  one game.
                </span>
              </h1>
            </Reveal>

            <Reveal delay={160}>
              <p
                className="mt-5 font-display text-xl text-white"
                style={{ opacity: 0.85 }}
              >
                We classify it. You decide what to do with it.
              </p>
              <p className="mt-3 max-w-2xl text-lg leading-8 text-ink-300">
                Submit one game — the matchup, what you are considering, and
                why. A human analyst (SCOUT) reads every submission and
                classifies it:{" "}
                <strong className="text-white">
                  action signal, caution signal, no-bet signal, or insufficient
                  data.
                </strong>{" "}
                Honest. Never automated betting advice.
              </p>
            </Reveal>

            <Reveal delay={240}>
              <p className="mt-4 max-w-xl text-base leading-7 text-ink-300">
                {BRAND_NAME} is a sports intelligence and media company — not a
                sportsbook, not a tout service. The classification is a read.
                What you do with it is your decision.
              </p>
            </Reveal>
          </div>
        </section>

        <SignalRule className="mx-auto max-w-5xl px-4" />

        {/* How it works */}
        <section className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <p
                className="eyebrow"
                style={{ color: BRAND_COLORS.orbitalCyan }}
              >
                How it works
              </p>
              <h2
                className="mt-3 font-display text-white"
                style={{
                  fontSize: "clamp(1.8rem, 4vw, 3rem)",
                  lineHeight: 1.1,
                  letterSpacing: "-0.01em",
                }}
              >
                Manual intelligence, every time.
              </h2>
            </Reveal>

            <Stagger className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2" step={70}>
              {HOW_IT_WORKS.map((item) => (
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

        {/* The form */}
        <section className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <Reveal>
              <p
                className="eyebrow"
                style={{ color: BRAND_COLORS.orbitalCyan }}
              >
                Submit your game
              </p>
              <h2
                className="mt-3 font-display text-white"
                style={{
                  fontSize: "clamp(1.8rem, 4vw, 2.8rem)",
                  lineHeight: 1.1,
                  letterSpacing: "-0.01em",
                }}
              >
                One game. One honest read.
              </h2>
              <p className="mt-4 max-w-xl text-base leading-7 text-ink-300">
                Fill in what you know. SCOUT will read it and classify it —
                honestly, even if the honest answer is insufficient data.
              </p>
            </Reveal>

            <Reveal delay={120}>
              <div
                className="mt-10 rounded-2xl border p-6 sm:p-8"
                style={{
                  borderColor: `${BRAND_COLORS.orbitalCyan}20`,
                  background: `${BRAND_COLORS.obsidianBlack}cc`,
                }}
              >
                <AskGalaxyForm />
              </div>
            </Reveal>
          </div>
        </section>

        <SignalRule className="mx-auto max-w-5xl px-4" />

        {/* Related CTAs */}
        <section className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <div
                className="rounded-2xl border p-8 text-center"
                style={{
                  borderColor: `${BRAND_COLORS.softUltraviolet}22`,
                  background: `radial-gradient(ellipse 60% 80% at 50% 100%, ${BRAND_COLORS.softUltraviolet}08, transparent 70%)`,
                }}
              >
                <p
                  className="font-mono text-[10px] font-bold uppercase tracking-[0.3em]"
                  style={{ color: BRAND_COLORS.softUltraviolet }}
                >
                  Want the daily brief?
                </p>
                <h2
                  className="mt-3 font-display text-white"
                  style={{
                    fontSize: "clamp(1.6rem, 3.5vw, 2.5rem)",
                    lineHeight: 1.15,
                  }}
                >
                  Get the Galaxy Desk Note.
                </h2>
                <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-ink-300">
                  The free newsletter — market signals, No-Bet Watch, and the
                  reasoning behind the reads. No spam; sent when the brief is
                  worth sending.
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
