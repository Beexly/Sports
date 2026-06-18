import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { Reveal, Stagger } from "@/components/motion/reveal";
import { ShootingStars } from "@/components/motion/shooting-stars";
import { SignalRule } from "@/components/motion/signal-rule";
import { WorldSection } from "@/components/world/world-section";
import { RevenueHero } from "@/components/revenue/revenue-hero";
import { CountUp } from "@/components/ui/count-up";
import { BRAND_NAME, BRAND_COLORS } from "@/lib/brand";
import { NewsletterForm } from "@/components/founding-desk/newsletter-form";
import { TrackView } from "@/components/founding-desk/track-view";

export const metadata: Metadata = {
  title: `Galaxy Desk Note — Free Sports Intelligence Newsletter`,
  description:
    "The Galaxy Desk Note delivers market signals, No-Bet Watch, and the reasoning behind every read — free, in your inbox. Sent when the brief earns it, not on a mechanical schedule.",
  alternates: { canonical: "/newsletter" },
  openGraph: {
    title: `Galaxy Desk Note — ${BRAND_NAME}`,
    description:
      "Join the free newsletter. Market signals, No-Bet Watch, and the reasoning — no spam, sent when the brief earns it.",
    type: "website",
  },
};

/**
 * What the Desk Note is — the substance, explained before the signup ask.
 * Each item is a real deliverable that appears in the brief.
 */
const WHAT_YOU_GET = [
  {
    eyebrow: "01",
    title: "Market signals, not noise",
    body: "What the market is pricing, where public narrative diverges from line movement, and what that gap may mean for a read. Signal only — no filler, no commentary for commentary's sake.",
    accent: BRAND_COLORS.orbitalCyan,
  },
  {
    eyebrow: "02",
    title: "No-Bet Watch",
    body: "The game everyone wants action on — and a structured look at why declining that action might be the sharper move. No-Bet is a first-class position in the Desk Note, not a footnote.",
    accent: BRAND_COLORS.softUltraviolet,
  },
  {
    eyebrow: "03",
    title: "Reasoning attached",
    body: "Every read comes with the logic that produced it. You see the data reference, the line movement read, and the confidence level — not just a conclusion you are asked to trust without evidence.",
    accent: BRAND_COLORS.ionMagenta,
  },
  {
    eyebrow: "04",
    title: "Sent when it earns it",
    body: "The Desk Note is not on a mechanical schedule. It goes out when there is a real read worth sending. When the brief does not earn it, we do not manufacture one to fill a slot.",
    accent: BRAND_COLORS.orbitalCyan,
  },
] as const;

/**
 * The operating honesty of the Desk Note — in the same spirit as the Founding
 * Desk honesty section, but lighter, appropriate to a free newsletter.
 */
const WHAT_WE_DO_NOT_DO = [
  "We do not send a Desk Note just to hit a schedule — only when there is a real read.",
  "We do not assert a win-rate the record does not yet support. When a number is not defensible, we say so.",
  "We do not give personalized gambling advice. The Desk Note is intelligence to read and reason with.",
  "We do not operate a sportsbook or accept wagers. We are a media and intelligence company.",
] as const;

