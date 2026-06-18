import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { Reveal, Stagger } from "@/components/motion/reveal";
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
    name: "Market Mirage",
    description:
      "Public belief vs. market pricing — where the crowd is wrong and where the market is applying pressure. Regular recurring format.",
    audience: "Sports decision-makers who want to understand line movement",
  },
  {
    name: "No-Bet Watch",
    description:
      "The game everyone wants action on, and why we may decline. No-Bet is a first-class position at Galaxy — not a cop-out.",
    audience: "Readers who value discipline over action-seeking",
  },
  {
    name: "Signal vs. Noise",
    description:
      "Separating what the data supports from what the narrative is selling. Anti-hype analysis in plain language.",
    audience: "Analytically minded sports fans and decision-makers",
  },
  {
    name: "The Desk Note",
    description:
      "The daily Galaxy brief — a structured intelligence ritual before you follow a pick, make a fantasy call, or form an opinion.",
    audience: "Founding Desk members and newsletter subscribers",
  },
  {
    name: "Confidence Autopsy",
    description:
      "Win or loss, we publish what the model said, what happened, and what it means for calibration. Transparent accountability.",
    audience: "Trust-first sports fans who follow the process, not just results",
  },
] as const;

const CHANNELS = [
  {
    name: "Galaxy Desk Newsletter",
    format: "Email · recurring",
    status: "Building — early-stage audience",
    placement: "Dedicated sponsor slot",
  },
  {
    name: "Weekly Galaxy Desk Brief",
    format: "Written + audio · recurring",
    status: "Building — founding content in production",
    placement: "Inline sponsor slot + attribution",
  },
  {
    name: "YouTube",
    format: "Long-form intelligence video",
    status: "Building — first episodes in production",
    placement: "Pre-roll / mid-roll mention + description",
  },
  {
    name: "TikTok / Instagram / Reels",
    format: "Short-form signal clips",
    status: "Building — early-stage, Houston-based",
    placement: "Mention + link in bio rotation",
  },
  {
    name: "Podcast",
    format: "Audio version of the Desk",
    status: "Building — launching with newsletter audience",
    placement: "Pre-roll / mid-roll read",
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

export default function MediaKitPage() {
  return (
    <div
      className="flex min-h-screen flex-col"
      style={{ backgroundColor: BRAND_COLORS.obsidianBlack }}
    >
      <Nav />

      <main id="main-content" className="flex-1">
        {/* Hero */}
        <section className="mx-auto max-w-5xl px-4 py-24 sm:px-6 lg:px-8">
          <Reveal>
            <span
              className="inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em]"
              style={{
                color: BRAND_COLORS.orbitalCyan,
                borderColor: `${BRAND_COLORS.orbitalCyan}30`,
                backgroundColor: `${BRAND_COLORS.orbitalCyan}0d`,
              }}
            >
              Media Kit · Sponsors
            </span>
          </Reveal>
          <Reveal delay={90}>
            <h1
              className="mt-5 max-w-4xl font-display text-balance text-white"
              style={{
                fontSize: "clamp(2.2rem, 5.5vw, 4rem)",
                lineHeight: 1.05,
                letterSpacing: "-0.02em",
              }}
            >
              Sports intelligence media.{" "}
              <span
                style={{
                  background: `linear-gradient(90deg, ${BRAND_COLORS.orbitalCyan} 0%, ${BRAND_COLORS.softUltraviolet} 100%)`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Built on trust, not hype.
              </span>
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-ink-300">
              {BRAND_NAME} is a sports intelligence and media company — not a
              sportsbook, not a tout service. We publish calibrated signals with
              the reasoning attached, maintain a No-Bet discipline as a
              first-class product value, and build audience through trust, not
              through fabricated win streaks.
            </p>
          </Reveal>
          <Reveal delay={220}>
            <p className="mt-4 max-w-2xl text-base leading-7 text-ink-400">
              We are early-stage. Our audience is building. We are not selling
              you reach numbers we have not earned — we are offering founding-sponsor
              pricing to partners who want to be embedded in a niche, trust-first
              sports intelligence brand from the start.
            </p>
          </Reveal>
          <Reveal delay={290}>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href={`mailto:${SUPPORT_EMAIL}?subject=Sponsorship Inquiry`}
                className="btn btn-primary"
              >
                Become a sponsor →
              </a>
              <Link href="/about" className="btn btn-ghost">
                What we are
              </Link>
            </div>
          </Reveal>
        </section>

        {/* Who we are */}
        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <div
                className="rounded-2xl border p-8"
                style={{
                  borderColor: `${BRAND_COLORS.softUltraviolet}22`,
                  background: `radial-gradient(ellipse 60% 80% at 50% 100%, ${BRAND_COLORS.softUltraviolet}08, transparent 70%)`,
                }}
              >
                <p
                  className="font-mono text-[10px] uppercase tracking-[0.18em]"
                  style={{ color: BRAND_COLORS.softUltraviolet }}
                >
                  The brand in one paragraph
                </p>
                <h2
                  className="mt-3 font-display text-white"
                  style={{
                    fontSize: "clamp(1.5rem, 3vw, 2.2rem)",
                    lineHeight: 1.15,
                  }}
                >
                  Sports intelligence for people who are done being sold certainty.
                </h2>
                <p className="mt-4 max-w-3xl text-base leading-7 text-ink-300">
                  Every pick on {BRAND_NAME} traces to real odds data, a full
                  factor breakdown, and a calibrated confidence score. When
                  confidence is insufficient, we publish a No-Bet. We do not
                  delete losses. We do not claim win rates we have not honestly
                  earned. We do not publish certainty we do not have. That
                  restraint is the pitch — and it is the thing that makes our
                  audience worth reaching.
                </p>
                <ul className="mt-5 flex flex-col gap-2 text-sm text-ink-300">
                  <li className="flex items-start gap-2">
                    <span style={{ color: BRAND_COLORS.orbitalCyan }} aria-hidden="true">—</span>
                    <span>Sports intelligence / media / analytics. Not a sportsbook. Not a tout.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span style={{ color: BRAND_COLORS.orbitalCyan }} aria-hidden="true">—</span>
                    <span>No fabricated audience numbers. We are early-stage; we say so.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span style={{ color: BRAND_COLORS.orbitalCyan }} aria-hidden="true">—</span>
                    <span>No win-rate claims before the internal evidence supports them.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span style={{ color: BRAND_COLORS.orbitalCyan }} aria-hidden="true">—</span>
                    <span>No-Bet is a first-class product value, not a fallback.</span>
                  </li>
                </ul>
              </div>
            </Reveal>
          </div>
        </section>

        {/* Channels */}
        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <p
                className="font-mono text-[10px] uppercase tracking-[0.18em]"
                style={{ color: BRAND_COLORS.orbitalCyan }}
              >
                Channels
              </p>
              <h2
                className="mt-3 font-display text-white"
                style={{
                  fontSize: "clamp(1.5rem, 3vw, 2.2rem)",
                  lineHeight: 1.15,
                }}
              >
                Where sponsors appear.
              </h2>
              <p className="mt-3 max-w-2xl text-sm text-ink-400">
                All channels are in active production. Audience is early-stage —
                founding-sponsor pricing reflects that honestly. We are selling
                niche trust at the point of formation, not a reach number.
              </p>
            </Reveal>
            <Stagger className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2" step={70}>
              {CHANNELS.map((ch) => (
                <div
                  key={ch.name}
                  className="rounded-xl border p-5"
                  style={{
                    borderColor: `${BRAND_COLORS.orbitalCyan}18`,
                    backgroundColor: `${BRAND_COLORS.steelGray}40`,
                  }}
                >
                  <p className="font-semibold text-white">{ch.name}</p>
                  <p className="mt-1 text-xs text-ink-400">{ch.format}</p>
                  <p
                    className="mt-2 text-[11px] font-mono uppercase tracking-wider"
                    style={{ color: BRAND_COLORS.orbitalCyan }}
                  >
                    {ch.status}
                  </p>
                  <p className="mt-2 text-xs text-ink-300">{ch.placement}</p>
                </div>
              ))}
            </Stagger>
          </div>
        </section>

        {/* Content formats */}
        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <p
                className="font-mono text-[10px] uppercase tracking-[0.18em]"
                style={{ color: BRAND_COLORS.softUltraviolet }}
              >
                Content formats
              </p>
              <h2
                className="mt-3 font-display text-white"
                style={{
                  fontSize: "clamp(1.5rem, 3vw, 2.2rem)",
                  lineHeight: 1.15,
                }}
              >
                The recurring formats sponsors are embedded in.
              </h2>
            </Reveal>
            <Stagger className="mt-8 flex flex-col gap-4" step={60}>
              {CONTENT_FORMATS.map((fmt) => (
                <div
                  key={fmt.name}
                  className="rounded-xl border p-5"
                  style={{
                    borderColor: `${BRAND_COLORS.softUltraviolet}18`,
                    backgroundColor: `${BRAND_COLORS.steelGray}40`,
                  }}
                >
                  <p className="font-semibold text-white">{fmt.name}</p>
                  <p className="mt-1 text-sm leading-relaxed text-ink-300">
                    {fmt.description}
                  </p>
                  <p className="mt-2 text-xs text-ink-500">
                    Audience: {fmt.audience}
                  </p>
                </div>
              ))}
            </Stagger>
          </div>
        </section>

        {/* Pricing tiers */}
        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <p
                className="font-mono text-[10px] uppercase tracking-[0.18em]"
                style={{ color: BRAND_COLORS.ionMagenta }}
              >
                Founding-sponsor pricing
              </p>
              <h2
                className="mt-3 font-display text-white"
                style={{
                  fontSize: "clamp(1.5rem, 3vw, 2.2rem)",
                  lineHeight: 1.15,
                }}
              >
                Rate ranges — early-stage, honest.
              </h2>
              <p className="mt-3 max-w-2xl text-sm text-ink-400">
                These are the founding-sponsor rate ranges from our revenue
                doctrine. Actual deals are negotiated — these ranges reflect the
                early-access pricing for partners who come in before the audience
                scales. Rates will increase as the brand establishes proof of
                reach and trust.
              </p>
            </Reveal>
            <Stagger className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2" step={80}>
              {SPONSOR_PRICING_TIERS.map((tier) => (
                <div
                  key={tier.type}
                  className="rounded-xl border p-6"
                  style={{
                    borderColor: `${BRAND_COLORS.ionMagenta}18`,
                    backgroundColor: `${BRAND_COLORS.steelGray}40`,
                  }}
                >
                  <p
                    className="font-display text-2xl font-bold"
                    style={{ color: BRAND_COLORS.ionMagenta }}
                  >
                    {tier.rangeUsdPerMonth}
                  </p>
                  <p className="mt-1 font-semibold text-white">{tier.name}</p>
                  <p className="mt-2 text-sm leading-relaxed text-ink-300">
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
          </div>
        </section>

        {/* Safe categories */}
        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <p
                className="font-mono text-[10px] uppercase tracking-[0.18em]"
                style={{ color: BRAND_COLORS.orbitalCyan }}
              >
                Who we work with
              </p>
              <h2
                className="mt-3 font-display text-white"
                style={{
                  fontSize: "clamp(1.5rem, 3vw, 2.2rem)",
                  lineHeight: 1.15,
                }}
              >
                Accepted sponsor categories.
              </h2>
              <p className="mt-3 max-w-2xl text-sm text-ink-400">
                We accept sponsors whose products align with a sports-intelligent
                audience. We do not accept sportsbooks or casino platforms as
                the face of the brand. Brand-fit review applies to all inquiries.
              </p>
            </Reveal>
            <Reveal delay={120}>
              <ul className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {SAFE_SPONSOR_CATEGORIES.map((cat) => (
                  <li
                    key={cat}
                    className="flex items-center gap-3 rounded-lg border px-4 py-2.5 text-sm text-ink-300"
                    style={{ borderColor: `${BRAND_COLORS.orbitalCyan}18` }}
                  >
                    <span
                      className="shrink-0 font-mono text-xs"
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
          </div>
        </section>

        {/* CTA */}
        <section className="px-4 pb-24 pt-8 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <div
                className="rounded-2xl border p-8"
                style={{
                  borderColor: `${BRAND_COLORS.orbitalCyan}22`,
                  background: `radial-gradient(ellipse 60% 80% at 50% 100%, ${BRAND_COLORS.orbitalCyan}08, transparent 70%)`,
                }}
              >
                <p
                  className="font-mono text-[10px] uppercase tracking-[0.18em]"
                  style={{ color: BRAND_COLORS.orbitalCyan }}
                >
                  Get in touch
                </p>
                <h2
                  className="mt-3 font-display text-white"
                  style={{
                    fontSize: "clamp(1.5rem, 3vw, 2.2rem)",
                    lineHeight: 1.15,
                  }}
                >
                  Sponsor inquiries
                </h2>
                <p className="mt-4 max-w-xl text-base leading-7 text-ink-300">
                  If your brand fits the profile — and you understand that we
                  sell niche trust, not fake reach — write to us. Every inquiry
                  is reviewed personally.
                </p>
                <div className="mt-7 flex flex-wrap gap-3">
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
                <p className="mt-5 text-xs text-ink-600">
                  All placements are subject to brand-fit review and internal approval.
                  Sportsbook and casino sponsors are not accepted at this stage.
                  See our{" "}
                  <Link
                    href="/affiliate-disclosure"
                    className="underline underline-offset-4"
                    style={{ color: BRAND_COLORS.orbitalCyan }}
                  >
                    affiliate disclosure
                  </Link>{" "}
                  for our full compliance posture.
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
