import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { Reveal, Stagger } from "@/components/motion/reveal";
import { SignalRule } from "@/components/motion/signal-rule";
import { WorldSection } from "@/components/world/world-section";
import { RevenueHero } from "@/components/revenue/revenue-hero";
import { BRAND_NAME, BRAND_COLORS, SUPPORT_EMAIL } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Galaxy Desk Podcast — Sports Intelligence Audio",
  description:
    "The Galaxy Desk Podcast: 12–18 minutes per episode, five structured segments. Market Mirage, No-Bet Watch, one matchup signal, one public-narrative correction, and what we are not claiming yet. Building now.",
  alternates: { canonical: "/podcast" },
  openGraph: {
    title: `Galaxy Desk Podcast — ${BRAND_NAME}`,
    description:
      "The audio version of the Galaxy Desk brief. Market Mirage, No-Bet Watch, matchup signals, and public-narrative corrections. Episodes coming soon.",
    type: "website",
  },
};

const SEGMENT_FORMAT = [
  {
    label: "Market Mirage",
    desc: "What the public believes versus what market pricing implies. The gap is where the signal lives, and this segment names it plainly.",
    accent: BRAND_COLORS.orbitalCyan,
  },
  {
    label: "No-Bet Watch",
    desc: "The game everyone is talking about — and a structured look at why declining that action might be the sharpest position this week.",
    accent: BRAND_COLORS.softUltraviolet,
  },
  {
    label: "One Matchup Signal",
    desc: "One game, looked at in depth. Not a pick. A structured read: the market, the line, the pressure, and what it might mean.",
    accent: BRAND_COLORS.ionMagenta,
  },
  {
    label: "Public-Narrative Correction",
    desc: "One story the sports media has gotten wrong this week — or at least complicated — and what the underlying data actually shows.",
    accent: BRAND_COLORS.orbitalCyan,
  },
  {
    label: "What We Are Not Claiming Yet",
    desc: "Every episode ends here. What we looked at and did not reach a confident read on. Restraint is not a weakness — it is the standard.",
    accent: BRAND_COLORS.softUltraviolet,
  },
] as const;

const HONEST_STATE_NOTES = [
  "No episodes exist yet. We are not publishing a backlog of unreleased recordings.",
  "No download numbers — we have no audience data to report because there is no show yet.",
  "No ratings — fabricated social proof is something we do not do.",
  "No episode guests confirmed — future guests are not announced until they are recorded.",
] as const;