export default function NewsletterPage() {
  return (
    <div
      className="flex min-h-screen flex-col"
      style={{ backgroundColor: BRAND_COLORS.obsidianBlack }}
    >
      <Nav />
      <TrackView event="email_signup_started" />

      <main id="main-content" className="relative flex-1 overflow-hidden">
        <ShootingStars />

        {/* ── Hero — ice chrome tone to differentiate from Ask Galaxy (violet)
            and Founding Desk (ice + cyan accent on the chip). The Desk Note
            owns the ice + violet accent pairing here. */}
        <RevenueHero
          chip="Galaxy Desk Note — Free Newsletter"
          chipTone="cyan"
          headline={
            <>
              <span className="gw-chrome-ice">The brief,</span>{" "}
              <span className="gse-editorial text-orbital-cyan gw-text-glow-cyan">
                in your inbox.
              </span>
            </>
          }
          lede={
            <>
              <span className="font-display text-xl text-white">
                Market signals. No-Bet Watch. Reasoning attached.
              </span>
              <span className="mt-3 block">
                The Galaxy Desk Note is the free version of the intelligence ritual.
                It arrives when the brief is worth sending — not on a schedule. When there
                is a real read, you get it. When there is not, we do not manufacture one.
              </span>
            </>
          }
        >
          {/* Signup above the fold — the primary CTA for this page */}
          <div className="mt-8 max-w-2xl">
            <div className="relative">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 -z-10 rounded-2xl"
                style={{
                  background: `radial-gradient(ellipse 80% 60% at 50% 0%, ${BRAND_COLORS.orbitalCyan}10, transparent 70%)`,
                }}
              />
              <div className="surface-card gw-card-hover overflow-hidden rounded-2xl">
                <div
                  aria-hidden="true"
                  className="h-0.5 w-full"
                  style={{
                    background: `linear-gradient(90deg, ${BRAND_COLORS.orbitalCyan}cc, ${BRAND_COLORS.softUltraviolet}55 60%, transparent)`,
                  }}
                />
                <div className="p-6">
                  <p className="mb-4 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-orbital-cyan">
                    Join the Galaxy Desk Note — free
                  </p>
                  <NewsletterForm source="newsletter-page-hero" />
                </div>
              </div>
            </div>
          </div>
        </RevenueHero>

        {/* ── Stat band — real claim, no fabricated numbers */}
        <section className="border-y border-white/5 px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <div className="grid grid-cols-1 gap-8 text-center sm:grid-cols-3">
                <div className="flex flex-col gap-1">
                  <span className="font-display text-display-lg font-semibold text-white">
                    <CountUp value={4} suffix=" sections" />
                  </span>
                  <span className="text-sm text-ink-400">per Desk Note issue</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="font-display text-display-lg font-semibold text-white">
                    <CountUp value={0} suffix=" spam" />
                  </span>
                  <span className="text-sm text-ink-400">sent when the brief earns it</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="font-display text-display-lg font-semibold text-white">
                    <CountUp value={7} suffix=" sports" />
                  </span>
                  <span className="text-sm text-ink-400">covered across the brief</span>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        <SignalRule className="mx-auto max-w-5xl px-4" />

        {/* ── What the Desk Note delivers — WorldSection */}
        <WorldSection
          index="01"
          eyebrow="What the Desk Note delivers"
          title={
            <>
              Intelligence,{" "}
              <span className="gse-editorial gw-chrome-violet">not filler</span>.
            </>
          }
          lede="Every issue of the Desk Note runs the same four sections. The structure is permanent; only the game changes. You know exactly what you are reading before you open it."
          tone="void"
        >
          <Stagger className="grid grid-cols-1 gap-5 md:grid-cols-2" step={70}>
            {WHAT_YOU_GET.map((item) => (
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

        {/* ── Operating honesty — the Desk Note's restraint list */}
        <WorldSection
          index="02"
          eyebrow="How the Desk Note operates"
          title={
            <>
              The restraint is{" "}
              <span className="gse-editorial text-orbital-cyan gw-text-glow-cyan">
                the product
              </span>
              .
            </>
          }
          lede="The Desk Note earns your attention by saying less, more carefully. These are the lines we do not cross — by design, not by accident."
          tone="nebula"
        >
          <Stagger className="grid grid-cols-1 gap-4 md:grid-cols-2" step={70}>
            {WHAT_WE_DO_NOT_DO.map((item, i) => (
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
        </WorldSection>

        {/* ── Step up CTA */}
        <section className="gw-nebula-deep relative isolate overflow-hidden px-4 py-24 sm:px-6 lg:px-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[60vh]"
            style={{
              background: `radial-gradient(ellipse 60% 80% at 50% 100%, ${BRAND_COLORS.softUltraviolet}14, transparent 70%)`,
            }}
          />
          <div className="mx-auto max-w-3xl text-center">
            <Reveal>
              <span className="gw-chip-plasma">Step up to the full brief</span>
              <h2 className="mt-6 font-display text-display-lg font-semibold leading-[1.05] text-balance text-white">
                Galaxy Founding Desk —{" "}
                <span className="gse-editorial gw-chrome-violet">
                  the complete intelligence ritual.
                </span>
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-ink-300">
                Founding Desk members receive the full daily brief — Market Mirage,
                No-Bet Watch, Signal vs Noise, Narrative vs Pressure — plus the ability
                to submit one game per cycle to SCOUT. Founding pricing is held for the
                life of your membership.
              </p>
            </Reveal>

            <Reveal delay={120}>
              <div className="mt-9 flex flex-wrap justify-center gap-4">
                <Link href="/founding-desk" className="btn btn-primary">
                  Join the Founding Desk
                </Link>
                <Link href="/ask-galaxy" className="btn btn-ghost">
                  Submit a game to Galaxy →
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
            </Reveal>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
