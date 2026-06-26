/**
 * /meaning/preview — the Meaning Compiler vertical slice (instrument-grade, fixture-only).
 *
 * GSE does not build pages; GSE compiles meaning. This route is a renderer of compiled ClaimObjects:
 * no DB, no live odds, no affiliate links, robots:noindex. The active instrument view is read from the
 * URL (?view=), so the page is server-rendered and shareable.
 */

import type { Metadata } from "next";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { MeaningPreviewView } from "@/components/meaning/meaning-preview-view";
import { buildMeaningPreview, resolveMeaningView } from "@/lib/meaning/meaning-preview";

export const metadata: Metadata = {
  title: "The Meaning Compiler — preview",
  description:
    "GSE compiles meaning. Every stat, trend, prediction, market, bonus, and source becomes one governed ClaimObject. Fixture preview — illustrative, not advice.",
  robots: { index: false, follow: false },
};

export default async function MeaningPreviewPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const sp = await searchParams;
  const view = resolveMeaningView(sp.view);
  const preview = buildMeaningPreview(view);
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-5xl px-4 py-12">
        <MeaningPreviewView preview={preview} view={view} />
      </main>
      <Footer />
    </>
  );
}
