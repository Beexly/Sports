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
import { TrackView } from "@/components/founding-desk/track-view";

export const metadata: Metadata = {
  title: "Sample Desk Brief — See What Founding Members Receive",
  description:
    "A representative Galaxy Desk brief so you understand exactly what Founding members read before every slate. Real format, illustrative content — not a live signal.",
  alternates: { canonical: "/sample-desk" },
  openGraph: {
    title: `Sample Desk Brief — ${BRAND_NAME}`,
    description:
      "Market Mirage · No-Bet Watch · Signal vs Noise · Public Narrative vs Market Pressure. Illustrative format showing the Founding Desk structure.",
    type: "website",
  },
};

export default function SampleDeskPage() {
  return (
    <div
      className="flex min-h-screen flex-col"
      style={{ backgroundColor: BRAND_COLORS.obsidianBlack }}
    >
      <Nav />
      <TrackView event="sample_desk_view" />

      <main id="main-content" className="relative flex-1 overflow-hidden">
        <ShootingStars />

        {/* ── Hero — chrome + serif, plasma tone, format-first positioning. */}
        <RevenueHero
          chip="Sample — illustrative format"
          chipTone="cyan"
          headline={
            <>
              <span className="gw-chrome-plasma">The Galaxy</span>{" "}
              <span className="gse-editorial text-orbital-cyan gw-text-glow-cyan">
                Desk Brief
              </span>
              .
            </>
          }
          lede={
            <>
              <span className="font-display text-xl text-white">
                The format Founding members read before every slate opens.
              </span>
              <span className="mt-3 block">
                The structure and recurring sections below are real. The specific
                game details, figures, and lines are illustrative — here to show
                you the shape of the thing, not to be traded on.{" "}
                {BRAND_NAME} is an intelligence and media company. Not a
                sportsbook. Not a tout.
              </span>
            </>
          }
        >
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <Link
              href="/founding-desk"
              className="inline-flex items-center gap-1.5 font-semibold text-orbital-cyan transition-colors hover:text-white"
            >
              Join the Founding Desk
              <span aria-hidden="true">→</span>
            </Link>
            <span
              className="inline-block rounded-lg border px-4 py-1.5 font-mono text-xs"
              style={{
                borderColor: `${BRAND_COLORS.ionMagenta}30`,
                color: BRAND_COLORS.ionMagenta,
                background: `${BRAND_COLORS.ionMagenta}08`,
              }}
            >
              Sample content · not a live signal
            </span>
          </div>
        </RevenueHero>

        {/* ── Brief artifact — four premium surface-card sections. */}
        <WorldSection
          index="01"
          eyebrow="Daily intelligence brief"
          title={
            <>
              Four sections.{" "}
              <span className="gw-chrome-ice">One read</span> before the slate.
            </>
          }
          lede="Every brief runs the same recurring structure so the read becomes a ritual rather than a scramble. Here is the full format, in the real layout — so you know exactly what you would receive."
          tone="deep"
        >
          <Stagger className="flex flex-col gap-6" step={120}>

            {/* ── 01: Market Mirage */}
            <article className="surface-card gw-card-hover overflow-hidden p-7">
              <div
                aria-hidden="true"
                className="mb-5 h-0.5 w-full rounded-full"
                style={{
                  background: `linear-gradient(90deg, ${BRAND_COLORS.orbitalCyan}cc, transparent 70%)`,
                }}
              />
              <header className="mb-5">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-orbital-cyan">
                  Market Mirage
                </p>
                <h2 className="mt-1 font-display text-xl text-white">
                  Public belief vs. market pricing.
                </h2>
              </header>
              <p className="mb-4 text-sm leading-relaxed text-ink-300">
                The public is heavily on the home side in tonight&apos;s prime
                slate game — roughly 74% of tickets on a 3-point favorite. The
                line has not moved. That gap between ticket volume and line
                stability is what the market is telling you: the books are
                comfortable holding the other side of the public position, which
                means they see something different in the structure of this game.
              </p>
              <p className="text-sm leading-relaxed text-ink-300">
                The Mirage here is that public enthusiasm reads like edge. It
                does not. Public enthusiasm is the price of admission — already
                baked into the number. The question the Desk asks is whether the
                remaining signal, once you strip out the narrative, justifies
                action. In this case: the data suggests the public is reacting
                to a home record that carries significant sample-size caveats.
                The market has corrected for that. The public has not.
              </p>
              <p
                className="mt-4 border-t pt-4 text-xs text-ink-500"
                style={{ borderColor: "rgba(255,255,255,0.07)" }}
              >
                Illustrative example · Not a signal or betting recommendation
              </p>
            </article>

            {/* ── 02: No-Bet Watch */}
            <article className="surface-card gw-card-hover overflow-hidden p-7">
              <div
                aria-hidden="true"
                className="mb-5 h-0.5 w-full rounded-full"
                style={{
                  background: `linear-gradient(90deg, ${BRAND_COLORS.ionMagenta}cc, transparent 70%)`,
                }}
              />
              <header className="mb-5">
                <p
                  className="font-mono text-[10px] font-bold uppercase tracking-[0.3em]"
                  style={{ color: BRAND_COLORS.ionMagenta }}
                >
                  No-Bet Watch
                </p>
                <h2 className="mt-1 font-display text-xl text-white">
                  The game everyone wants action on.
                </h2>
              </header>
              <p className="mb-4 text-sm leading-relaxed text-ink-300">
                Tonight&apos;s nationally televised game is drawing the most
                chatter on the slate. The Desk is watching it closely — and
                currently classifying it as a No-Bet.
              </p>
              <p className="mb-4 text-sm leading-relaxed text-ink-300">
                Why: the injury situation has three unresolved variables that the
                market has already priced into a range rather than a fixed
                number. The line spread across books spans 2.5 points — signaling
                that sharp money is genuinely split, not that one side has edge.
                Disagreement in the sharp-money layer is itself a signal: the
                information advantage is insufficient.
              </p>
              <p className="text-sm leading-relaxed text-ink-300">
                The No-Bet is not a failure. It is the discipline. The most
                expensive action is the one taken to feel like you are doing
                something. Sometimes the Desk&apos;s job is to tell you the edge
                is in watching.
              </p>
              <p
                className="mt-4 border-t pt-4 text-xs"
                style={{
                  borderColor: "rgba(255,255,255,0.07)",
                  color: BRAND_COLORS.ionMagenta,
                  opacity: 0.7,
                }}
              >
                No-Bet — the Desk declines action on this game ·{" "}
                <Link href="/no-bet" className="underline underline-offset-4">
                  Why No-Bet is a position
                </Link>
              </p>
            </article>

            {/* ── 03: Signal vs Noise */}
            <article className="surface-card gw-card-hover overflow-hidden p-7">
              <div
                aria-hidden="true"
                className="mb-5 h-0.5 w-full rounded-full"
                style={{
                  background: `linear-gradient(90deg, ${BRAND_COLORS.softUltraviolet}cc, transparent 70%)`,
                }}
              />
              <header className="mb-5">
                <p
                  className="font-mono text-[10px] font-bold uppercase tracking-[0.3em]"
                  style={{ color: BRAND_COLORS.softUltraviolet }}
                >
                  Signal vs Noise
                </p>
                <h2 className="mt-1 font-display text-xl text-white">
                  What is real. What is coverage.
                </h2>
              </header>
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <p className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-widest text-orbital-cyan">
                    Signal
                  </p>
                  <ul className="space-y-2 text-sm leading-relaxed text-ink-300">
                    <li className="flex items-start gap-2">
                      <span
                        className="mt-0.5 shrink-0 text-orbital-cyan"
                        aria-hidden="true"
                      >
                        →
                      </span>
                      Consistent line movement toward the road side over the
                      past 36 hours — market structure shift, not momentum.
                    </li>
                    <li className="flex items-start gap-2">
                      <span
                        className="mt-0.5 shrink-0 text-orbital-cyan"
                        aria-hidden="true"
                      >
                        →
                      </span>
                      The totals market opened soft and drew heavy early action
                      — suggesting the opening number was set conservatively.
                    </li>
                  </ul>
                </div>
                <div>
                  <p
                    className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-widest"
                    style={{ color: BRAND_COLORS.ionMagenta }}
                  >
                    Noise
                  </p>
                  <ul className="space-y-2 text-sm leading-relaxed text-ink-300">
                    <li className="flex items-start gap-2">
                      <span
                        className="mt-0.5 shrink-0"
                        style={{ color: BRAND_COLORS.ionMagenta }}
                        aria-hidden="true"
                      >
                        —
                      </span>
                      The &quot;hot streak&quot; narrative for the home side is
                      based on a five-game window against four bottom-third
                      defenses. The streak does not generalize.
                    </li>
                    <li className="flex items-start gap-2">
                      <span
                        className="mt-0.5 shrink-0"
                        style={{ color: BRAND_COLORS.ionMagenta }}
                        aria-hidden="true"
                      >
                        —
                      </span>
                      The starting time-of-possession stat in preview coverage
                      includes garbage-time possessions. Strip those and the
                      number halves.
                    </li>
                  </ul>
                </div>
              </div>
              <p
                className="mt-4 border-t pt-4 text-xs text-ink-500"
                style={{ borderColor: "rgba(255,255,255,0.07)" }}
              >
                Illustrative example · Not a signal or betting recommendation
              </p>
            </article>

            {/* ── 04: Public Narrative vs Market Pressure */}
            <article className="surface-card gw-card-hover overflow-hidden p-7">
              <div
                aria-hidden="true"
                className="mb-5 h-0.5 w-full rounded-full"
                style={{
                  background: `linear-gradient(90deg, ${BRAND_COLORS.orbitalCyan}55, transparent 70%)`,
                }}
              />
              <header className="mb-5">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-orbital-cyan">
                  Public Narrative vs Market Pressure
                </p>
                <h2 className="mt-1 font-display text-xl text-white">
                  The story and the structure.
                </h2>
              </header>
              <p className="mb-4 text-sm leading-relaxed text-ink-300">
                The dominant narrative entering tonight is momentum: a team that
                has won four of five and &quot;looks unstoppable.&quot; This
                framing is emotionally compelling and statistically thin. Markets
                do not price momentum; they price current expected-value
                probabilities anchored to available information. A four-of-five
                record does not move a closing line unless the underlying
                performance metrics support it.
              </p>
              <p className="text-sm leading-relaxed text-ink-300">
                What the market is actually doing: the spread on this game opened
                at 4 and has settled at 3.5 toward the team everyone expects to
                win. That half-point move against the grain of public narrative
                is the market communicating something. The Desk&apos;s read: the
                pressure is structural — not emotional — which is exactly the
                kind of gap between story and number worth paying attention to.
              </p>
              <p
                className="mt-4 border-t pt-4 text-xs text-ink-500"
                style={{ borderColor: "rgba(255,255,255,0.07)" }}
              >
                Illustrative example · Not a signal or betting recommendation
              </p>
            </article>

          </Stagger>
        </WorldSection>

        <SignalRule className="mx-auto max-w-5xl px-4" />

        {/* ── CTA — nebula-deep section. */}
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
              <span className="gw-chip-cyan">This is what Founding members receive</span>
              <h2 className="mt-6 font-display text-display-lg font-semibold leading-[1.05] text-balance text-white">
                Read the Desk before{" "}
                <span className="gse-editorial text-orbital-cyan gw-text-glow-cyan">
                  the slate opens
                </span>
                .
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-ink-300">
                Founding membership includes daily Desk briefs in this format,
                No-Bet Watch, Signal vs Noise, Market Mirage, and the ability to
                submit one game per cycle. Founding price held for life.
              </p>
            </Reveal>
            <Reveal delay={120}>
              <div className="mt-9 flex flex-wrap justify-center gap-4">
                <Link href="/founding-desk" className="btn btn-primary">
                  Join the Founding Desk →
                </Link>
                <Link href="/trust-room" className="btn btn-ghost">
                  How confidence works
                </Link>
              </div>
              <p className="mt-5 text-xs text-ink-500">
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
            </Reveal>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
