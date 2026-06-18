import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { Reveal } from "@/components/motion/reveal";
import { BRAND_NAME, BRAND_COLORS, LEGAL_EMAIL } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Affiliate & Sponsorship Disclosure — Galaxy Sports Edge",
  description:
    "Galaxy Sports Edge affiliate and sponsorship disclosure. No active affiliate relationships as of June 2026. We disclose every material connection clearly, in plain language, at the point of placement.",
  alternates: { canonical: "/affiliate-disclosure" },
  openGraph: {
    title: `Affiliate & Sponsorship Disclosure — ${BRAND_NAME}`,
    description:
      "No active affiliate relationships. Full disclosure policy, FTC compliance posture, and sportsbook-affiliate status — plain language, updated whenever arrangements change.",
    type: "website",
  },
};

export default function AffiliateDisclosurePage() {
  return (
    <div
      className="flex min-h-screen flex-col"
      style={{ backgroundColor: BRAND_COLORS.obsidianBlack }}
    >
      <Nav />

      <main id="main-content" className="flex-1">
        <section className="mx-auto max-w-3xl px-4 py-20 sm:px-6 lg:px-8">
          <Reveal>
            <span
              className="inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em]"
              style={{
                color: BRAND_COLORS.orbitalCyan,
                borderColor: `${BRAND_COLORS.orbitalCyan}30`,
                backgroundColor: `${BRAND_COLORS.orbitalCyan}0d`,
              }}
            >
              Legal · Compliance
            </span>
          </Reveal>
          <Reveal delay={90}>
            <h1
              className="mt-5 font-display text-white"
              style={{
                fontSize: "clamp(1.8rem, 4vw, 3rem)",
                lineHeight: 1.1,
                letterSpacing: "-0.01em",
              }}
            >
              Affiliate &amp; Sponsorship Disclosure
            </h1>
          </Reveal>
          <Reveal delay={140}>
            <p className="mt-4 text-sm text-ink-500">
              Last updated: June 2026. This page is updated whenever our
              affiliate or sponsorship arrangements change.
            </p>
          </Reveal>

          <div className="mt-12 flex flex-col gap-10">
            {/* Section 1 — Who we are */}
            <Reveal>
              <section>
                <h2 className="font-display text-lg font-semibold text-white">
                  1. Who we are
                </h2>
                <div className="mt-3 flex flex-col gap-3 text-sm leading-7 text-ink-300">
                  <p>
                    {BRAND_NAME} is a sports intelligence and media company. We
                    publish calibrated signals, analysis, and decision-support
                    content for sports fans. We are not a sportsbook, not a
                    gambling operator, and we do not accept wagers.
                  </p>
                  <p>
                    Our revenue comes from subscriptions, sponsorships, and
                    eventually from carefully reviewed affiliate partnerships.
                    This page discloses all of those relationships in plain
                    language.
                  </p>
                </div>
              </section>
            </Reveal>

            {/* Section 2 — Current status */}
            <Reveal>
              <section
                className="rounded-xl border p-6"
                style={{
                  borderColor: `${BRAND_COLORS.orbitalCyan}22`,
                  backgroundColor: `${BRAND_COLORS.steelGray}40`,
                }}
              >
                <h2 className="font-display text-lg font-semibold text-white">
                  2. Current affiliate and sponsorship status
                </h2>
                <div className="mt-3 flex flex-col gap-3 text-sm leading-7 text-ink-300">
                  <p>
                    <strong className="text-white">
                      As of June 2026, {BRAND_NAME} has no active affiliate
                      relationships.
                    </strong>{" "}
                    We do not currently receive compensation for recommending,
                    linking to, or promoting any third-party product or service
                    through an affiliate arrangement.
                  </p>
                  <p>
                    <strong className="text-white">
                      Sponsorships:
                    </strong>{" "}
                    We are in the process of building our sponsorship program.
                    There are currently no active paid sponsor placements on any
                    of our content surfaces. When sponsor placements go live,
                    they will be disclosed clearly at the point of placement
                    (e.g., &ldquo;Sponsored by [Brand]&rdquo; or &ldquo;This
                    content is supported by [Brand]&rdquo;).
                  </p>
                  <p>
                    This page will be updated promptly when any affiliate or
                    sponsorship arrangement becomes active.
                  </p>
                </div>
              </section>
            </Reveal>

            {/* Section 3 — How we disclose */}
            <Reveal>
              <section>
                <h2 className="font-display text-lg font-semibold text-white">
                  3. How we disclose material connections
                </h2>
                <div className="mt-3 flex flex-col gap-3 text-sm leading-7 text-ink-300">
                  <p>
                    {BRAND_NAME} follows the Federal Trade Commission (FTC)
                    guidelines on endorsements and testimonials (16 C.F.R.
                    Part 255). When we have a material connection to a brand,
                    product, or service — whether through compensation, a free
                    product, an affiliate commission, or any other benefit — we
                    will disclose it clearly and conspicuously at or near the
                    point where the relevant content appears.
                  </p>
                  <p>
                    Disclosures will be written in plain language, not buried in
                    fine print, not disguised as organic content, and not placed
                    where a reasonable reader would miss them. Examples of
                    disclosure language we use:
                  </p>
                  <ul className="ml-4 flex flex-col gap-1.5 list-disc list-outside text-ink-400">
                    <li>
                      &ldquo;Sponsored by [Brand] — we were paid to include this
                      placement.&rdquo;
                    </li>
                    <li>
                      &ldquo;Affiliate link — if you purchase through this link,
                      we may earn a commission at no extra cost to you.&rdquo;
                    </li>
                    <li>
                      &ldquo;[Brand] is a paid sponsor of this newsletter
                      issue.&rdquo;
                    </li>
                  </ul>
                  <p>
                    Editorial content — picks, analysis, No-Bet calls, and
                    calibration data — is never influenced by sponsorship or
                    affiliate relationships. Our signals come from data and model
                    output, not from who is paying us.
                  </p>
                </div>
              </section>
            </Reveal>

            {/* Section 4 — Sportsbook / casino policy */}
            <Reveal>
              <section
                className="rounded-xl border p-6"
                style={{
                  borderColor: `${BRAND_COLORS.ionMagenta}22`,
                  backgroundColor: `${BRAND_COLORS.steelGray}40`,
                }}
              >
                <h2 className="font-display text-lg font-semibold text-white">
                  4. Sportsbook and casino affiliate policy
                </h2>
                <div className="mt-3 flex flex-col gap-3 text-sm leading-7 text-ink-300">
                  <p>
                    <strong className="text-white">
                      {BRAND_NAME} does not currently use sportsbook or casino
                      affiliates.
                    </strong>
                  </p>
                  <p>
                    These relationships are explicitly deferred. If and when we
                    evaluate them in the future, the following gates must be
                    cleared before any activation:
                  </p>
                  <ul className="ml-4 flex flex-col gap-1.5 list-disc list-outside text-ink-400">
                    <li>Full internal compliance review</li>
                    <li>
                      Geo-restriction mapping — sportsbook advertising and
                      affiliate relationships are subject to state-by-state
                      regulatory requirements across the United States, and
                      equivalent requirements in other jurisdictions
                    </li>
                    <li>
                      Explicit FTC-compliant disclosure language at every
                      placement
                    </li>
                    <li>Owner approval</li>
                    <li>Responsible-play integration on every associated page</li>
                  </ul>
                  <p>
                    We do not treat gambling affiliate revenue as a routine
                    income source. If it is ever used, it will be a minority
                    component — clearly disclosed, geo-restricted, and never the
                    face of the brand.
                  </p>
                </div>
              </section>
            </Reveal>

            {/* Section 5 — What we do not do */}
            <Reveal>
              <section>
                <h2 className="font-display text-lg font-semibold text-white">
                  5. What we do not do
                </h2>
                <div className="mt-3 flex flex-col gap-3 text-sm leading-7 text-ink-300">
                  <ul className="ml-4 flex flex-col gap-1.5 list-disc list-outside text-ink-400">
                    <li>
                      We do not receive compensation for specific pick
                      recommendations. Picks are model output and editorial
                      judgment, never purchased placement.
                    </li>
                    <li>
                      We do not operate a &ldquo;tipping service&rdquo; or tout
                      operation. Our signals include the full factor breakdown
                      and a confidence score that shows you our uncertainty, not
                      just our top-line conclusion.
                    </li>
                    <li>
                      We do not make outcome claims based on affiliate incentives.
                      A pick is never inflated to serve a sponsor.
                    </li>
                    <li>
                      We do not use disguised advertising. Every sponsored
                      placement is labeled. Every affiliate link is disclosed.
                    </li>
                  </ul>
                </div>
              </section>
            </Reveal>

            {/* Section 6 — Third-party links */}
            <Reveal>
              <section>
                <h2 className="font-display text-lg font-semibold text-white">
                  6. Third-party links
                </h2>
                <div className="mt-3 flex flex-col gap-3 text-sm leading-7 text-ink-300">
                  <p>
                    Our content may include links to third-party websites,
                    platforms, and services. Unless a link is marked as an
                    affiliate link or sponsored, it is included for informational
                    purposes only. We do not receive compensation for unlabeled
                    third-party links.
                  </p>
                  <p>
                    We are not responsible for the content, accuracy, or
                    practices of third-party sites. A link is not an endorsement
                    of everything on that site.
                  </p>
                </div>
              </section>
            </Reveal>

            {/* Section 7 — Contact */}
            <Reveal>
              <section>
                <h2 className="font-display text-lg font-semibold text-white">
                  7. Questions about this disclosure
                </h2>
                <div className="mt-3 text-sm leading-7 text-ink-300">
                  <p>
                    If you have questions about our affiliate or sponsorship
                    relationships, or if you believe we have not disclosed a
                    material connection correctly, contact us at{" "}
                    <a
                      href={`mailto:${LEGAL_EMAIL}`}
                      className="font-mono underline underline-offset-4"
                      style={{ color: BRAND_COLORS.orbitalCyan }}
                    >
                      {LEGAL_EMAIL}
                    </a>
                    . We take compliance seriously and will respond to all
                    reasonable disclosure inquiries.
                  </p>
                </div>
              </section>
            </Reveal>

            {/* Navigation */}
            <Reveal>
              <div className="flex flex-wrap gap-3 border-t pt-8" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                <Link href="/partners" className="btn btn-ghost btn-sm">
                  ← Partner options
                </Link>
                <Link href="/media-kit" className="btn btn-ghost btn-sm">
                  Media kit
                </Link>
                <Link href="/responsible-play" className="btn btn-ghost btn-sm">
                  Responsible play
                </Link>
                <Link href="/terms" className="btn btn-ghost btn-sm">
                  Terms &amp; Privacy
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
