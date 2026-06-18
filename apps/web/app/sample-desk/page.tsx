import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { Reveal, Stagger } from "@/components/motion/reveal";
import { SignalRule } from "@/components/motion/signal-rule";
import { BRAND_NAME, BRAND_COLORS } from "@/lib/brand";
import { TrackView } from "@/components/founding-desk/track-view";

export const metadata: Metadata = {
  title: "Sample Desk Brief — See What Founding Members Receive",
  description:
    "A representative Galaxy Desk brief so you understand exactly what Founding members read before every slate. Illustrative format — real product, sample content.",
  alternates: { canonical: "/sample-desk" },
  openGraph: {
    title: `Sample Desk Brief — ${BRAND_NAME}`,
    description:
      "Market Mirage · No-Bet Watch · Signal vs Noise · Public Narrative vs Market Pressure. Illustrative format showing the Founding Desk structure.",
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

      <main id="main-content" className="flex-1 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">

          {/* Header */}
          <Reveal>
            <div className="mb-10 text-center">
              <span
                className="inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em]"
                style={{
                  color: BRAND_COLORS.orbitalCyan,
                  borderColor: `${BRAND_COLORS.orbitalCyan}30`,
                  backgroundColor: `${BRAND_COLORS.orbitalCyan}0d`,
                }}
              >
                Sample — illustrative format
              </span>
              <h1
                className="mt-5 font-display text-balance text-white"
                style={{
                  fontSize: "clamp(2rem, 5vw, 3.8rem)",
                  lineHeight: 1.05,
                  letterSpacing: "-0.02em",
                }}
              >
                The Galaxy Desk Brief.
              </h1>
              <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-ink-300">
                This is a representative example of the daily intelligence brief
                Founding members receive. The format and recurring sections are
                real. The specific game details, figures, and lines shown below
                are illustrative — they are here to show you the structure, not
                to be traded on.
              </p>
              <p
                className="mt-3 inline-block rounded-lg border px-4 py-2 font-mono text-xs"
                style={{
                  borderColor: `${BRAND_COLORS.ionMagenta}30`,
                  color: BRAND_COLORS.ionMagenta,
                  background: `${BRAND_COLORS.ionMagenta}08`,
                }}
              >
                Sample content — not a live signal · For illustrative purposes only
              </p>
            </div>
          </Reveal>

          {/* Brief shell */}
          <Stagger className="flex flex-col gap-8" step={120}>

            {/* Section: Market Mirage */}
            <article
              className="rounded-2xl border p-7"
              style={{
                borderColor: `${BRAND_COLORS.orbitalCyan}22`,
                background: `linear-gradient(135deg, ${BRAND_COLORS.orbitalCyan}06 0%, rgba(8,6,20,0.5) 100%)`,
              }}
            >
              <header className="mb-5">
                <p
                  className="font-mono text-[10px] font-bold uppercase tracking-[0.3em]"
                  style={{ color: BRAND_COLORS.orbitalCyan }}
                >
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
                The Mirage here is that public enthusiasm reads like edge. It is
                not. Public enthusiasm is the price of admission — it is already
                priced in. The question the Desk asks is whether the remaining
                signal after you strip out the narrative justifies action. In this
                case: the data suggests the public is reacting to a home record
                that carries significant sample-size caveats. The market has
                corrected for that. The public has not.
              </p>
              <p
                className="mt-4 border-t pt-4 text-xs text-ink-500"
                style={{ borderColor: "rgba(255,255,255,0.07)" }}
              >
                Illustrative example · Not a signal or betting recommendation
              </p>
            </article>

            {/* Section: No-Bet Watch */}
            <article
              className="rounded-2xl border p-7"
              style={{
                borderColor: `${BRAND_COLORS.ionMagenta}22`,
                background: `linear-gradient(135deg, ${BRAND_COLORS.ionMagenta}06 0%, rgba(8,6,20,0.5) 100%)`,
              }}
            >
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
                Why: the injury situation in this game has three unresolved
                variables that the market has already priced into a range rather
                than a fixed number. The line spread across books spans 2.5
                points — which signals that sharp money is genuinely split, not
                that one side has edge over the other. Disagreement in the
                sharp-money layer is itself a signal. It tells the Desk that the
                information advantage is insufficient.
              </p>
              <p className="text-sm leading-relaxed text-ink-300">
                The No-Bet is not a failure. It is the discipline: we do not
                manufacture confidence where the data does not support it. The
                most expensive action is the one taken to feel like you are doing
                something. Sometimes the Desk&apos;s job is to tell you that
                tonight, the edge is in watching.
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

            {/* Section: Signal vs Noise */}
            <article
              className="rounded-2xl border p-7"
              style={{
                borderColor: `${BRAND_COLORS.softUltraviolet}22`,
                background: `linear-gradient(135deg, ${BRAND_COLORS.softUltraviolet}06 0%, rgba(8,6,20,0.5) 100%)`,
              }}
            >
              <header className="mb-5">
                <p
                  className="font-mono text-[10px] font-bold uppercase tracking-[0.3em]"
                  style={{ color: BRAND_COLORS.softUltraviolet }}
                >
                  Signal vs Noise
                </p>
                <h2 className="mt-1 font-display text-xl text-white">
                  What is real. What is media.
                </h2>
              </header>
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <p
                    className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-widest"
                    style={{ color: BRAND_COLORS.orbitalCyan }}
                  >
                    Signal
                  </p>
                  <ul className="space-y-2 text-sm leading-relaxed text-ink-300">
                    <li className="flex items-start gap-2">
                      <span style={{ color: BRAND_COLORS.orbitalCyan, marginTop: 2 }}>→</span>
                      Consistent line movement toward the road side over the past
                      36 hours — market structure shift, not noise.
                    </li>
                    <li className="flex items-start gap-2">
                      <span style={{ color: BRAND_COLORS.orbitalCyan, marginTop: 2 }}>→</span>
                      The totals market has opened soft and drawn heavy early
                      action — suggesting the opening number may have been set
                      conservatively.
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
                      <span style={{ color: BRAND_COLORS.ionMagenta, marginTop: 2 }}>—</span>
                      The &quot;hot streak&quot; narrative circulating in the sports
                      media for the home side is based on a five-game window during
                      a stretch where they faced four bottom-third defenses. The
                      streak does not generalize.
                    </li>
                    <li className="flex items-start gap-2">
                      <span style={{ color: BRAND_COLORS.ionMagenta, marginTop: 2 }}>—</span>
                      The starting time-of-possession stat being cited in preview
                      coverage reflects a sample that includes garbage-time
                      possessions. Strip those and the number halves.
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

            {/* Section: Public Narrative vs Market Pressure */}
            <article
              className="rounded-2xl border p-7"
              style={{
                borderColor: `${BRAND_COLORS.orbitalCyan}1a`,
                background: "rgba(8,6,20,0.5)",
              }}
            >
              <header className="mb-5">
                <p
                  className="font-mono text-[10px] font-bold uppercase tracking-[0.3em]"
                  style={{ color: BRAND_COLORS.orbitalCyan }}
                >
                  Public Narrative vs Market Pressure
                </p>
                <h2 className="mt-1 font-display text-xl text-white">
                  The story and the structure.
                </h2>
              </header>
              <p className="mb-4 text-sm leading-relaxed text-ink-300">
                The dominant media narrative entering tonight is about momentum:
                a team that has won four of five and &quot;looks unstoppable.&quot; This
                framing is emotionally compelling and statistically thin. Markets
                do not price momentum; they price current expected-value
                probabilities anchored to the available information. A four-of-five
                record does not move a closing line unless the underlying
                performance metrics support it.
              </p>
              <p className="text-sm leading-relaxed text-ink-300">
                What the market is actually doing: the spread on this game opened
                at 4 and has settled at 3.5 toward the team everyone expects to
                win. That half-point move against the grain of the public narrative
                is the market communicating something. The Desk&apos;s read is that
                the pressure is structural — not emotional — which is exactly the
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

          <SignalRule className="my-16" />

          {/* CTA */}
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
                This is what Founding members receive
              </p>
              <h2
                className="mt-3 font-display text-white"
                style={{
                  fontSize: "clamp(1.6rem, 3.5vw, 2.5rem)",
                  lineHeight: 1.15,
                }}
              >
                Read the Desk before the slate opens.
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-ink-300">
                Founding membership includes daily or near-daily Desk briefs in
                this format, No-Bet Watch, Signal vs Noise, Market Mirage, and the
                ability to submit one game per cycle. Founding price held for life.
              </p>
              <div className="mt-7 flex flex-wrap justify-center gap-4">
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
            </div>
          </Reveal>

        </div>
      </main>

      <Footer />
    </div>
  );
}
