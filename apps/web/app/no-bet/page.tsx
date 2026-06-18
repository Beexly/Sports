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
    title: "Uncertainty carries a price the public does not pay.",
    body: "The public treats unresolved information as neutral — something that will clear up by game time. The market does not. When injury status, weather, or lineup information is genuinely unsettled, books widen their exposure. The disciplined response is to wait or decline, not to bet into the fog.",
    accent: BRAND_COLORS.softUltraviolet,
  },
  {
    eyebrow: "03",
    title: "The cost of unnecessary action is systematically underpriced.",
    body: "People underweight the cost of acting when uncertain. They feel worse sitting on the sideline than taking a losing position at the same expected value. The Desk is designed to counter that bias — to make the No-Bet feel like the decision it is, not the absence of one.",
    accent: BRAND_COLORS.orbitalCyan,
  },
  {
    eyebrow: "04",
    title: "Process compounds. Individual outcomes do not.",
    body: "Over a long sample, the quality of your decision-making process determines your results — not any single outcome. Preserving decision capital by avoiding thin spots is part of the process. Every No-Bet is a compounding benefit to the process, not a missed opportunity.",
    accent: BRAND_COLORS.ionMagenta,
  },
  {
    eyebrow: "05",
    title: "The market is a pressure system, not a scoreboard.",
    body: "A sharp No-Bet emerges when market consensus is genuinely split, when the signal is insufficient relative to the vig, or when public narrative is driving more ticket volume than underlying data warrants. Reading that pressure and declining to join it is a skill — and the Desk trains it.",
    accent: BRAND_COLORS.softUltraviolet,
  },
  {
    eyebrow: "06",
    title: "No-Bet Watch is a recurring Desk format.",
    body: "Every brief includes a No-Bet Watch section: the game or markets where the Desk is actively declining action, with the reasoning explained. Members understand exactly which situations triggered the signal and why — so the discipline becomes theirs over time.",
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
      "Key injury, weather, or lineup data is genuinely unsettled and market pricing does not adequately reflect the uncertainty. The information edge is not ours.",
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

      <main id="main-content" className="relative flex-1 overflow-hidden">
        <ShootingStars />

        {/* ── Hero — plasma chrome, ion-magenta accent. */}
        <RevenueHero
          chip="No-Bet Philosophy"
          chipTone="plasma"
          headline={
            <>
              <span className="gw-chrome-ice">No-Bet</span>{" "}
              <span className="gse-editorial gw-chrome-plasma">is a position</span>
              .
            </>
          }
          lede={
            <>
              <span className="font-display text-xl text-white">
                The smartest decision is often refusing action.
              </span>
              <span className="mt-3 block">
                {BRAND_NAME} treats No-Bet as a first-class product output — the
                deliberate conclusion that available signal does not justify
                committing to a side. Understanding when to decline is part of
                the discipline. The Desk trains it in every brief.
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
              href="/trust-room"
              className="inline-flex items-center gap-1.5 text-ink-300 transition-colors hover:text-white"
            >
              How confidence works
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </RevenueHero>

        {/* ── Pull quote — elevated inside a surface-card. */}
        <section className="px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <Reveal>
              <blockquote className="surface-card gw-card-hover overflow-hidden p-8">
                <div
                  aria-hidden="true"
                  className="mb-6 h-0.5 w-full rounded-full"
                  style={{
                    background: `linear-gradient(90deg, ${BRAND_COLORS.ionMagenta}cc, transparent 70%)`,
                  }}
                />
                <p
                  className="gse-editorial font-display text-2xl leading-tight text-white sm:text-3xl"
                  style={{ fontStyle: "italic" }}
                >
                  &ldquo;Picks are cheap. Decision quality compounds.&rdquo;
                </p>
                <footer className="mt-4 font-mono text-xs text-ink-500">
                  — {BRAND_NAME} operating doctrine
                </footer>
              </blockquote>
            </Reveal>
          </div>
        </section>

        {/* ── Six pillars. */}
        <WorldSection
          index="01"
          eyebrow="The philosophy"
          title={
            <>
              Six reasons No-Bet is a{" "}
              <span className="gse-editorial gw-chrome-plasma">product value</span>.
            </>
          }
          lede="Every picks service can produce a pick. The discipline is knowing when not to. Here are the six structural reasons the Desk treats declining action as a first-class output."
          tone="deep"
        >
          <Stagger
            className="grid grid-cols-1 gap-5 md:grid-cols-2"
            step={70}
          >
            {NO_BET_PILLARS.map((p) => (
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
        </WorldSection>

        <SignalRule className="mx-auto max-w-5xl px-4" />

        {/* ── Five trigger conditions. */}
        <WorldSection
          index="02"
          eyebrow="When the Desk issues No-Bet"
          title={
            <>
              Five conditions that{" "}
              <span className="gw-chrome-ice">trigger</span> decline.
            </>
          }
          lede="No-Bet is not a default. Each issue carries an explicit trigger — the structural condition the Desk identified that made declining the sharper move."
          tone="nebula"
        >
          <Stagger className="flex flex-col gap-4" step={80}>
            {WHEN_NO_BET_TRIGGERS.map((item) => (
              <div
                key={item.trigger}
                className="surface-card gw-card-hover grid gap-3 p-5 sm:grid-cols-[180px_1fr]"
                style={{ borderColor: `${BRAND_COLORS.softUltraviolet}18` }}
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
        </WorldSection>

        {/* ── Final CTA. */}
        <section className="gw-nebula-deep relative isolate overflow-hidden px-4 py-24 sm:px-6 lg:px-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[60vh]"
            style={{
              background: `radial-gradient(ellipse 60% 80% at 50% 100%, ${BRAND_COLORS.ionMagenta}14, transparent 70%)`,
            }}
          />
          <div className="mx-auto max-w-3xl text-center">
            <Reveal>
              <span className="gw-chip-plasma">Join the Founding Desk</span>
              <h2 className="mt-6 font-display text-display-lg font-semibold leading-[1.05] text-balance text-white">
                The Desk{" "}
                <span className="gse-editorial gw-chrome-plasma">trains</span>{" "}
                the discipline.
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-ink-300">
                Every Founding Desk brief includes a No-Bet Watch section — the
                games the Desk is declining to signal on, with full reasoning.
                Reading the Watch builds the same discipline in your own process.
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
