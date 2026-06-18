import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { Reveal, Stagger } from "@/components/motion/reveal";
import { SignalRule } from "@/components/motion/signal-rule";
import { BRAND_NAME, BRAND_COLORS } from "@/lib/brand";
import { TrackView } from "@/components/founding-desk/track-view";

export const metadata: Metadata = {
  title: "No-Bet — Declining Action Is a Position, Not a Failure",
  description:
    "No-Bet is not a missed pick — it is a deliberate conclusion. When the data does not justify action, the discipline is to say so clearly. Six reasons No-Bet is a first-class product value at Galaxy.",
  alternates: { canonical: "/no-bet" },
  openGraph: {
    title: `No-Bet Philosophy — ${BRAND_NAME}`,
    description:
      "No-Bet is a position, not a void. Uncertainty has a price. The smartest decision is often refusing action.",
    type: "website",
  },
};

const NO_BET_PILLARS = [
  {
    eyebrow: "01",
    title: "Refusing action is not a failure of analysis.",
    body: "Most intelligence services manufacture a pick for every game because their revenue model depends on activity, not accuracy. The Desk does not. When the available information does not support a strong signal, we say so — explicitly, clearly, with the reasoning attached.",
    accent: BRAND_COLORS.ionMagenta,
  },
  {
    eyebrow: "02",
    title: "Uncertainty has a price the public does not pay.",
    body: "The public tends to treat unresolved information as neutral — something that will clear up by game time. The market does not. When injury status, weather, or lineup information is genuinely unsettled, books widen their exposure. The disciplined response is to wait or decline — not to bet into the uncertainty.",
    accent: BRAND_COLORS.softUltraviolet,
  },
  {
    eyebrow: "03",
    title: "The cost of the unnecessary action is underpriced.",
    body: "Behavioral economics has measured this clearly: people systematically underweight the cost of acting when they are uncertain. They feel worse sitting on the sideline than taking a losing position at the same expected value. The Desk is designed to counter that bias — to make the No-Bet feel like the decision it is, not the absence of one.",
    accent: BRAND_COLORS.orbitalCyan,
  },
  {
    eyebrow: "04",
    title: "Process compounds. Outcomes do not.",
    body: "Over a long sample, the quality of your decision-making process determines your results — not any individual outcome. Preserving decision capital by avoiding thin spots is part of the process. Every No-Bet is a compounding benefit to the process, not a missed opportunity.",
    accent: BRAND_COLORS.ionMagenta,
  },
  {
    eyebrow: "05",
    title: "The market is not a scoreboard. It is a pressure system.",
    body: "A sharp No-Bet emerges when the market consensus is genuinely split, when the signal is insufficient relative to the vig, or when the public narrative is driving more ticket volume than the underlying data warrants. Reading that pressure and declining to join it is a skill — and the Desk trains it.",
    accent: BRAND_COLORS.softUltraviolet,
  },
  {
    eyebrow: "06",
    title: "No-Bet Watch is a recurring Desk format.",
    body: "Every brief includes a No-Bet Watch section: the game or markets where the Desk is actively declining action, with the reasoning explained. Members understand exactly which situations triggered the signal and why — so the skill becomes theirs over time.",
    accent: BRAND_COLORS.orbitalCyan,
  },
] as const;

const WHEN_NO_BET_TRIGGERS = [
  {
    trigger: "Signal below threshold",
    description:
      "The calibrated confidence score does not clear the bar the Desk sets for actionable signal. Publishing anyway would be manufacturing certainty.",
  },
  {
    trigger: "Unresolved information",
    description:
      "Key injury, weather, or lineup data is genuinely unsettled and the market pricing does not adequately reflect the uncertainty. The information edge is not ours.",
  },
  {
    trigger: "Sharp-money split",
    description:
      "When sophisticated market participants are genuinely split, the line spread across books is wider than normal — a reliable indicator that the information advantage is insufficient on either side.",
  },
  {
    trigger: "Narrative-driven inflation",
    description:
      "The public has inflated one side based on a story rather than structure, and the available data does not support action in the implied direction or against it.",
  },
  {
    trigger: "Thin edge relative to vig",
    description:
      "Even when direction seems clear, the estimated edge is too slim to justify the cost of the transaction. Vig is a real cost; edges that barely cover it are not edges worth taking.",
  },
] as const;

