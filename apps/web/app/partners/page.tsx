import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { Reveal, Stagger } from "@/components/motion/reveal";
import { ShootingStars } from "@/components/motion/shooting-stars";
import { SignalRule } from "@/components/motion/signal-rule";
import { WorldSection } from "@/components/world/world-section";
import { RevenueHero } from "@/components/revenue/revenue-hero";
import { BRAND_NAME, BRAND_COLORS, SUPPORT_EMAIL } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Partners — Work With Galaxy Sports Edge",
  description:
    "Partner with Galaxy Sports Edge — sponsor placements, newsletter swaps, local business collaborations, and creator partnerships. Sports intelligence media built on trust. Brand-fit review on every inquiry.",
  alternates: { canonical: "/partners" },
  openGraph: {
    title: `Partners — ${BRAND_NAME}`,
    description:
      "Sponsor placements, newsletter swaps, local collaborations, and creator partnerships with a trust-first sports intelligence brand. No sportsbook affiliates at this stage.",
    type: "website",
  },
};

const PARTNER_CATEGORIES = [
  {
    title: "Fantasy Tools & Platforms",
    description:
      "Data-informed tools for roster decisions, lineup building, and DFS analysis. Our audience already thinks in terms of signal and process — your tool extends that naturally.",
    fit: "High fit",
    accent: BRAND_COLORS.orbitalCyan,
  },
  {
    title: "Sports Bars & Game Venues",
    description:
      "Local and regional venues that turn a game into an experience — watching parties, viewing rooms, and community events. Especially relevant for Houston-area activations and Game Night Packs.",
    fit: "High fit",
    accent: BRAND_COLORS.softUltraviolet,
  },
  {
    title: "Sports Apparel & Merchandise",
    description:
      "Fan gear and performance wear that speaks to the sports identity layer. Intelligence-culture brands and data-adjacent labels fit better than broad lifestyle play.",
    fit: "Medium–high fit",
    accent: BRAND_COLORS.ionMagenta,
  },
  {
    title: "Training Facilities & Equipment",
    description:
      "Performance training, conditioning tools, and recovery brands that serve athletes and serious fans. Shared value: preparation over guesswork.",
    fit: "Medium fit",
    accent: BRAND_COLORS.orbitalCyan,
  },
  {
    title: "Ticketing Platforms",
    description:
      "Primary and resale platforms with real utility for sports fans making attendance decisions. Functional value for the same people reading the Desk.",
    fit: "Medium fit",
    accent: BRAND_COLORS.softUltraviolet,
  },
  {
    title: "Sports Podcasts & Newsletters",
    description:
      "Audience-swap partners who share our anti-hype, intelligence-first values. Not tout services. The co-credentialing value goes both directions — your audience trusts you; our audience trusts us.",
    fit: "High fit",
    accent: BRAND_COLORS.ionMagenta,
  },
  {
    title: "Creator Tools",
    description:
      "Video, audio, and content production software used by sports creators. Directly relevant to our own production stack and the creators in our contributor network.",
    fit: "Medium fit",
    accent: BRAND_COLORS.orbitalCyan,
  },
  {
    title: "Local Houston Sports Businesses",
    description:
      "Youth leagues, training academies, sports media, and community organizations rooted in Houston. We are Houston-based; local trust is not a slogan here.",
    fit: "High fit",
    accent: BRAND_COLORS.softUltraviolet,
  },
  {
    title: "Sports Analytics & Data Software",
    description:
      "Platforms and tools for fans, bettors, and fantasy players who want to understand the numbers behind a game — not just consume picks from someone who claims to know.",
    fit: "High fit",
    accent: BRAND_COLORS.ionMagenta,
  },
] as const;

const NOT_ACCEPTED = [
  "Sportsbooks and casino platforms (as the face of the brand)",
  "Tout services or pick-selling operations with unverified records",
  "Products that make unverifiable outcome claims or certainty promises",
  "Brands that conflict with our responsible-play posture",
] as const;

