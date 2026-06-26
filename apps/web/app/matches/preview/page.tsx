/**
 * /matches/preview — index of the Event Genome proof slices.
 *
 * Three fixtures, one per sport family, each a rights-safe "truth architecture" answer to a match page.
 * Fixture-only: no DB, no live odds, no affiliate links. Public-safe copy (scanned by the strong
 * public-copy test). Links carry no query so each match opens on its Overview view.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { PREVIEW_SLUGS, buildEventGenomePreview } from "@/lib/matches/event-genome-preview";

export const metadata: Metadata = {
  title: "Event Genome — proof previews",
  description:
    "GSE's rights-safe answer to a match page: every stat carries a passport, every prediction is on trial, every market has a lifecycle. Fixture previews — illustrative, not advice.",
  robots: { index: false, follow: false },
};

export default function MatchesPreviewIndex() {
  const cards = PREVIEW_SLUGS.map((slug) => {
    const p = buildEventGenomePreview(slug);
    return { slug, g: p.genome, counts: { stats: p.derivedStats.length, trends: p.trends.length, trials: p.trials.length } };
  });

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-3xl space-y-8 px-4 py-12">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.18em] text-ink-2">Event Genome · fixture previews</p>
          <h1 className="text-3xl font-bold text-ink">The living anatomy of a match</h1>
          <p className="text-ink-1">
            A scoreboard shows the result. GSE shows what the data is allowed to mean — every number with a passport,
            every call on trial, every market with a lifecycle, and one plain-English record of exactly what we&apos;re
            allowed to claim. These are offline fixtures: illustrative, not advice.
          </p>
        </header>

        <div className="grid gap-4">
          {cards.map(({ slug, g, counts }) => (
            <Link
              key={slug}
              href={`/matches/preview/${slug}`}
              className="rounded-2xl border border-paper-border bg-paper-raised p-5 transition-colors hover:bg-paper-sunken"
            >
              <p className="text-xs uppercase tracking-[0.18em] text-ink-2">
                {g.league} · {g.status}
              </p>
              <p className="mt-1 text-lg font-semibold text-ink">
                {g.participants[0].name} {g.scoreState.final ? `${g.scoreState.home}–${g.scoreState.away}` : "vs"}{" "}
                {g.participants[1].name}
              </p>
              <p className="mt-1 text-sm text-ink-2">
                {counts.stats} stat passports · {counts.trends} trends on trial · {counts.trials} predictions on trial
              </p>
            </Link>
          ))}
        </div>

        <p className="border-t border-paper-border pt-4 text-xs text-ink-2">
          Fixture data · offline · no live odds · no affiliate links · no spend. Illustrative only — not betting advice
          and not a performance claim.
        </p>
      </main>
      <Footer />
    </>
  );
}
