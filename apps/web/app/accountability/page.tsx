/**
 * /accountability — public accountability front door.
 *
 * This page does NOT fabricate stats. It links and re-renders surfaces that
 * already exist with their own freshness stamps:
 *   - /performance/losses  (Hall of Misses — public loss autopsies)
 *   - /performance         (Calibration Report / Honest Band)
 *   - /changelog           (model versions, gate flips, ship log)
 *
 * Voice: the desk voice — direct, human, no marketing filler.
 * See lib/voice/analyst-standard.ts for BANNED_ANALYST_PHRASES.
 *
 * Source commitment: docs/strategy/platform-gaps-triage.md gap #14/21
 */

import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { Reveal, Stagger } from "@/components/motion/reveal";
import { RiskDisclosure } from "@/components/ui/risk-disclosure";
import { Atmosphere } from "@/components/ui/atmosphere";
import { GeneratedPlate } from "@/components/immersive/generated-plate";
import { BRAND_NAME, BRAND_COLORS } from "@/lib/brand";

export const metadata: Metadata = {
  title: `Accountability — ${BRAND_NAME}`,
  description:
    "We grade ourselves in public. Losses get autopsies. The model is versioned and every version is logged. Nothing is hidden to make the record look cleaner.",
  alternates: { canonical: "/accountability" },
  openGraph: {
    title: `Accountability — ${BRAND_NAME}`,
    description:
      "Public accountability page. Loss autopsies, calibration report, and the model changelog — all linked here. No cherry-picking.",
    url: "/accountability",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: `Accountability — ${BRAND_NAME}`,
    description:
      "Losses get autopsies. The model is versioned. The record is public.",
  },
};

const CARDS = [
  {
    eyebrow: "Loss autopsies",
    title: "Hall of Misses",
    body: "Every published non-bootstrap pick that settled as a loss is in the Loss Room. Post-mortems attach when operator review is complete. The original reasoning and signal snapshot stay visible regardless.",
    href: "/performance/losses",
    linkLabel: "Open the Loss Room",
    accent: BRAND_COLORS.ionMagenta,
  },
  {
    eyebrow: "Calibration report",
    title: "Honest Band",
    body: "The calibration report includes every settled canonical pick. Bootstrap-era picks are excluded by design — they do not get to inflate the record. Win rate stays gated until enough settled history exists to publish a number that is honest.",
    href: "/performance",
    linkLabel: "View Calibration Report",
    accent: BRAND_COLORS.orbitalCyan,
  },
  {
    eyebrow: "Closing line value",
    title: "Beat the close",
    body: "The sharp-credible leading indicator of edge: whether the price we locked beat where the market closed — the one number tout services never show. Published under the same gate as the win rate, with no number shown before it can be honestly backed.",
    href: "/clv",
    linkLabel: "See our CLV",
    accent: BRAND_COLORS.orbitalCyan,
  },
  {
    eyebrow: "Model changelog",
    title: "Ship log",
    body: "Every model version, gate flip, and calibration update is logged publicly with a date and a reason. The changelog is how the record stays readable over time — not just a snapshot of where things stand today.",
    href: "/changelog",
    linkLabel: "Read the Changelog",
    accent: BRAND_COLORS.softUltraviolet,
  },
  {
    eyebrow: "Tamper-evident record",
    title: "Proof of Record",
    body: "Every settled pick carries a Merkle leaf hash stamped at generation time. Change a pick after the fact and the hash breaks. The Merkle root over all settled picks is published publicly so anyone can re-derive it and verify the record.",
    href: "/proof",
    linkLabel: "View Proof of Record",
    accent: BRAND_COLORS.softUltraviolet,
  },
] as const;