const PARTNERSHIP_TYPES = [
  {
    eyebrow: "01",
    name: "Sponsor Placement",
    description:
      "Paid placement in our newsletter, Desk briefs, YouTube content, or podcast. Brand is disclosed, not embedded as editorial. Rate ranges in the media kit.",
    href: "/media-kit",
    cta: "See media kit",
    accent: BRAND_COLORS.orbitalCyan,
  },
  {
    eyebrow: "02",
    name: "Content / Newsletter Swap",
    description:
      "We mention your publication to our list; you mention ours. No money changes hands. Both audiences are relevant and comparable in values — that is the entire logic.",
    href: null,
    cta: null,
    accent: BRAND_COLORS.softUltraviolet,
  },
  {
    eyebrow: "03",
    name: "Local Business Collaboration",
    description:
      "Game Night Packs, co-branded content, and event tie-ins for Houston-area sports businesses. Practical, community-first activations — not reach theater.",
    href: null,
    cta: null,
    accent: BRAND_COLORS.ionMagenta,
  },
  {
    eyebrow: "04",
    name: "Creator Network",
    description:
      "Sports content creators who want access to our intelligence stack, data tools, and affiliate infrastructure. Requires a values-alignment review — we are selective on purpose.",
    href: "/creator-network",
    cta: "See creator network",
    accent: BRAND_COLORS.orbitalCyan,
  },
] as const;

