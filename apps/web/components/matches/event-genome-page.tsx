/**
 * Shared shell for the three /matches/preview/[slug] routes — Nav + EventGenomeView + Footer.
 *
 * Keeps each route file thin and identical in shape: pick the fixture slug, read the active view from the
 * URL (?view=), render. Fixture-only — no DB, no network. `genomeMetadata` builds noindex metadata from
 * the same fixture so the preview is never indexed as a live page.
 */

import type { Metadata } from "next";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { EventGenomeView } from "@/components/matches/event-genome-view";
import {
  buildEventGenomePreview,
  resolveView,
  type PreviewSlug,
} from "@/lib/matches/event-genome-preview";

export function genomeMetadata(slug: PreviewSlug): Metadata {
  const { genome: g } = buildEventGenomePreview(slug);
  const title = `${g.participants[0].name} vs ${g.participants[1].name} — Event Genome`;
  return {
    title,
    description:
      "Every stat with a passport, every prediction on trial, every market with a lifecycle, and one record of exactly what GSE is allowed to claim. Fixture preview — illustrative, not advice.",
    robots: { index: false, follow: false },
  };
}

export async function EventGenomePage({
  slug,
  searchParams,
}: {
  slug: PreviewSlug;
  searchParams: Promise<{ view?: string }>;
}): Promise<JSX.Element> {
  const sp = await searchParams;
  const view = resolveView(sp.view);
  const preview = buildEventGenomePreview(slug);
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-3xl px-4 py-12">
        <EventGenomeView preview={preview} pathname={`/matches/preview/${slug}`} view={view} />
      </main>
      <Footer />
    </>
  );
}
