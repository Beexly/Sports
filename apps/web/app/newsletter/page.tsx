import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { Reveal, Stagger } from "@/components/motion/reveal";
import { ShootingStars } from "@/components/motion/shooting-stars";
import { SignalRule } from "@/components/motion/signal-rule";
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

const WHAT_YOU_GET = [
  {
    eyebrow: "01",
    title: "Market signals, not noise",
    body: "What the market is pricing, where public narrative diverges from line movement, and what that gap may mean. Signal only — no filler.",
    accent: BRAND_COLORS.orbitalCyan,
  },
  {
    eyebrow: "02",
    title: "No-Bet Watch",
    body: "The game everyone wants action on — and a structured look at why declining that action might be the sharper move. No-Bet is a first-class position.",
    accent: BRAND_COLORS.softUltraviolet,
  },
  {
    eyebrow: "03",
    title: "Reasoning attached",
    body: "Every read comes with the reasoning. You see the logic, the data reference, and the confidence level — not just a conclusion you are asked to trust.",
    accent: BRAND_COLORS.ionMagenta,
  },
  {
    eyebrow: "04",
    title: "Sent when it earns it",
    body: "Not on a mechanical schedule. The Desk Note goes out when the brief is worth sending — when there is a real read that deserves your attention.",
    accent: BRAND_COLORS.orbitalCyan,
  },
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

        {/* Hero */}
        <section className="relative px-4 pb-20 pt-28 sm:px-6 lg:px-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[70vh]"
            style={{
              background: `radial-gradient(55% 60% at 50% 0%, ${BRAND_COLORS.softUltraviolet}1a, transparent 70%), radial-gradient(40% 50% at 75% 0%, ${BRAND_COLORS.orbitalCyan}12, transparent 70%)`,
            }}
          />
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <span
                className="inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em]"
                style={{
                  color: BRAND_COLORS.softUltraviolet,
                  borderColor: `${BRAND_COLORS.softUltraviolet}30`,
                  backgroundColor: `${BRAND_COLORS.softUltraviolet}0d`,
                }}
              >
                Galaxy Desk Note — Free Newsletter
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
                The brief,{" "}
                <span
                  style={{
                    background: `linear-gradient(90deg, ${BRAND_COLORS.softUltraviolet} 0%, ${BRAND_COLORS.orbitalCyan} 100%)`,
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  in your inbox.
                </span>
              </h1>
            </Reveal>

            <Reveal delay={160}>
              <p
                className="mt-5 font-display text-xl text-white"
                style={{ opacity: 0.85 }}
              >
                Market signals. No-Bet Watch. Reasoning attached.
              </p>
              <p className="mt-3 max-w-2xl text-lg leading-8 text-ink-300">
                The Galaxy Desk Note is the free version of the intelligence
                ritual. It arrives when the brief is worth sending — not on a
                schedule. When there is a real read, you get it. When there
                is not, we do not manufacture one.
              </p>
            </Reveal>

            <Reveal delay={240}>
              <p className="mt-4 max-w-xl text-base leading-7 text-ink-300">
                {BRAND_NAME} is a sports intelligence and media company — not a
                sportsbook. The Desk Note is intelligence: you decide what to do
                with it.
              </p>
            </Reveal>

            {/* Signup form in hero */}
            <Reveal delay={320}>
              <div
                className="mt-10 max-w-2xl rounded-2xl border p-6"
                style={{
                  borderColor: `${BRAND_COLORS.softUltraviolet}22`,
                  background: `${BRAND_COLORS.obsidianBlack}cc`,
                }}
              >
                <NewsletterForm source="newsletter-page" />
              </div>
            </Reveal>
          </div>
        </section>

        <SignalRule className="mx-auto max-w-5xl px-4" />

        {/* What you get */}
        <section className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <p
                className="eyebrow"
                style={{ color: BRAND_COLORS.softUltraviolet }}
              >
                What the Desk Note delivers
              </p>
              <h2
                className="mt-3 font-display text-white"
                style={{
                  fontSize: "clamp(1.8rem, 4vw, 3rem)",
                  lineHeight: 1.1,
                  letterSpacing: "-0.01em",
                }}
              >
                Intelligence, not filler.
              </h2>
            </Reveal>

            <Stagger className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2" step={70}>
              {WHAT_YOU_GET.map((item) => (
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

        {/* CTA repeat */}
        <section className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
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
                  Step up to the full brief
                </p>
                <h2
                  className="mt-3 font-display text-white"
                  style={{
                    fontSize: "clamp(1.6rem, 3.5vw, 2.5rem)",
                    lineHeight: 1.15,
                  }}
                >
                  Galaxy Founding Desk — the complete intelligence ritual.
                </h2>
                <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-ink-300">
                  Founding Desk members receive the full daily brief — Market
                  Mirage, No-Bet Watch, Signal vs Noise, and the ability to
                  submit one game per cycle. Founding pricing is held for the
                  life of your membership.
                </p>
                <div className="mt-7 flex flex-wrap justify-center gap-4">
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
