import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { Reveal, Stagger } from "@/components/motion/reveal";
import { SignalRule } from "@/components/motion/signal-rule";
import { BRAND_NAME, BRAND_COLORS } from "@/lib/brand";
import { TrackView } from "@/components/founding-desk/track-view";

export const metadata: Metadata = {
  title: "Trust Room — How Confidence Works & What No-Bet Means",
  description:
    "How Galaxy builds confidence scores, what No-Bet means, our honest limitations, and why restraint is the trust pitch — not a weakness. We track the process before we claim the outcome.",
  alternates: { canonical: "/trust-room" },
  openGraph: {
    title: `Trust Room — ${BRAND_NAME}`,
    description:
      "Confidence is not certainty. No-Bet is a position. We track the process before we claim the outcome.",
    type: "website",
  },
};

const CONFIDENCE_PRINCIPLES = [
  {
    eyebrow: "01",
    title: "Confidence is not certainty.",
    body: "Every signal carries a calibrated confidence score between 0 and 100. A score of 67 means the model has estimated a 67% probability — it also means a 33% probability of being wrong. We do not hide that math. Every public surface is designed around it.",
    accent: BRAND_COLORS.orbitalCyan,
  },
  {
    eyebrow: "02",
    title: "The score is an input, not a verdict.",
    body: "Confidence scores are one structured input among many in your decision-making process. They are not instructions. The Desk tells you what it sees; you decide what to do with it.",
    accent: BRAND_COLORS.softUltraviolet,
  },
  {
    eyebrow: "03",
    title: "We track the process before we claim the outcome.",
    body: "We do not publish a win-rate until enough settled history exists to make the number statistically defensible. Until the calibration sample is honest, the Performance page says so — explicitly. Patience over noise.",
    accent: BRAND_COLORS.ionMagenta,
  },
  {
    eyebrow: "04",
    title: "The record is public and tamper-evident.",
    body: "Every signal we publish is logged with its timestamp, the factors behind it, and the outcome once settled. Nothing is deleted. The ledger is the receipt.",
    accent: BRAND_COLORS.orbitalCyan,
  },
] as const;

const WHAT_NO_BET_MEANS = [
  {
    heading: "No-Bet is a deliberate position.",
    body: "When the Desk issues a No-Bet on a game, it is not an absence of analysis. It is a conclusion: the available signal does not meet the threshold required to justify action. Saying no requires the same rigor as saying yes.",
  },
  {
    heading: "Uncertainty has a cost.",
    body: "The market prices uncertainty differently than the public does. When the data is genuinely split, when injury information is unresolved, when the edge is too thin — the disciplined move is to preserve capital, not manufacture confidence.",
  },
  {
    heading: "Not every slate deserves action.",
    body: "Some days have clear signal. Some days are structural noise dressed as opportunity. The Desk separates them. Members who read the No-Bet Watch understand that declining action on the right game is one of the most valuable things an intelligence service can do.",
  },
] as const;

const OUR_LIMITATIONS = [
  "We are a sports intelligence and decision-support service — not a sportsbook, not a licensed betting operator, and not a personalized financial or gambling adviser.",
  "No signal we publish constitutes advice to place any specific wager. Every signal is information; how you use it is your decision.",
  "Our confidence scores are probabilistic estimates. They are calibrated over time and they can be wrong — sometimes frequently in a short sample.",
  "We do not claim a verified win-rate until the settled history makes one defensible. Until then, the calibration surface says so explicitly.",
  "Line data is sourced externally and reflects market conditions at the time of ingestion. Lines move; the signal published at ingestion time reflects the state of the market at that moment.",
  "We are not responsible for outcomes resulting from decisions made using our signals. Variance is real. Downswings happen to disciplined processes. The goal of the Desk is decision quality, not outcome manufacture.",
] as const;

