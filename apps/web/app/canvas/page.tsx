import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { RiskDisclosure } from "@/components/ui/risk-disclosure";
import { TrustStrip } from "@/components/trust";
import { SlateCanvas, type SlateCanvasNode } from "@/components/canvas/SlateCanvas";
import { isFeatureEnabled } from "@/lib/release/feature-flags";
import { loadBoardState } from "@/lib/board/state";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Slate Canvas — Galaxy Sports Edge",
  description: "The slate as a navigable spatial galaxy. Each game orbits the model center, sized by edge index.",
};

export default async function CanvasPage(): Promise<JSX.Element> {
  if (!isFeatureEnabled("SLATE_CANVAS_ENABLED")) {
    redirect("/today");
  }

  const result = await loadBoardState(new Date());
  const rows = [...result.data.publishedToday, ...result.data.scoringNow];

  const nodes: ReadonlyArray<SlateCanvasNode> = rows.map((row) => {
    const edgeIndex = Math.round(row.edgeIndex ?? 50);
    const confidence = Math.round(row.confidence ?? 60);
    const band = confidence >= 80 ? "Elite" : confidence >= 70 ? "High" : confidence >= 60 ? "Moderate" : "Low";
    return {
      gameId: row.gameId,
      matchup: row.matchup,
      sport: row.sport,
      edgeIndex,
      confidence,
      bandLabel: band,
    };
  });

  return (
    <div className="min-h-screen bg-carbon text-gray-100">
      <Nav />
      <main className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-12 sm:px-6 lg:px-8">

        <TrustStrip
          surfaceId="canvas"
          source="galaxy-model"
          freshness={nodes.length > 0 ? "fresh" : "unknown"}
          surfaceKind="decision-quality"
          tier="all"
          uncertainty={nodes.length > 0 ? "live" : "sample"}
          showMethodology
          showResponsiblePlay
        />

        <header className="border-b border-mineral pb-10">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ion-blue">
            Spatial view
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-5xl">
            Slate Canvas
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-gray-400">
            Today&apos;s slate as a spatial map. Each game orbits the model center. Distance reflects edge index;
            size and color reflect confidence. Hover for the matchup. Click to open the Decision Room.
          </p>
        </header>

        {nodes.length === 0 ? (
          <section className="rounded-2xl border border-mineral bg-gray-900/40 p-10 text-center">
            <p className="font-mono text-[10px] uppercase tracking-widest text-gray-500">
              Empty canvas
            </p>
            <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-gray-400">
              No games are active on the slate right now. Canvas populates as the model evaluates published or
              scoring-now games for the day.
            </p>
          </section>
        ) : (
          <SlateCanvas nodes={nodes} />
        )}

        <section className="border-t border-mineral pt-10 text-center">
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/today"
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-ion-blue px-6 text-sm font-bold text-carbon hover:opacity-90"
            >
              Open the list view
            </Link>
            <Link
              href="/methodology"
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-gray-700 px-6 text-sm font-bold text-gray-200 hover:border-cyan-400 hover:text-cyan-100"
            >
              Read the methodology
            </Link>
          </div>
        </section>

        <RiskDisclosure variant="compact" className="text-center" />
      </main>
      <Footer />
    </div>
  );
}
