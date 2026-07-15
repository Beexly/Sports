import type { Metadata } from "next";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { Reveal } from "@/components/motion/reveal";
import { Atmosphere } from "@/components/ui/atmosphere";
import { TheBeat } from "@/components/news/the-beat";
import {
  WIRE_EMPTY_DISCLAIMER,
  WIRE_OUTAGE_DISCLAIMER,
  WIRE_PUBLISHED_DISCLAIMER,
  WIRE_UNAVAILABLE_DISCLAIMER,
} from "@/lib/news/wire";
import { loadPublicWire } from "@/lib/news/public-wire";
import { BRAND_COLORS } from "@/lib/brand";

export const metadata: Metadata = {
  title: "The Beat · Source-Attributed Signal Ledger",
  description:
    "Headlines from publication-approved sports feeds, ranked by source tier, freshness, and modeled impact. The public ledger remains empty when no feed is approved.",
  alternates: { canonical: "/the-beat" },
};

export default async function TheBeatPage() {
  const wireResult = await loadPublicWire({
    publicationApproved:
      process.env["NEWS_WIRE_PUBLICATION_APPROVED"] === "true",
    approvedFeedIds: process.env["NEWS_RSS_APPROVED_FEED_IDS"],
  });
  const disclaimer =
    wireResult?.status === "AVAILABLE" && wireResult.items.length > 0
      ? WIRE_PUBLISHED_DISCLAIMER
      : wireResult?.status === "AVAILABLE"
        ? WIRE_EMPTY_DISCLAIMER
        : wireResult?.status === "OUTAGE"
          ? WIRE_OUTAGE_DISCLAIMER
          : WIRE_UNAVAILABLE_DISCLAIMER;

  return (
    <div
      className="flex min-h-screen flex-col"
      style={{ backgroundColor: BRAND_COLORS.obsidianBlack }}
    >
      <Atmosphere />
      <Nav />

      <main id="main-content" className="flex-1">
        <section className="relative isolate overflow-hidden px-4 pb-10 pt-24 sm:px-6 lg:px-8">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-96"
            style={{
              background: `radial-gradient(55% 80% at 50% 0%, ${BRAND_COLORS.orbitalCyan}16, transparent 70%)`,
            }}
          />
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <p
                className="eyebrow"
                style={{ color: BRAND_COLORS.orbitalCyan }}
              >
                The Beat · Publication status
              </p>
            </Reveal>
            <Reveal delay={90}>
              <h1
                className="mt-5 max-w-3xl font-display text-balance text-white"
                style={{
                  fontSize: "clamp(2.4rem, 7vw, 5rem)",
                  lineHeight: 0.98,
                  letterSpacing: "-0.02em",
                }}
              >
                Sports reports, <span className="gse-editorial">only when sourced</span>.
              </h1>
            </Reveal>
            <Reveal delay={160}>
              <p className="mt-5 max-w-2xl text-lg text-ink-300">
                Headlines from feeds in the source-controlled publication
                registry can be ranked by source tier, freshness, and modeled
                impact. If no approved feed is selected, this page stays empty.
              </p>
            </Reveal>
            <Reveal delay={220}>
              <div
                className="surface-card mt-8 max-w-2xl p-5"
                role="status"
                aria-label="Broadcast publication status"
              >
                <span
                  className="inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em]"
                  style={{
                    background: `${BRAND_COLORS.steelGray}66`,
                    color: BRAND_COLORS.ionWhite,
                  }}
                >
                  Broadcast off air
                </span>
                <p className="mt-3 text-sm font-medium text-white">
                  No audio or video broadcast edition is published right now.
                </p>
                <p className="mt-1 text-xs leading-5 text-ink-400">
                  Studio drafts and illustrative scripts remain in producer
                  tools. They are never presented here as current reporting.
                </p>
              </div>
            </Reveal>
          </div>
        </section>

        <section className="px-4 pb-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <div className="flex flex-col gap-2 pt-2">
                <p
                  className="eyebrow"
                  style={{ color: BRAND_COLORS.orbitalCyan }}
                >
                  The Signal Ledger
                </p>
                <h2 className="font-display text-2xl font-semibold text-white sm:text-3xl">
                  Attributed feed headlines, scored after ingestion.
                </h2>
                <p className="max-w-2xl text-sm leading-6 text-ink-300">
                  Headlines retrieved from approved feed sources are ranked by
                  source tier and freshness. Impact values are model estimates,
                  not measured line movement or claims made by the source.
                </p>
              </div>
            </Reveal>
            <div className="mt-8">
              <TheBeat wireResult={wireResult} />
            </div>
            <Reveal delay={120}>
              <p className="mt-6 text-xs leading-relaxed text-ion-2">
                {disclaimer}
              </p>
            </Reveal>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
