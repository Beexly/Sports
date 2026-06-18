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
import { BRAND_NAME, BRAND_COLORS, SUPPORT_EMAIL } from "@/lib/brand";
import { SPONSOR_PRICING_TIERS } from "@/lib/revenue/sponsors";

export const metadata: Metadata = {
  title: "Media Kit — Sponsor Galaxy Sports Edge",
  description:
    "Sponsor information for Galaxy Sports Edge — sports intelligence media built on trust, not hype. Early-stage founding-sponsor pricing. Niche audience. No fabricated reach numbers.",
  alternates: { canonical: "/media-kit" },
  openGraph: {
    title: `Media Kit — Sponsor ${BRAND_NAME}`,
    description:
      "Sports intelligence media for people done being sold certainty. Founding-sponsor pricing, honest reach numbers, brand-fit review on every inquiry.",
    type: "website",
  },
};

const CONTENT_FORMATS = [
  {
    eyebrow: "01",
    name: "Market Mirage",
    description:
      "Public belief set against what the price actually implies — where the crowd is wrong and where the market is applying pressure. A recurring format every issue.",
    audience: "Sports decision-makers who want to understand line movement",
    accent: BRAND_COLORS.orbitalCyan,
  },
  {
    eyebrow: "02",
    name: "No-Bet Watch",
    description:
      "The game everyone wants action on — and a structured look at why declining may be the sharpest move. No-Bet is a first-class position at Galaxy, not a cop-out.",
    audience: "Readers who value discipline over action-seeking",
    accent: BRAND_COLORS.softUltraviolet,
  },
  {
    eyebrow: "03",
    name: "Signal vs. Noise",
    description:
      "Separating what the data supports from what the narrative is selling. Anti-hype analysis in plain language, labelled and reasoned through.",
    audience: "Analytically minded sports fans and decision-makers",
    accent: BRAND_COLORS.ionMagenta,
  },
  {
    eyebrow: "04",
    name: "The Desk Note",
    description:
      "The daily Galaxy brief — a structured intelligence ritual before you follow a pick, make a fantasy call, or form an opinion. Founding Desk members read this every morning.",
    audience: "Founding Desk members and newsletter subscribers",
    accent: BRAND_COLORS.orbitalCyan,
  },
  {
    eyebrow: "05",
    name: "Confidence Autopsy",
    description:
      "Win or loss, we publish what the model said, what happened, and what it means for calibration. Transparent accountability — losses included by design.",
    audience: "Trust-first sports fans who follow the process, not just results",
    accent: BRAND_COLORS.softUltraviolet,
  },
] as const;

const CHANNELS = [
  {
    name: "Galaxy Desk Newsletter",
    format: "Email · recurring",
    status: "Building — early-stage audience",
    placement: "Dedicated sponsor slot",
    accent: BRAND_COLORS.orbitalCyan,
  },
  {
    name: "Weekly Galaxy Desk Brief",
    format: "Written + audio · recurring",
    status: "Building — founding content in production",
    placement: "Inline sponsor slot + attribution",
    accent: BRAND_COLORS.softUltraviolet,
  },
  {
    name: "YouTube",
    format: "Long-form intelligence video",
    status: "Building — first episodes in production",
    placement: "Pre-roll / mid-roll mention + description",
    accent: BRAND_COLORS.ionMagenta,
  },
  {
    name: "TikTok / Instagram / Reels",
    format: "Short-form signal clips",
    status: "Building — early-stage, Houston-based",
    placement: "Mention + link in bio rotation",
    accent: BRAND_COLORS.orbitalCyan,
  },
  {
    name: "Podcast",
    format: "Audio version of the Desk",
    status: "Building — launching with newsletter audience",
    placement: "Pre-roll / mid-roll read",
    accent: BRAND_COLORS.softUltraviolet,
  },
] as const;

const SAFE_SPONSOR_CATEGORIES = [
  "Sports bars and game-watching venues",
  "Fantasy sports tools and platforms",
  "Sports apparel and merchandise",
  "Training facilities and equipment",
  "Ticketing platforms",
  "Sports podcasts and newsletters",
  "Creator tools for sports content",
  "Local Houston sports businesses",
  "Nutrition and recovery brands",
  "Sports media and analytics software",
] as const;