export default function NoBetPage() {
  return (
    <div
      className="flex min-h-screen flex-col"
      style={{ backgroundColor: BRAND_COLORS.obsidianBlack }}
    >
      <Nav />
      <TrackView event="no_bet_page_view" />

      <main id="main-content" className="flex-1 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">

          {/* Header */}
          <Reveal>
            <div className="mb-14">
              <span
                className="inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em]"
                style={{
                  color: BRAND_COLORS.ionMagenta,
                  borderColor: `${BRAND_COLORS.ionMagenta}30`,
                  backgroundColor: `${BRAND_COLORS.ionMagenta}0d`,
                }}
              >
                No-Bet Philosophy
              </span>
              <h1
                className="mt-5 font-display text-balance text-white"
                style={{
                  fontSize: "clamp(2.2rem, 5.5vw, 4.4rem)",
                  lineHeight: 1.0,
                  letterSpacing: "-0.02em",
                }}
              >
                No-Bet is{" "}
                <span
                  style={{
                    background: `linear-gradient(90deg, ${BRAND_COLORS.ionMagenta} 0%, ${BRAND_COLORS.softUltraviolet} 100%)`,
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  a position.
                </span>
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-ink-300">
                The smartest decision is often refusing action. {BRAND_NAME}{" "}
                treats No-Bet as a first-class product output — the deliberate
                conclusion that the available signal does not justify committing
                to a side. Understanding when to decline is part of the
                discipline.
              </p>
            </div>
          </Reveal>

          {/* Pull quote */}
          <Reveal>
            <blockquote
              className="mb-14 rounded-2xl border-l-4 py-4 pl-6"
              style={{
                borderColor: BRAND_COLORS.ionMagenta,
                background: `${BRAND_COLORS.ionMagenta}08`,
              }}
            >
              <p
                className="font-display text-2xl leading-tight text-white"
                style={{ fontStyle: "italic" }}
              >
                &ldquo;Picks are cheap. Decision quality compounds.&rdquo;
              </p>
              <footer className="mt-3 font-mono text-xs text-ink-500">
                — {BRAND_NAME} operating doctrine
              </footer>
            </blockquote>
          </Reveal>

          {/* Six pillars */}
          <section aria-labelledby="pillars-heading">
            <Reveal>
              <p
                className="eyebrow"
                style={{ color: BRAND_COLORS.ionMagenta }}
              >
                The philosophy
              </p>
              <h2
                id="pillars-heading"
                className="mt-3 font-display text-white"
                style={{
                  fontSize: "clamp(1.8rem, 4vw, 3rem)",
                  lineHeight: 1.1,
                  letterSpacing: "-0.01em",
                }}
              >
                Six reasons No-Bet is a product value.
              </h2>
            </Reveal>

            <Stagger className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2" step={70}>
              {NO_BET_PILLARS.map((p) => (
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
          </section>

          <SignalRule className="my-16" />

          {/* When No-Bet triggers */}
          <section aria-labelledby="triggers-heading">
            <Reveal>
              <p
                className="eyebrow"
                style={{ color: BRAND_COLORS.softUltraviolet }}
              >
                When the Desk issues No-Bet
              </p>
              <h2
                id="triggers-heading"
                className="mt-3 font-display text-white"
                style={{
                  fontSize: "clamp(1.8rem, 4vw, 3rem)",
                  lineHeight: 1.1,
                  letterSpacing: "-0.01em",
                }}
              >
                Five conditions that trigger decline.
              </h2>
            </Reveal>

            <Stagger className="mt-8 flex flex-col gap-4" step={80}>
              {WHEN_NO_BET_TRIGGERS.map((item) => (
                <div
                  key={item.trigger}
                  className="grid gap-3 rounded-xl border p-5 sm:grid-cols-[180px_1fr]"
                  style={{
                    borderColor: `${BRAND_COLORS.softUltraviolet}18`,
                    background: `${BRAND_COLORS.softUltraviolet}06`,
                  }}
                >
                  <h3
                    className="font-mono text-xs font-bold uppercase tracking-widest"
                    style={{ color: BRAND_COLORS.softUltraviolet }}
                  >
                    {item.trigger}
                  </h3>
                  <p className="text-sm leading-relaxed text-ink-300">
                    {item.description}
                  </p>
                </div>
              ))}
            </Stagger>
          </section>

          <SignalRule className="my-16" />

          {/* CTA */}
          <Reveal>
            <div
              className="rounded-2xl border p-8 text-center"
              style={{
                borderColor: `${BRAND_COLORS.ionMagenta}22`,
                background: `radial-gradient(ellipse 60% 80% at 50% 100%, ${BRAND_COLORS.ionMagenta}08, transparent 70%)`,
              }}
            >
              <h2
                className="font-display text-white"
                style={{
                  fontSize: "clamp(1.6rem, 3.5vw, 2.5rem)",
                  lineHeight: 1.15,
                }}
              >
                The Desk trains the discipline.
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-ink-300">
                Every Founding Desk brief includes a No-Bet Watch section — the
                games the Desk is declining to signal on, with full reasoning.
                Over time, reading the Watch trains the same discipline in your
                own process.
              </p>
              <div className="mt-7 flex flex-wrap justify-center gap-4">
                <Link href="/founding-desk" className="btn btn-primary">
                  Join the Founding Desk →
                </Link>
                <Link href="/sample-desk" className="btn btn-ghost">
                  See a sample brief
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