export default function PartnersPage() {
  return (
    <div
      className="flex min-h-screen flex-col"
      style={{ backgroundColor: BRAND_COLORS.obsidianBlack }}
    >
      <Nav />

      <main id="main-content" className="relative flex-1 overflow-hidden">
        <ShootingStars />

        {/* ── Hero — chrome + editorial-serif, violet chrome tone */}
        <RevenueHero
          chip="Partnerships"
          chipTone="cyan"
          headline={
            <>
              <span className="gw-chrome-violet">Work with</span> a brand that
              builds on{" "}
              <span className="gse-editorial text-orbital-cyan gw-text-glow-cyan">
                trust
              </span>
              .
            </>
          }
          lede={
            <>
              <span className="font-display text-xl text-white">
                Not hype. Not fake reach. Not a sportsbook.
              </span>
              <span className="mt-3 block">
                {BRAND_NAME} is a sports intelligence media company. We are
                building audience the hard way — by being honest about what we
                know, what we do not know, and when the right call is to not act
                at all. We partner with brands and creators that share those
                values.
              </span>
            </>
          }
        >
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href={`mailto:${SUPPORT_EMAIL}?subject=Partnership Inquiry`}
              className="btn btn-primary"
            >
              Start a conversation →
            </a>
            <Link href="/media-kit" className="btn btn-ghost">
              View media kit
            </Link>
          </div>
        </RevenueHero>

        {/* ── Partnership types */}
        <WorldSection
          index="01"
          eyebrow="What working together looks like"
          title={
            <>
              Four ways to{" "}
              <span className="gse-editorial gw-chrome-ice">partner</span>.
            </>
          }
          lede="Paid placements, audience swaps, local activations, and creator partnerships — each with different terms and different fit criteria. All go through a values-alignment review."
          tone="void"
        >
          <Stagger className="grid grid-cols-1 gap-4 sm:grid-cols-2" step={70}>
            {PARTNERSHIP_TYPES.map((pt) => (
              <article
                key={pt.name}
                className="surface-card gw-card-hover flex flex-col gap-2.5 p-6"
              >
                <span
                  className="font-display text-2xl tabular-nums"
                  style={{ color: pt.accent }}
                >
                  {pt.eyebrow}
                </span>
                <h3 className="font-display text-lg font-semibold text-white">
                  {pt.name}
                </h3>
                <p className="text-sm leading-relaxed text-ink-300">
                  {pt.description}
                </p>
                {pt.href && pt.cta && (
                  <Link
                    href={pt.href}
                    className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold transition-colors hover:text-white"
                    style={{ color: pt.accent }}
                  >
                    {pt.cta}
                    <span aria-hidden="true">→</span>
                  </Link>
                )}
              </article>
            ))}
          </Stagger>
        </WorldSection>

        <SignalRule className="mx-auto max-w-5xl px-4" />

        {/* ── Partner fit categories */}
        <WorldSection
          index="02"
          eyebrow="Partner fit"
          title={
            <>
              Categories we{" "}
              <span className="gse-editorial gw-chrome-plasma">work with</span>.
            </>
          }
          lede="All partnerships go through a brand-fit review. We are selective — not to be difficult, but because the audience we are building trusts us to be. Categories listed here are broadly approved; individual brands are still reviewed."
          tone="nebula"
        >
          <Stagger className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3" step={50}>
            {PARTNER_CATEGORIES.map((cat) => (
              <div
                key={cat.title}
                className="surface-card gw-card-hover flex flex-col gap-2 p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h3 className="font-display text-base font-semibold text-white">
                    {cat.title}
                  </h3>
                  <span
                    className="shrink-0 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider"
                    style={{
                      color: cat.accent,
                      borderColor: `${cat.accent}30`,
                      backgroundColor: `${cat.accent}0d`,
                    }}
                  >
                    {cat.fit}
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-ink-300">
                  {cat.description}
                </p>
              </div>
            ))}
          </Stagger>
        </WorldSection>

        <SignalRule className="mx-auto max-w-5xl px-4" />

        {/* ── Not accepted — compliance block */}
        <section className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <p className="gw-chapter-index">
                <span className="text-orbital-cyan">03</span>
                Non-negotiable exclusions
              </p>
              <h2 className="mt-4 max-w-3xl font-display text-display-lg font-semibold text-balance text-white">
                What we{" "}
                <span className="gse-editorial gw-chrome-plasma">do not</span>{" "}
                currently partner with.
              </h2>
            </Reveal>
            <Stagger className="mt-8 flex flex-col gap-3" step={60}>
              {NOT_ACCEPTED.map((item) => (
                <div
                  key={item}
                  className="surface-card gw-card-hover flex items-start gap-4 p-5"
                >
                  <span
                    aria-hidden="true"
                    className="mt-0.5 shrink-0 font-mono text-sm font-bold"
                    style={{ color: BRAND_COLORS.ionMagenta }}
                  >
                    ✗
                  </span>
                  <p className="text-sm leading-relaxed text-ink-300">{item}</p>
                </div>
              ))}
            </Stagger>
            <Reveal delay={200}>
              <p className="mt-6 text-xs text-ink-500">
                Sportsbook and casino affiliates may be considered in the future
                only after a full compliance review, geo-restriction mapping, and
                owner approval — with explicit FTC-compliant disclosure on every
                placement. They are not part of the current partnership program.
              </p>
            </Reveal>
          </div>
        </section>

        {/* ── CTA — nebula-deep */}
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
              <span className="gw-chip-cyan">Partnership inquiry</span>
              <h2 className="mt-6 font-display text-display-lg font-semibold leading-[1.05] text-balance text-white">
                Tell us about your brand.{" "}
                <span className="gse-editorial text-orbital-cyan gw-text-glow-cyan">
                  We will respond.
                </span>
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-ink-300">
                Tell us about your brand and what kind of collaboration makes
                sense. Every inquiry is reviewed personally. If there is a fit,
                we will respond within a few business days.
              </p>
            </Reveal>
            <Reveal delay={120}>
              <div className="mt-9 flex flex-wrap justify-center gap-3">
                <a
                  href={`mailto:${SUPPORT_EMAIL}?subject=Partnership Inquiry`}
                  className="btn btn-primary"
                >
                  Send an inquiry →
                </a>
                <Link href="/affiliate-disclosure" className="btn btn-ghost">
                  Disclosure policy
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