export default function TrustRoomPage() {
  return (
    <div
      className="flex min-h-screen flex-col"
      style={{ backgroundColor: BRAND_COLORS.obsidianBlack }}
    >
      <Nav />
      <TrackView event="trust_room_view" />

      <main id="main-content" className="flex-1 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">

          {/* Header */}
          <Reveal>
            <div className="mb-14">
              <span
                className="inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em]"
                style={{
                  color: BRAND_COLORS.orbitalCyan,
                  borderColor: `${BRAND_COLORS.orbitalCyan}30`,
                  backgroundColor: `${BRAND_COLORS.orbitalCyan}0d`,
                }}
              >
                Trust Room
              </span>
              <h1
                className="mt-5 font-display text-balance text-white"
                style={{
                  fontSize: "clamp(2.2rem, 5.5vw, 4.4rem)",
                  lineHeight: 1.0,
                  letterSpacing: "-0.02em",
                }}
              >
                We track the process before{" "}
                <span
                  style={{
                    background: `linear-gradient(90deg, ${BRAND_COLORS.orbitalCyan} 0%, ${BRAND_COLORS.softUltraviolet} 100%)`,
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  we claim the outcome.
                </span>
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-ink-300">
                {BRAND_NAME} is a sports intelligence, analytics, and
                decision-support company. Not a sportsbook. Not a tout. Not a
                gambling product dressed as analytics. This page explains how we
                build confidence, what No-Bet means, and why the restraint is the
                trust pitch — not a weakness.
              </p>
            </div>
          </Reveal>

          {/* How confidence works */}
          <section aria-labelledby="confidence-heading">
            <Reveal>
              <p
                className="eyebrow"
                style={{ color: BRAND_COLORS.orbitalCyan }}
              >
                How confidence works
              </p>
              <h2
                id="confidence-heading"
                className="mt-3 font-display text-white"
                style={{
                  fontSize: "clamp(1.8rem, 4vw, 3rem)",
                  lineHeight: 1.1,
                  letterSpacing: "-0.01em",
                }}
              >
                Four principles we never compromise.
              </h2>
            </Reveal>

            <Stagger className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2" step={70}>
              {CONFIDENCE_PRINCIPLES.map((p) => (
                <article
                  key={p.eyebrow}
                  className="surface-card flex flex-col gap-3 overflow-hidden p-6"
                  style={{ borderColor: `${p.accent}1f` }}
                >
                  <div
                    className="mb-1 h-0.5 w-full rounded-full"
                    style={{
                      background: `linear-gradient(90deg, ${p.accent}, transparent 70%)`,
                    }}
                    aria-hidden="true"
                  />
                  <span
                    className="font-display text-3xl tabular-nums"
                    style={{ color: p.accent }}
                  >
                    {p.eyebrow}
                  </span>
                  <h3 className="font-display text-xl text-white">{p.title}</h3>
                  <p className="text-sm leading-relaxed text-ink-300">{p.body}</p>
                </article>
              ))}
            </Stagger>

            <Reveal delay={100}>
              <p className="mt-6 text-sm leading-relaxed text-ink-400">
                Want to see calibration in detail?{" "}
                <Link
                  href="/performance"
                  className="font-medium underline underline-offset-4"
                  style={{ color: BRAND_COLORS.orbitalCyan }}
                >
                  Calibration Report →
                </Link>
              </p>
            </Reveal>
          </section>

          <SignalRule className="my-16" />

          {/* What No-Bet means */}
          <section aria-labelledby="no-bet-heading">
            <Reveal>
              <p
                className="eyebrow"
                style={{ color: BRAND_COLORS.ionMagenta }}
              >
                What No-Bet means
              </p>
              <h2
                id="no-bet-heading"
                className="mt-3 font-display text-white"
                style={{
                  fontSize: "clamp(1.8rem, 4vw, 3rem)",
                  lineHeight: 1.1,
                  letterSpacing: "-0.01em",
                }}
              >
                No-Bet is a position, not a void.
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-ink-300">
                The smartest decision is often refusing action. We built No-Bet
                as a first-class product output — not a fallback when we do not
                have a pick. The Desk issues No-Bet when the data says the edge
                is insufficient. That discipline is the product.
              </p>
            </Reveal>

            <Stagger className="mt-8 flex flex-col gap-5" step={90}>
              {WHAT_NO_BET_MEANS.map((item) => (
                <div
                  key={item.heading}
                  className="rounded-2xl border p-6"
                  style={{
                    borderColor: `${BRAND_COLORS.ionMagenta}20`,
                    background: `linear-gradient(135deg, ${BRAND_COLORS.ionMagenta}06 0%, rgba(8,6,20,0.5) 100%)`,
                  }}
                >
                  <h3
                    className="font-display text-lg text-white"
                    style={{ marginBottom: 8 }}
                  >
                    {item.heading}
                  </h3>
                  <p className="text-sm leading-relaxed text-ink-300">{item.body}</p>
                </div>
              ))}
            </Stagger>

            <Reveal delay={100}>
              <p className="mt-6 text-sm leading-relaxed text-ink-400">
                Deep read:{" "}
                <Link
                  href="/no-bet"
                  className="font-medium underline underline-offset-4"
                  style={{ color: BRAND_COLORS.ionMagenta }}
                >
                  No-Bet as a product philosophy →
                </Link>
              </p>
            </Reveal>
          </section>

          <SignalRule className="my-16" />

          {/* Our limitations */}
          <section aria-labelledby="limitations-heading">
            <Reveal>
              <p
                className="eyebrow"
                style={{ color: BRAND_COLORS.softUltraviolet }}
              >
                Our limitations
              </p>
              <h2
                id="limitations-heading"
                className="mt-3 font-display text-white"
                style={{
                  fontSize: "clamp(1.8rem, 4vw, 3rem)",
                  lineHeight: 1.1,
                  letterSpacing: "-0.01em",
                }}
              >
                What {BRAND_NAME} is not.
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-ink-300">
                Naming our limitations clearly is not a legal formality. It is
                how a trustworthy intelligence product operates. We are a sports
                intelligence and media company. Here is what that means in
                practice:
              </p>
            </Reveal>

            <Stagger className="mt-8 flex flex-col gap-4" step={70}>
              {OUR_LIMITATIONS.map((item, i) => (
                <div
                  key={i}
                  className="flex items-start gap-4 rounded-xl border p-5"
                  style={{
                    borderColor: `${BRAND_COLORS.softUltraviolet}18`,
                    background: `${BRAND_COLORS.softUltraviolet}06`,
                  }}
                >
                  <span
                    aria-hidden="true"
                    className="mt-0.5 shrink-0 font-mono text-sm font-bold"
                    style={{ color: BRAND_COLORS.softUltraviolet }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <p className="text-sm leading-relaxed text-ink-300">{item}</p>
                </div>
              ))}
            </Stagger>
          </section>

          <SignalRule className="my-16" />

          {/* Responsible gaming */}
          <section aria-labelledby="responsible-heading">
            <Reveal>
              <p
                className="eyebrow"
                style={{ color: BRAND_COLORS.orbitalCyan }}
              >
                Responsible-gaming posture
              </p>
              <h2
                id="responsible-heading"
                className="mt-3 font-display text-white"
                style={{
                  fontSize: "clamp(1.8rem, 4vw, 2.8rem)",
                  lineHeight: 1.1,
                  letterSpacing: "-0.01em",
                }}
              >
                Set limits before emotion enters.
              </h2>
              <div className="mt-5 max-w-2xl space-y-4 text-base leading-7 text-ink-300">
                <p>
                  The Desk is built for people who treat sports decisions as
                  structured, disciplined choices — not emotional reactions. That
                  discipline does not eliminate variance or protect against
                  problem gambling. Nothing does except human judgment and
                  appropriate limits.
                </p>
                <p>
                  If you or someone you know is experiencing harm from sports
                  wagering or gambling, please reach out to the National Problem
                  Gambling Helpline:{" "}
                  <a
                    href="https://www.ncpgambling.org/help-treatment/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium underline underline-offset-4"
                    style={{ color: BRAND_COLORS.orbitalCyan }}
                  >
                    1-800-GAMBLER
                  </a>
                  .
                </p>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/responsible-play" className="btn btn-ghost btn-sm">
                  Responsible play resources →
                </Link>
              </div>
            </Reveal>
          </section>

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
              <h2
                className="font-display text-white"
                style={{
                  fontSize: "clamp(1.6rem, 3.5vw, 2.5rem)",
                  lineHeight: 1.15,
                }}
              >
                Built for people who are done being sold certainty.
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-ink-300">
                Confidence is not certainty. No-Bet is a position. The record is
                public. That is the operating standard.
              </p>
              <div className="mt-7 flex flex-wrap justify-center gap-4">
                <Link href="/founding-desk" className="btn btn-primary">
                  Join the Founding Desk →
                </Link>
                <Link href="/sample-desk" className="btn btn-ghost">
                  See a sample brief
                </Link>
              </div>
            </div>
          </Reveal>

        </div>
      </main>

      <Footer />
    </div>
  );
}
