import type { Metadata } from "next";
import Link from "next/link";
import { PlayerLabTable } from "@/components/players/player-lab-table";
import { Attribution } from "@/components/ui/attribution";
import { Footer } from "@/components/ui/footer";
import { MetricExplainer } from "@/components/ui/metric-explainer";
import { Nav } from "@/components/ui/nav";
import { PageHero } from "@/components/ui/page-hero";
import { SourceError } from "@/components/ui/source-error";
import { Tabs } from "@/components/ui/tabs";
import { PLAYER_VIEWS, resolvePlayerView, type ViewResult } from "@/lib/players/views";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // heavy nflverse loads need headroom

export const metadata: Metadata = {
  title: "Player Lab — Production, Snaps, Next Gen, Edge & Market in One Surface",
  description:
    "One tabbed Player Lab over the engine's live intake layer: season production & last-5 form, snap share, receiving/rushing opportunity, Next Gen tracking, pressure & coverage, combine, QBR, edge signals, injuries, market moves, and licensed DFS salaries. Settled facts, honest empty states — never fabricated.",
  alternates: { canonical: "/players" },
};

const PATHNAME = "/players";

interface PlayersPageProps {
  searchParams?: { view?: string };
}

export default async function PlayersPage({ searchParams }: PlayersPageProps): Promise<JSX.Element> {
  const requested = searchParams?.view;
  const view = resolvePlayerView(requested);

  // Load only the active view's data — the lab is one view at a time.
  let result: ViewResult | null = null;
  let loadError: string | null = null;
  try {
    result = await view.load();
  } catch (error) {
    loadError = error instanceof Error ? error.message : "UNKNOWN";
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      <Nav />
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <PageHero
          eyebrow={view.eyebrow}
          title={view.title}
          description={view.description}
          actions={
            <Link
              href={view.jsonHref}
              className="inline-flex min-h-11 items-center justify-center rounded-ds-sm border border-paper-border px-5 py-3 text-sm font-semibold text-ink hover:border-ink-1"
              title="The raw rows behind this table, as machine-readable JSON"
            >
              Raw data (JSON)
            </Link>
          }
          aside={
            view.explainer && view.explainer.length > 0 ? (
              <MetricExplainer terms={view.explainer} />
            ) : undefined
          }
        />

        <Tabs
          param="view"
          active={view.slug}
          pathname={PATHNAME}
          ariaLabel="Player Lab views"
          currentParams={searchParams}
          items={PLAYER_VIEWS.map((v) => ({
            value: v.slug,
            label: v.label,
            tooltip: v.tabTooltip,
          }))}
        />

        {loadError || !result || result.status === "source-error" ? (
          <SourceError
            reason={
              loadError
                ? `This view could not load. ${loadError}`
                : (result?.error ?? "UNKNOWN")
            }
          />
        ) : (
          <>
            {result.windowLabel ? (
              <p className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-ink-2">
                Source window · {result.windowLabel}
              </p>
            ) : null}

            <PlayerLabTable sections={result.sections} />

            {result.sourceIds.length > 0 ? (
              <Attribution sourceIds={result.sourceIds} className="!text-ink-2" />
            ) : null}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
