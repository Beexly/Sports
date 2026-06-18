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
    body: "Every signal carries a calibrated confidence score between 0 and 100. A score of 67 means the model has estimated a 67% probability — it also means a 33% probability of being wrong. We do not hide that math. Every public surface is built around it.",
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
    heading: "Uncertainty carries a price the public ignores.",
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

      <main id="main-content" className="relative flex-1 overflow-hidden">
        <ShootingStars />

        {/* ── Hero — violet chrome tone, authority positioning. */}
        <RevenueHero
          chip="Trust Room"
          chipTone="cyan"
          headline={
            <>
              <span className="gw-chrome-violet">We track the process</span>{" "}
              <span className="gse-editorial text-orbital-cyan gw-text-glow-cyan">
                before
              </span>{" "}
              <span className="gw-chrome-ice">we claim the outcome.</span>
            </>
          }
          lede={
            <>
              <span className="font-display text-xl text-white">
                Restraint is the trust pitch — not a weakness.
              </span>
              <span className="mt-3 block">
                {BRAND_NAME} is a sports intelligence, analytics, and
                decision-support company. Not a sportsbook. Not a tout. Not a
                gambling product dressed as analytics. This page explains how we
                build confidence, what No-Bet means, and why the operating
                honesty here is the whole point.
              </span>
            </>
          }
        >
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <Link
              href="/sample-desk"
              className="inline-flex items-center gap-1.5 font-semibold text-orbital-cyan transition-colors hover:text-white"
            >
              See a sample brief
              <span aria-hidden="true">→</span>
            </Link>
            <Link
              href="/no-bet"
              className="inline-flex items-center gap-1.5 text-ink-300 transition-colors hover:text-white"
            >
              No-Bet as a product philosophy
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </RevenueHero>

        {/* ── How confidence works — four principles, premium card grid. */}
        <WorldSection
          index="01"
          eyebrow="How confidence works"
          title={
            <>
              Four principles we{" "}
              <span className="gse-editorial gw-chrome-plasma">never</span>{" "}
              compromise.
            </>
          }
          lede="Confidence scores are the engine of the Desk — and the operating rules around them are what make the engine trustworthy. Here is how we build the number and what it actually means."
          tone="deep"
        >
          <Stagger
            className="grid grid-cols-1 gap-5 md:grid-cols-2"
            step={70}
          >
            {CONFIDENCE_PRINCIPLES.map((p) => (
              <article
                key={p.eyebrow}
                className="surface-card gw-card-hover flex flex-col gap-3 overflow-hidden p-6"
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
        </WorldSection>

        <SignalRule className="mx-auto max-w-5xl px-4" />

        {/* ── What No-Bet means — ion-magenta atmosphere. */}
        <WorldSection
          index="02"
          eyebrow="What No-Bet means"
          title={
            <>
              No-Bet is a{" "}
              <span className="gse-editorial gw-chrome-plasma">position</span>
              , not a void.
            </>
          }
          lede="The smartest decision is often refusing action. We built No-Bet as a first-class product output — not a fallback when we do not have a pick. The Desk issues No-Bet when the data says the edge is insufficient. That discipline is the product."
          tone="nebula"
        >
          <Stagger className="flex flex-col gap-5" step={90}>
            {WHAT_NO_BET_MEANS.map((item) => (
              <div
                key={item.heading}
                className="surface-card gw-card-hover p-6"
                style={{ borderColor: `${BRAND_COLORS.ionMagenta}20` }}
              >
                <div
                  className="mb-4 h-0.5 w-full rounded-full"
                  style={{
                    background: `linear-gradient(90deg, ${BRAND_COLORS.ionMagenta}99, transparent 70%)`,
                  }}
                  aria-hidden="true"
                />
                <h3 className="font-display text-lg text-white">
                  {item.heading}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-300">
                  {item.body}
                </p>
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
        </WorldSection>

        <SignalRule className="mx-auto max-w-5xl px-4" />

        {/* ── Our limitations — violet. */}
        <WorldSection
          index="03"
          eyebrow="Our limitations"
          title={
            <>
              What {BRAND_NAME}{" "}
              <span className="gw-chrome-ice">is not</span>.
            </>
          }
          lede="Naming our limitations clearly is not a legal formality. It is how a trustworthy intelligence product operates. Every item below is a structural commitment to the people who read the Desk."
          tone="void"
        >
          <Stagger className="flex flex-col gap-4" step={70}>
            {OUR_LIMITATIONS.map((item, i) => (
              <div
                key={i}
                className="surface-card gw-card-hover flex items-start gap-4 p-5"
                style={{ borderColor: `${BRAND_COLORS.softUltraviolet}18` }}
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
        </WorldSection>

        <SignalRule className="mx-auto max-w-5xl px-4" />

        {/* ── Responsible gaming posture — plain section. */}
        <section
          aria-labelledby="responsible-heading"
          className="px-4 py-20 sm:px-6 lg:px-8"
        >
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <p className="eyebrow" style={{ color: BRAND_COLORS.orbitalCyan }}>
                Responsible-gaming posture
              </p>
              <h2
                id="responsible-heading"
                className="mt-3 font-display text-display-lg font-semibold text-balance text-white"
              >
                Set limits{" "}
                <span className="gse-editorial gw-chrome-ice">before</span>{" "}
                emotion enters.
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
          </div>
        </section>

        {/* ── Final CTA. */}
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
              <span className="gw-chip-cyan">Built for the disciplined</span>
              <h2 className="mt-6 font-display text-display-lg font-semibold leading-[1.05] text-balance text-white">
                Done being sold{" "}
                <span className="gse-editorial text-orbital-cyan gw-text-glow-cyan">
                  certainty
                </span>
                .
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-ink-300">
                Confidence is not certainty. No-Bet is a position. The record is
                public. That is the operating standard — and it is the reason
                this product exists.
              </p>
            </Reveal>
            <Reveal delay={120}>
              <div className="mt-9 flex flex-wrap justify-center gap-4">
                <Link href="/founding-desk" className="btn btn-primary">
                  Join the Founding Desk →
                </Link>
                <Link href="/sample-desk" className="btn btn-ghost">
                  See a sample brief
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
