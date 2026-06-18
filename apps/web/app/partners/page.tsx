import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { Reveal, Stagger } from "@/components/motion/reveal";
import { BRAND_NAME, BRAND_COLORS, SUPPORT_EMAIL } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Partners — Galaxy Sports Edge",
  description:
    "Partner with Galaxy Sports Edge — sports intelligence media. Content partnerships, newsletter swaps, local business collaborations, and more. We are not a sportsbook.",
  alternates: { canonical: "/partners" },
};

const PARTNER_CATEGORIES = [
  {
    title: "Fantasy Tools & Platforms",
    description:
      "Fantasy sports tools, roster platforms, and DFS analytics services whose audience overlaps with people who make data-informed lineup decisions.",
    fit: "High — shared audience of analytically minded sports fans",
  },
  {
    title: "Sports Bars & Game Venues",
    description:
      "Local and regional sports bars, viewing party venues, and game-watching experiences, especially in the Houston area. Game Night Packs available.",
    fit: "High — local trust engine and community activation",
  },
  {
    title: "Sports Apparel & Merchandise",
    description:
      "Apparel brands that speak to the sports identity layer — performance wear, fan gear, or brands with a niche intelligence / data culture angle.",
    fit: "Medium to high — audience identity alignment",
  },
  {
    title: "Training Facilities & Equipment",
    description:
      "Performance training facilities, sports conditioning equipment, and recovery brands that serve athletes and serious sports fans.",
    fit: "Medium — shared values around preparation and process",
  },
  {
    title: "Ticketing Platforms",
    description:
      "Primary and resale ticket platforms that offer value to sports fans making game attendance decisions.",
    fit: "Medium — functional value for the same audience",
  },
  {
    title: "Sports Podcasts & Newsletters",
    description:
      "Newsletter and podcast swaps with sports-adjacent creators who share our anti-hype, intelligence-first values. Not tout services.",
    fit: "High — audience overlap + co-credentialing",
  },
  {
    title: "Creator Tools",
    description:
      "Video, audio, and content creation tools used by sports content creators. Relevant to our own production stack and creator network.",
    fit: "Medium — overlap with creator-facing audience",
  },
  {
    title: "Local Houston Sports Businesses",
    description:
      "Houston-area sports businesses of all kinds — including youth leagues, training academies, sports media outlets, and community organizations.",
    fit: "High — local roots, community trust",
  },
  {
    title: "Sports Analytics & Data Software",
    description:
      "Analytics platforms and data tools built for serious sports fans, bettors, or fantasy players who want to understand numbers, not just consume picks.",
    fit: "High — audience values match exactly",
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
    name: "Sponsor Placement",
    description:
      "Paid placement in our newsletter, Desk briefs, YouTube content, or podcast. Brand is disclosed, not embedded as editorial. See the media kit for rate ranges.",
    href: "/media-kit",
    cta: "See media kit",
  },
  {
    name: "Content / Newsletter Swap",
    description:
      "We mention your publication to our list; you mention ours. No money changes hands. Both audiences are relevant and comparable in values.",
    href: null,
    cta: null,
  },
  {
    name: "Local Business Collaboration",
    description:
      "Game Night Packs, co-branded content, and event tie-ins for Houston-area sports businesses. Practical, community-first activations.",
    href: null,
    cta: null,
  },
  {
    name: "Creator Network",
    description:
      "Sports content creators who want access to our intelligence stack, data tools, and affiliate/referral infrastructure. Requires a values alignment review.",
    href: null,
    cta: null,
  },
] as const;