/** Honest pitch anchors — what we trade in, stated without fabricated numbers. */
const PITCH_ANCHORS = [
  {
    label: "Content formats",
    value: 5,
    suffix: "",
    body: "Recurring formats that run every cycle — Market Mirage, No-Bet Watch, Signal vs Noise, The Desk Note, Confidence Autopsy.",
    accent: BRAND_COLORS.orbitalCyan,
  },
  {
    label: "Distribution channels",
    value: 5,
    suffix: "",
    body: "Newsletter, weekly brief, YouTube, short-form social, and podcast — all in active production.",
    accent: BRAND_COLORS.softUltraviolet,
  },
  {
    label: "Sponsor categories",
    value: 10,
    suffix: "",
    body: "Categories we accept — sports-adjacent brands that share a trust-first audience. Sportsbooks not included.",
    accent: BRAND_COLORS.ionMagenta,
  },
] as const;

export default function MediaKitPage() {
  return (
    <div
      className="flex min-h-screen flex-col"
      style={{ backgroundColor: BRAND_COLORS.obsidianBlack }}
    >
      <Nav />

      <main id="main-content" className="relative flex-1 overflow-hidden">
        <ShootingStars />

        {/* ── Hero — chrome + editorial-serif headline, honest early-stage lede */}
        <RevenueHero
          chip="Media Kit · Sponsors"
          chipTone="plasma"
          headline={
            <>
              <span className="gw-chrome-plasma">Niche trust</span>,{" "}
              <span className="gse-editorial text-orbital-cyan gw-text-glow-cyan">
                not fake reach
              </span>
              .
            </>
          }
          lede={
            <>
              <span className="font-display text-xl text-white">
                Sports intelligence media. Built on trust, not hype.
              </span>
              <span className="mt-3 block">
                {BRAND_NAME} is a sports intelligence and media company — not a
                sportsbook, not a tout service. We publish calibrated signals with
                the reasoning attached and build audience the hard way: by being
                honest. We are early-stage. Our audience is building. We are not
                selling you reach numbers we have not earned — we are offering
                founding-sponsor pricing to partners who want to be embedded in a
                niche, trust-first sports intelligence brand from the start.
              </span>
            </>
          }
        >
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href={`mailto:${SUPPORT_EMAIL}?subject=Sponsorship Inquiry`}
              className="btn btn-primary"
            >
              Become a sponsor →
            </a>
            <Link href="/partners" className="btn btn-ghost">
              View partnership options
            </Link>
          </div>
          <p className="mt-4 text-xs text-ink-500">
            Not a sportsbook. We do not accept or place wagers.
            Sportsbook affiliates are not accepted at this stage.
          </p>
        </RevenueHero>

        {/* ── Honest anchor stats — real structure, no fabricated audience */}
        <section className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <p className="gw-chapter-index">
                <span className="text-orbital-cyan">01</span>
                What you are buying
              </p>
              <h2 className="mt-4 max-w-3xl font-display text-display-lg font-semibold text-balance text-white">
                Embedded in a brand built on{" "}
                <span className="gse-editorial gw-chrome-violet">restraint</span>.
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-ink-300">
                We do not publish fabricated audience numbers — we are early-stage
                and we say so plainly. What you are buying is placement in a
                trust-first sports intelligence brand at the point of formation,
                alongside content that earns its audience by refusing to
                overclaim.
              </p>
            </Reveal>

            <Stagger className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-3" step={80}>
              {PITCH_ANCHORS.map((anchor) => (
                <div
                  key={anchor.label}
                  className="surface-card gw-card-hover flex flex-col gap-3 p-6"
                >
                  <p
                    className="font-display text-5xl font-bold tabular-nums"
                    style={{ color: anchor.accent }}
                  >
                    <CountUp value={anchor.value} suffix={anchor.suffix} />
                  </p>
                  <p
                    className="font-mono text-[10px] font-bold uppercase tracking-[0.18em]"
                    style={{ color: anchor.accent }}
                  >
                    {anchor.label}
                  </p>
                  <p className="text-sm leading-relaxed text-ink-300">
                    {anchor.body}
                  </p>
                </div>
              ))}
            </Stagger>
          </div>
        </section>

        <SignalRule className="mx-auto max-w-5xl px-4" />

        {/* ── The brand in one paragraph — using WorldSection */}
        <WorldSection
          index="02"
          eyebrow="The brand in one paragraph"
          title={
            <>
              Intelligence, not{" "}
              <span className="gse-editorial gw-chrome-ice">certainty</span>.
            </>
          }
          lede="Every pick on Galaxy Sports Edge traces to real odds data, a full factor breakdown, and a calibrated confidence score. When confidence is insufficient, we publish a No-Bet. We do not delete losses. We do not claim win rates we have not honestly earned."
          tone="nebula"
        >
          <Stagger className="grid grid-cols-1 gap-3 sm:grid-cols-2" step={60}>
            {[
              { icon: "—", text: "Sports intelligence / media / analytics. Not a sportsbook. Not a tout." },
              { icon: "—", text: "No fabricated audience numbers. We are early-stage; we say so." },
              { icon: "—", text: "No win-rate claims before the internal evidence supports them." },
              { icon: "—", text: "No-Bet is a first-class product value, not a fallback position." },
            ].map((item) => (
              <div key={item.text} className="surface-card gw-card-hover flex items-start gap-4 p-5">
                <span
                  aria-hidden="true"
                  className="mt-0.5 shrink-0 font-mono text-base font-bold"
                  style={{ color: BRAND_COLORS.orbitalCyan }}
                >
                  {item.icon}
                </span>
                <p className="text-sm leading-relaxed text-ink-300">{item.text}</p>
              </div>
            ))}
          </Stagger>
        </WorldSection>

        {/* ── Channels */}
        <WorldSection
          index="03"
          eyebrow="Where sponsors appear"
          title={
            <>
              Five channels,{" "}
              <span className="gse-editorial text-orbital-cyan gw-text-glow-cyan">
                all in production
              </span>
              .
            </>
          }
          lede="All channels are in active production. Audience is early-stage — founding-sponsor pricing reflects that honestly. We are selling niche trust at the point of formation, not a reach number."
          tone="void"
        >
          <Stagger className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3" step={70}>
            {CHANNELS.map((ch) => (
              <div
                key={ch.name}
                className="surface-card gw-card-hover flex flex-col gap-2.5 p-5"
              >
                <div
                  className="mb-1 h-0.5 w-10 rounded-full"
                  style={{ background: ch.accent }}
                  aria-hidden="true"
                />
                <p className="font-semibold text-white">{ch.name}</p>
                <p className="font-mono text-[10px] text-ink-400">{ch.format}</p>
                <p
                  className="font-mono text-[10px] font-bold uppercase tracking-wider"
                  style={{ color: ch.accent }}
                >
                  {ch.status}
                </p>
                <p className="text-xs text-ink-300">{ch.placement}</p>
              </div>
            ))}
          </Stagger>
        </WorldSection>

        <SignalRule className="mx-auto max-w-5xl px-4" />

        {/* ── Content formats */}
        <WorldSection
          index="04"
          eyebrow="Content formats"
          title={
            <>
              The recurring formats{" "}
              <span className="gse-editorial gw-chrome-plasma">sponsors</span>{" "}
              are embedded in.
            </>
          }
          tone="nebula"
        >
          <Stagger className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3" step={60}>
            {CONTENT_FORMATS.map((fmt) => (
              <article
                key={fmt.name}
                className="surface-card gw-card-hover flex flex-col gap-2.5 p-5"
              >
                <span
                  className="font-display text-2xl tabular-nums"
                  style={{ color: fmt.accent }}
                >
                  {fmt.eyebrow}
                </span>
                <h3 className="font-display text-lg font-semibold text-white">
                  {fmt.name}
                </h3>
                <p className="text-sm leading-relaxed text-ink-300">
                  {fmt.description}
                </p>
                <p className="mt-auto text-xs text-ink-500">
                  Audience: {fmt.audience}
                </p>
              </article>
            ))}
          </Stagger>
        </WorldSection>

        {/* ── Pricing tiers */}
        <WorldSection
          index="05"
          eyebrow="Founding-sponsor pricing"
          title={
            <>
              Rate ranges —{" "}
              <span className="gse-editorial gw-chrome-violet">early-stage</span>,{" "}
              honest.
            </>
          }
          lede="These are the founding-sponsor rate ranges from our revenue doctrine. Actual deals are negotiated — these ranges reflect the early-access pricing for partners who come in before the audience scales. Rates will increase as the brand establishes proof of reach and trust."
          tone="deep"
        >
          <Stagger className="grid grid-cols-1 gap-4 sm:grid-cols-2" step={80}>
            {SPONSOR_PRICING_TIERS.map((tier) => (
              <div
                key={tier.type}
                className="surface-card gw-card-hover flex flex-col gap-2.5 p-6"
              >
                <p
                  className="font-display text-3xl font-bold"
                  style={{ color: BRAND_COLORS.ionMagenta }}
                >
                  {tier.rangeUsdPerMonth}
                </p>
                <p
                  className="font-mono text-[10px] font-bold uppercase tracking-[0.18em]"
                  style={{ color: BRAND_COLORS.ionMagenta }}
                >
                  / mo
                </p>
                <h3 className="font-display text-lg font-semibold text-white">
                  {tier.name}
                </h3>
                <p className="text-sm leading-relaxed text-ink-300">
                  {tier.description}
                </p>
              </div>
            ))}
          </Stagger>
          <Reveal delay={200}>
            <p className="mt-6 text-xs text-ink-600">
              Pricing is illustrative of the founding range — not a binding
              quote. All placements are subject to brand-fit review.
              Sportsbook, casino, and wagering-platform sponsors are not
              accepted at this stage.
            </p>
          </Reveal>
        </WorldSection>

        <SignalRule className="mx-auto max-w-5xl px-4" />

        {/* ── Accepted categories */}
        <WorldSection
          index="06"
          eyebrow="Who we work with"
          title={
            <>
              Accepted{" "}
              <span className="gse-editorial text-orbital-cyan gw-text-glow-cyan">
                sponsor categories
              </span>
              .
            </>
          }
          lede="We accept sponsors whose products align with a sports-intelligent audience. Brand-fit review applies to all inquiries. We do not accept sportsbooks or casino platforms as the face of the brand."
          tone="void"
        >
          <Reveal delay={120}>
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {SAFE_SPONSOR_CATEGORIES.map((cat) => (
                <li
                  key={cat}
                  className="surface-card gw-card-hover flex items-center gap-3 px-4 py-3 text-sm text-ink-300"
                >
                  <span
                    className="shrink-0 font-mono text-xs font-bold"
                    style={{ color: BRAND_COLORS.orbitalCyan }}
                    aria-hidden="true"
                  >
                    ✓
                  </span>
                  {cat}
                </li>
              ))}
            </ul>
          </Reveal>
        </WorldSection>

        {/* ── CTA — nebula-deep, chrome headline */}
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
              <span className="gw-chip-cyan">Sponsor inquiry</span>
              <h2 className="mt-6 font-display text-display-lg font-semibold leading-[1.05] text-balance text-white">
                If the brand fits —{" "}
                <span className="gse-editorial text-orbital-cyan gw-text-glow-cyan">
                  write to us
                </span>
                .
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-ink-300">
                We sell niche trust, not fake reach. If your brand serves a
                sports-intelligent audience and you understand what that means —
                send an inquiry. Every request is reviewed personally.
              </p>
            </Reveal>
            <Reveal delay={120}>
              <div className="mt-9 flex flex-wrap justify-center gap-3">
                <a
                  href={`mailto:${SUPPORT_EMAIL}?subject=Sponsorship Inquiry`}
                  className="btn btn-primary"
                >
                  Email us →
                </a>
                <Link href="/partners" className="btn btn-ghost">
                  View partnership options
                </Link>
              </div>
              <p className="mt-5 text-xs text-ink-500">
                All placements subject to brand-fit review and internal approval.
                Sportsbook and casino sponsors are not accepted at this stage. See our{" "}
                <Link
                  href="/affiliate-disclosure"
                  className="underline underline-offset-4 transition-colors hover:text-ink-300"
                  style={{ color: BRAND_COLORS.orbitalCyan }}
                >
                  affiliate disclosure
                </Link>{" "}
                for our full compliance posture.
              </p>
            </Reveal>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