const COMMITMENTS = [
  "No pick is removed from the ledger once settled — wins and losses stay.",
  "Bootstrap-era picks are excluded from the win-rate denominator and labelled as such.",
  "Post-mortems are written by the operator, not generated — they go through review before publishing.",
  "Model versions are semantic and auditable — every settled pick carries the version that produced it.",
  "The calibration gate does not open until the settled sample is large enough to publish a number that is honest.",
] as const;

export default function AccountabilityPage() {
  return (
    <div
      className="flex min-h-screen flex-col"
      style={{ backgroundColor: BRAND_COLORS.obsidianBlack }}
    >
      <Atmosphere />
      <Nav />

      <main id="main-content" className="flex-1">
        {/* Cinematic hero */}
        <section className="relative isolate overflow-hidden px-4 pb-14 pt-24 sm:px-6 lg:px-8">
          <GeneratedPlate assetId="accountability-steady" className="-z-20 opacity-55" />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[28rem]"
            style={{
              background: `radial-gradient(50% 70% at 50% 0%, ${BRAND_COLORS.orbitalCyan}12, transparent 65%), radial-gradient(35% 50% at 85% 15%, ${BRAND_COLORS.softUltraviolet}0c, transparent 60%)`,
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
                Accountability
              </span>
            </Reveal>
            <Reveal delay={90}>
              <h1
                className="mt-5 max-w-4xl font-display text-balance text-white"
                style={{
                  fontSize: "clamp(2.4rem, 6vw, 4.5rem)",
                  lineHeight: 1.0,
                  letterSpacing: "-0.02em",
                }}
              >
                We grade ourselves{" "}
                <span
                  style={{
                    background: `linear-gradient(90deg, ${BRAND_COLORS.orbitalCyan} 0%, ${BRAND_COLORS.softUltraviolet} 100%)`,
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  in public.
                </span>
              </h1>
            </Reveal>
            <Reveal delay={170}>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-ink-300">
                Losses get autopsies. The model is versioned. Every gate flip and
                calibration update is logged with a date. Nothing is quietly removed
                to make the record look cleaner — if a pick lost, it stays in the
                ledger and it gets a post-mortem when review is complete.
              </p>
            </Reveal>
            <Reveal delay={240}>
              <p className="mt-3 text-sm leading-7 text-ink-400">
                The credibility of every future pick depends on the integrity of the
                existing record. That is the only reason transparency is worth doing.
              </p>
            </Reveal>
          </div>
        </section>

        {/* Accountability surfaces */}
        <section className="px-4 py-8 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <Stagger className="grid gap-5 sm:grid-cols-1 lg:grid-cols-3" step={80}>
              {CARDS.map((card) => (
                <div
                  key={card.title}
                  className="flex flex-col gap-4 rounded-2xl border p-6 transition-shadow hover:shadow-[0_0_28px_rgba(0,0,0,0.5)]"
                  style={{
                    borderColor: `${card.accent}22`,
                    background: `linear-gradient(135deg, ${card.accent}06 0%, rgba(18,14,36,0.8) 100%)`,
                  }}
                >
                  {/* Top accent */}
                  <div
                    className="h-0.5 w-full rounded-full"
                    style={{ background: `linear-gradient(90deg, ${card.accent}, transparent 70%)` }}
                    aria-hidden="true"
                  />
                  <p
                    className="font-mono text-[10px] uppercase tracking-[0.2em]"
                    style={{ color: card.accent }}
                  >
                    {card.eyebrow}
                  </p>
                  <h2 className="text-xl font-bold text-white">{card.title}</h2>
                  <p className="flex-1 text-sm leading-6 text-ink-300">{card.body}</p>
                  <Link
                    href={card.href}
                    className="mt-auto inline-flex items-center self-start rounded-lg border px-4 py-2 text-sm font-semibold transition-colors hover:bg-white/5"
                    style={{
                      borderColor: `${card.accent}40`,
                      color: card.accent,
                    }}
                  >
                    {card.linkLabel}
                  </Link>
                </div>
              ))}
            </Stagger>
          </div>
        </section>

        {/* What these sections cover */}
        <section className="px-4 py-8 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <div
                className="rounded-2xl border p-6"
                style={{
                  borderColor: "rgba(255,255,255,0.07)",
                  background: "rgba(255,255,255,0.02)",
                }}
              >
                <p
                  className="mb-5 font-mono text-[10px] uppercase tracking-[0.2em]"
                  style={{ color: BRAND_COLORS.orbitalCyan }}
                >
                  What these surfaces cover
                </p>
                <dl className="grid grid-cols-1 gap-5 text-sm sm:grid-cols-3">
                  {[
                    {
                      term: "Loss autopsies",
                      def: "Root-cause analysis, signal snapshot, model version, what we saw vs. what happened, and what changed afterward.",
                    },
                    {
                      term: "Calibration",
                      def: "Win rate by sport, push rate, sample size, Honest Band (uncertainty range), and the methodology behind the numbers.",
                    },
                    {
                      term: "Model versions",
                      def: "Every pick carries a model version tag. The changelog links those tags to what changed in the scoring logic.",
                    },
                  ].map((item) => (
                    <div key={item.term} className="flex flex-col gap-1.5">
                      <dt className="font-semibold text-white">{item.term}</dt>
                      <dd className="text-ink-300">{item.def}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </Reveal>
          </div>
        </section>

        {/* The commitment */}
        <section className="px-4 pb-16 pt-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <div
                className="rounded-2xl border p-6"
                style={{
                  borderColor: `${BRAND_COLORS.orbitalCyan}18`,
                  background: `radial-gradient(ellipse 60% 40% at 50% 100%, ${BRAND_COLORS.orbitalCyan}08, transparent 70%)`,
                }}
              >
                <p
                  className="mb-4 font-mono text-[10px] uppercase tracking-[0.2em]"
                  style={{ color: BRAND_COLORS.orbitalCyan }}
                >
                  The commitment
                </p>
                <ul className="flex flex-col gap-3">
                  {COMMITMENTS.map((line) => (
                    <li key={line} className="flex items-start gap-3 text-sm leading-6">
                      <span
                        className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ backgroundColor: BRAND_COLORS.orbitalCyan }}
                        aria-hidden="true"
                      />
                      <span className="text-ink-300">{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        </section>

        {/* Cross-links — direct hrefs preserved for link integrity */}
        <div className="mx-auto max-w-5xl px-4 pb-8 sm:px-6 lg:px-8">
          <Reveal>
            <div className="flex flex-wrap gap-3 text-sm">
              <Link href="/performance" className="rounded-lg border px-4 py-2 text-ink-300 transition-colors hover:border-orbital-cyan/30 hover:text-white" style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.025)" }}>
                Calibration Report →
              </Link>
              <Link href="/performance/losses" className="rounded-lg border px-4 py-2 text-ink-300 transition-colors hover:border-orbital-cyan/30 hover:text-white" style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.025)" }}>
                Hall of Misses →
              </Link>
              <Link href="/proof" className="rounded-lg border px-4 py-2 text-ink-300 transition-colors hover:border-orbital-cyan/30 hover:text-white" style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.025)" }}>
                Proof of Record →
              </Link>
              <Link href="/clv" className="rounded-lg border px-4 py-2 text-ink-300 transition-colors hover:border-orbital-cyan/30 hover:text-white" style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.025)" }}>
                CLV →
              </Link>
              <Link href="/changelog" className="rounded-lg border px-4 py-2 text-ink-300 transition-colors hover:border-orbital-cyan/30 hover:text-white" style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.025)" }}>
                Changelog →
              </Link>
            </div>
          </Reveal>
        </div>
        <div className="mx-auto max-w-5xl px-4 pb-20 sm:px-6 lg:px-8">
          <RiskDisclosure variant="compact" className="text-center" />
        </div>
      </main>

      <Footer />
    </div>
  );
}