export default function PartnersPage() {
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
              Partnerships
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
              Work with a brand that builds on{" "}
              <span
                style={{
                  background: `linear-gradient(90deg, ${BRAND_COLORS.softUltraviolet} 0%, ${BRAND_COLORS.orbitalCyan} 100%)`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                trust, not hype.
              </span>
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-ink-300">
              {BRAND_NAME} is a sports intelligence media company. We are
              building audience the hard way — by being honest about what we
              know, what we do not know, and when the right call is to not act
              at all. We partner with brands and creators that share those values.
            </p>
          </Reveal>
          <Reveal delay={220}>
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
          </Reveal>
        </section>

        {/* What a partnership looks like */}
        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <p
                className="font-mono text-[10px] uppercase tracking-[0.18em]"
                style={{ color: BRAND_COLORS.orbitalCyan }}
              >
                Partnership types
              </p>
              <h2
                className="mt-3 font-display text-white"
                style={{
                  fontSize: "clamp(1.5rem, 3vw, 2.2rem)",
                  lineHeight: 1.15,
                }}
              >
                What working together looks like.
              </h2>
            </Reveal>
            <Stagger className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2" step={70}>
              {PARTNERSHIP_TYPES.map((pt) => (
                <div
                  key={pt.name}
                  className="rounded-xl border p-6"
                  style={{
                    borderColor: `${BRAND_COLORS.orbitalCyan}18`,
                    backgroundColor: `${BRAND_COLORS.steelGray}40`,
                  }}
                >
                  <p className="font-semibold text-white">{pt.name}</p>
                  <p className="mt-2 text-sm leading-relaxed text-ink-300">
                    {pt.description}
                  </p>
                  {pt.href && pt.cta && (
                    <Link
                      href={pt.href}
                      className="mt-3 inline-block text-xs font-semibold underline underline-offset-4"
                      style={{ color: BRAND_COLORS.orbitalCyan }}
                    >
                      {pt.cta} →
                    </Link>
                  )}
                </div>
              ))}
            </Stagger>
          </div>
        </section>

        {/* Partner categories */}
        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <p
                className="font-mono text-[10px] uppercase tracking-[0.18em]"
                style={{ color: BRAND_COLORS.softUltraviolet }}
              >
                Partner fit
              </p>
              <h2
                className="mt-3 font-display text-white"
                style={{
                  fontSize: "clamp(1.5rem, 3vw, 2.2rem)",
                  lineHeight: 1.15,
                }}
              >
                Categories we work with.
              </h2>
              <p className="mt-3 max-w-2xl text-sm text-ink-400">
                All partnerships go through a brand-fit review. We are selective
                — not to be difficult, but because the audience we are building
                trusts us to be. Categories listed here are broadly approved;
                individual brands are still reviewed.
              </p>
            </Reveal>
            <Stagger className="mt-8 flex flex-col gap-4" step={50}>
              {PARTNER_CATEGORIES.map((cat) => (
                <div
                  key={cat.title}
                  className="rounded-xl border p-5"
                  style={{
                    borderColor: `${BRAND_COLORS.softUltraviolet}18`,
                    backgroundColor: `${BRAND_COLORS.steelGray}40`,
                  }}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <p className="font-semibold text-white">{cat.title}</p>
                    <span
                      className="shrink-0 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider"
                      style={{
                        color: BRAND_COLORS.orbitalCyan,
                        borderColor: `${BRAND_COLORS.orbitalCyan}30`,
                        backgroundColor: `${BRAND_COLORS.orbitalCyan}0d`,
                      }}
                    >
                      {cat.fit}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-ink-300">
                    {cat.description}
                  </p>
                </div>
              ))}
            </Stagger>
          </div>
        </section>

        {/* Not accepted */}
        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <div
                className="rounded-2xl border p-6"
                style={{
                  borderColor: `${BRAND_COLORS.ionMagenta}22`,
                  background: `radial-gradient(ellipse 60% 80% at 50% 0%, ${BRAND_COLORS.ionMagenta}06, transparent 70%)`,
                }}
              >
                <p
                  className="font-mono text-[10px] uppercase tracking-[0.18em]"
                  style={{ color: BRAND_COLORS.ionMagenta }}
                >
                  Not accepted
                </p>
                <h3 className="mt-2 font-display text-lg text-white">
                  Categories we do not currently partner with.
                </h3>
                <ul className="mt-4 flex flex-col gap-2">
                  {NOT_ACCEPTED.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-3 text-sm text-ink-300"
                    >
                      <span
                        className="mt-0.5 shrink-0 font-mono text-xs"
                        style={{ color: BRAND_COLORS.ionMagenta }}
                      >
                        ✗
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-xs text-ink-500">
                  Sportsbook and casino affiliates may be considered in the future
                  only after a full compliance review, geo-restriction mapping,
                  and owner approval — with explicit FTC-compliant disclosure on
                  every placement. They are not part of the current partnership
                  program.
                </p>
              </div>
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
                  Partnership inquiry
                </p>
                <h2
                  className="mt-3 font-display text-white"
                  style={{
                    fontSize: "clamp(1.5rem, 3vw, 2.2rem)",
                    lineHeight: 1.15,
                  }}
                >
                  Let&rsquo;s talk.
                </h2>
                <p className="mt-4 max-w-xl text-base leading-7 text-ink-300">
                  Tell us about your brand and what kind of collaboration makes
                  sense. Every inquiry is reviewed personally. If there is a fit,
                  we will respond within a few business days.
                </p>
                <div className="mt-7 flex flex-wrap gap-3">
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
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