export default function PodcastPage() {
  return (
    <div
      className="flex min-h-screen flex-col"
      style={{ backgroundColor: BRAND_COLORS.obsidianBlack }}
    >
      <Nav />

      <main id="main-content" className="relative flex-1 overflow-hidden">

        {/* ── Hero — chrome + editorial-serif headline. Cyan/violet chrome tone
            to match the audio-intelligence character of the show. */}
        <RevenueHero
          chip="Galaxy Desk Podcast — Building Now"
          chipTone="cyan"
          headline={
            <>
              <span className="gw-chrome-ice">We sell niche trust.</span>{" "}
              <span className="gse-editorial text-orbital-cyan gw-text-glow-cyan">
                Not fake reach.
              </span>
            </>
          }
          lede={
            <>
              <span className="font-display text-xl text-white">
                The Galaxy Desk brief, in audio form.
              </span>
              <span className="mt-3 block">
                12 to 18 minutes. Five segments. The same calibrated intelligence
                you read in the Desk brief — structured for a commute, a gym session,
                or the hour before the slate opens. Market Mirage, No-Bet Watch, one
                matchup signal, one public-narrative correction, and what we are not
                claiming yet.
              </span>
            </>
          }
        >
          {/* Live-status pill with pulse dot — the one approved micro-interaction */}
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
            <div
              className="inline-flex items-center gap-3 rounded-xl border px-5 py-3"
              style={{
                borderColor: `${BRAND_COLORS.orbitalCyan}25`,
                background: `${BRAND_COLORS.orbitalCyan}0a`,
              }}
            >
              <span
                className="h-2 w-2 animate-pulse rounded-full"
                style={{ backgroundColor: BRAND_COLORS.orbitalCyan }}
                aria-hidden="true"
              />
              <span className="text-sm text-ink-300">
                In production.{" "}
                <strong className="text-white">
                  First episodes coming — no launch date yet.
                </strong>
              </span>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <Link href="/newsletter" className="btn btn-primary">
              Notify me when episodes drop →
            </Link>
            <Link
              href="/founding-desk"
              className="btn btn-ghost"
              style={{ color: BRAND_COLORS.orbitalCyan }}
            >
              Galaxy Founding Desk →
            </Link>
          </div>
          <p className="mt-4 text-xs text-ink-500">
            Sign up for the Galaxy Desk Note newsletter — you will hear when
            episodes are ready before anyone else.
          </p>
        </RevenueHero>

        {/* ── Episode format — WorldSection with tone="void" */}
        <WorldSection
          index="01"
          eyebrow="Episode format"
          title={
            <>
              Five segments.{" "}
              <span className="gw-chrome-ice">Every episode.</span>
            </>
          }
          lede="The format is structured and consistent. Every episode follows the same five-segment arc — so you know exactly what you are getting before the first minute plays."
          tone="void"
        >
          <Stagger className="flex flex-col gap-4" step={80}>
            {SEGMENT_FORMAT.map((seg, i) => (
              <article
                key={seg.label}
                className="surface-card gw-card-hover flex items-start gap-5 p-5"
              >
                <span
                  className="mt-0.5 shrink-0 font-display text-2xl tabular-nums"
                  style={{ color: seg.accent }}
                  aria-hidden="true"
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3
                    className="font-display text-lg font-semibold"
                    style={{ color: seg.accent }}
                  >
                    {seg.label}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-ink-300">
                    {seg.desc}
                  </p>
                </div>
              </article>
            ))}
          </Stagger>
        </WorldSection>

        {/* ── Honest state — WorldSection with tone="nebula" */}
        <WorldSection
          index="02"
          eyebrow="Honest state of the show"
          title={
            <>
              Intelligence, not{" "}
              <span className="gse-editorial gw-chrome-plasma">performance.</span>
            </>
          }
          lede="This is the Galaxy standard. We do not fabricate audience numbers, download counts, ratings, or episode backlogs. The show is being built. When it is ready, you will know — because the restraint is the trust signal."
          tone="nebula"
        >
          <Stagger className="flex flex-col gap-4" step={70}>
            {HONEST_STATE_NOTES.map((note, i) => (
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
                <p className="text-sm leading-relaxed text-ink-300">{note}</p>
              </div>
            ))}
          </Stagger>
        </WorldSection>

        <SignalRule className="mx-auto max-w-5xl px-4" />

        {/* ── Sponsor + CTA cluster */}
        <section className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl grid grid-cols-1 gap-6 md:grid-cols-2">

            {/* Notify CTA */}
            <Reveal>
              <div className="surface-card gw-card-hover flex h-full flex-col p-8">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-orbital-cyan">
                  Be first
                </p>
                <h3 className="mt-3 font-display text-2xl text-white" style={{ lineHeight: 1.15 }}>
                  Notify me when episodes drop.
                </h3>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-ink-300">
                  Sign up for the Galaxy Desk Note. Subscribers hear about new
                  episodes before they post anywhere else — plus the weekly
                  newsletter brief.
                </p>
                <div className="mt-6">
                  <Link href="/newsletter" className="btn btn-primary">
                    Join the Desk Note →
                  </Link>
                </div>
              </div>
            </Reveal>

            {/* Sponsor CTA */}
            <Reveal delay={100}>
              <div className="surface-card gw-card-hover flex h-full flex-col p-8">
                <p
                  className="font-mono text-[10px] font-bold uppercase tracking-[0.3em]"
                  style={{ color: BRAND_COLORS.softUltraviolet }}
                >
                  Sponsors
                </p>
                <h3 className="mt-3 font-display text-2xl text-white" style={{ lineHeight: 1.15 }}>
                  Interested in sponsoring?
                </h3>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-ink-300">
                  We sell niche trust — not fake reach. Podcast sponsor slots
                  go to businesses whose audience overlaps with disciplined
                  sports thinkers. See the full media kit for categories,
                  pricing, and compliance constraints.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link href="/media-kit" className="btn btn-ghost" style={{ color: BRAND_COLORS.softUltraviolet }}>
                    View Media Kit →
                  </Link>
                  <a
                    href={`mailto:${SUPPORT_EMAIL}?subject=Podcast%20Sponsor%20Inquiry`}
                    className="btn btn-ghost"
                  >
                    Contact us →
                  </a>
                </div>
              </div>
            </Reveal>
          </div>

          {/* Founding Desk cross-link */}
          <Reveal delay={180}>
            <div className="mx-auto mt-6 max-w-5xl">
              <div className="surface-card p-6 text-center">
                <p className="text-sm text-ink-300">
                  Want the written intelligence brief while you wait for the
                  podcast?
                </p>
                <Link
                  href="/founding-desk"
                  className="mt-3 inline-flex items-center gap-1 text-sm font-medium underline underline-offset-4 text-orbital-cyan transition-colors hover:text-white"
                >
                  Galaxy Founding Desk — daily intelligence brief →
                </Link>
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      <Footer />
    </div>
  );
}
