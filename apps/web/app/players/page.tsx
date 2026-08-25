import type { Metadata } from "next";
import Link from "next/link";
import { PlayerLabTable } from "@/components/players/player-lab-table";
import { Attribution } from "@/components/ui/attribution";
import { Footer } from "@/components/ui/footer";
import { MetricExplainer } from "@/components/ui/metric-explainer";
import { Nav } from "@/components/ui/nav";
import { PageHero } from "@/components/ui/page-hero";
import { SourceError } from "@/components/ui/source-error";
import { PlayerLensRail } from "@/components/players/player-lens-rail";
import { PLAYER_VIEWS, resolvePlayerView, type ViewResult } from "@/lib/players/views";
import { getViewerEntitlements } from "@/lib/pricing/tier-access";
import { TierGatePanel } from "@/components/pricing/tier-gate-panel";
import { GeneratedPlate } from "@/components/immersive/generated-plate";
import { PlayerCard } from "@/components/cards/player-card";
import { STAT_PLACEHOLDER } from "@/lib/format/stat";
import type { PlayerSeasonLine } from "@/lib/nflverse/player-lab";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // heavy nflverse loads need headroom

export const metadata: Metadata = {
  title: "Player Lab: Production, Snaps, Next Gen, Edge & Market in One Surface",
  description:
    "One tabbed Player Lab over the engine's live intake layer: season production & last-5 form, snap share, receiving/rushing opportunity, Next Gen tracking, pressure & coverage, combine, QBR, edge signals, injuries, market moves, and licensed DFS salaries. Settled facts, honest empty states, never fabricated.",
  alternates: { canonical: "/players" },
  openGraph: {
    title: "Player Lab: Production, Snaps, Next Gen, Edge & Market in One Surface",
    description:
      "One tabbed Player Lab over the engine's live intake layer: production, snaps, Next Gen tracking, pressure/coverage, edge signals, injuries, market moves, and licensed DFS salaries. Settled facts, honest empty states.",
    url: "/players",
  },
};

const PATHNAME = "/players";

/**
 * Per-view "rows + freshness" stamp (POLISH_BACKLOG #2). Every Player Lab view
 * declares its source window, how many real rows sit behind the tables, and
 * when those rows were loaded — so a reader can judge staleness at a glance
 * instead of trusting an unlabeled table.
 */
function ViewFreshnessStamp({ result }: { result: ViewResult }) {
  const rowCount = result.sections.reduce((sum, s) => sum + s.rows.length, 0);
  const refreshed = result.generatedAt
    ? new Date(result.generatedAt).toISOString().replace("T", " ").slice(0, 16) + " UTC"
    : null;
  const parts = [
    result.windowLabel ? `Source window · ${result.windowLabel}` : null,
    `${new Intl.NumberFormat("en-US").format(rowCount)} rows`,
    refreshed ? `refreshed ${refreshed}` : null,
  ].filter(Boolean);
  if (parts.length === 0) return null;
  return (
    <p
      data-testid="player-view-freshness"
      className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-ion-2 tabular-nums"
    >
      {parts.join(" · ")}
    </p>
  );
}

/**
 * Production spotlight — the first-ever "scored" shareable player card, fed by
 * the real #1 season leader on the Production view (settled nflverse data). It
 * only renders when that view loaded real rows; never fabricated.
 */
function ProductionSpotlight({ result, season }: { result: ViewResult; season?: string }) {
  const leaders = result.sections.find((s) => s.kind === "production-leaders");
  const top = leaders?.rows?.[0] as PlayerSeasonLine | undefined;
  if (!top) return null;
  const fmt = (n: number) => (Number.isFinite(n) ? n.toFixed(1) : STAT_PLACEHOLDER);
  return (
    <div className="flex flex-col gap-4 rounded-ds-lg border border-mineral bg-eclipse/40 p-5 lg:flex-row lg:items-center lg:justify-between">
      <div className="max-w-md">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-orbital-cyan">
          Spotlight · season leader
        </p>
        <h2 className="mt-2 font-display text-xl font-semibold text-ion-white">
          The shareable, scored player card
        </h2>
        <p className="mt-2 text-sm leading-6 text-ion-1">
          Built from settled facts, not a projection. Every number on the card
          traces back to real nflverse rows. Screenshot it, share it, check it.
        </p>
      </div>
      <PlayerCard
        rank={1}
        name={top.playerName}
        team={top.team}
        position={top.position}
        headlineValue={fmt(top.pprPerGame)}
        headlineLabel="PPR / game"
        stats={[
          { label: "Last 5", value: fmt(top.last5PprPerGame), tone: "cyan" },
          // Signed + toned like the table's Δ column: cyan up, alert down.
          // (Plasma is earned emphasis and never marks a negative.)
          { label: "Form Δ", value: `${top.last5PprDelta >= 0 ? "+" : ""}${fmt(top.last5PprDelta)}`, tone: top.last5PprDelta >= 0 ? "cyan" : "alert" },
          { label: "Boom%", value: `${Math.round(top.boomRate * 100)}`, tone: "uv" },
          { label: "Games", value: String(top.games), tone: "ion" },
        ]}
        footnote={season ? `${season} · settled nflverse` : "Settled nflverse"}
        className="lg:w-80"
      />
    </div>
  );
}

interface PlayersPageProps {
  searchParams?: { view?: string };
}

export default async function PlayersPage({ searchParams }: PlayersPageProps): Promise<JSX.Element> {
  const requested = searchParams?.view;
  const view = resolvePlayerView(requested);

  /**
   * SERVER-SIDE GATE, BEFORE THE LOAD.
   *
   * Player Lab renders on the server, so each view is a second door onto the
   * same loader its `jsonHref` route serves — and those routes require PRO or
   * FANTASY. Only `dfs` used to check, which left ten doors open: an anonymous
   * `/players?view=opportunity` returned the PRO-gated table as HTML while
   * `/api/intelligence/receiving-opportunity` refused the identical request.
   *
   * The check runs BEFORE `view.load()` on purpose. Loading first and hiding
   * after would still bill the paid provider fetch for a viewer who may not
   * see the result — the denial-of-wallet reasoning already written into
   * `app/api/dfs/salaries/route.ts`. `getViewerEntitlements` fails closed to
   * FREE, so an auth or DB error denies rather than admits.
   */
  const viewer = await getViewerEntitlements();
  const entitled =
    view.requires === "public" ||
    (view.requires === "premium" && viewer.canSeePremiumPicks) ||
    (view.requires === "fantasy" && viewer.canUseFantasyFull);

  // Load only the active view's data — the lab is one view at a time.
  let result: ViewResult | null = null;
  let loadError: string | null = null;
  if (entitled) {
    try {
      result = await view.load();
    } catch (error) {
      loadError = error instanceof Error ? error.message : "UNKNOWN";
    }
  }

  return (
    <div className="relative isolate min-h-screen bg-carbon text-ion-white">
      <GeneratedPlate assetId="players-constellation" className="-z-10 opacity-20" />
      <Nav />
      <main id="main-content" className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <PageHero
          eyebrow={view.eyebrow}
          title={view.title}
          description={view.description}
          variant="dark"
          actions={
            <Link
              href={view.jsonHref}
              className="inline-flex min-h-11 items-center justify-center rounded-ds-sm border border-mineral px-5 py-3 text-sm font-semibold text-ion hover:border-orbital-cyan hover:text-ion-white"
              title="The raw rows behind this table, as machine-readable JSON"
            >
              Raw data (JSON)
            </Link>
          }
          aside={
            view.explainer && view.explainer.length > 0 ? (
              <MetricExplainer terms={view.explainer} variant="dark" />
            ) : undefined
          }
        />

        <PlayerLensRail
          active={view.slug}
          pathname={PATHNAME}
          currentParams={searchParams}
          lenses={PLAYER_VIEWS.map((v) => ({
            slug: v.slug,
            label: v.label,
            tooltip: v.tabTooltip,
          }))}
        />

        {!entitled ? (
          /* Gate rendered IN PLACE of the content — `result` is still null here
             because the loader never ran, so there is nothing to leak into the
             HTML even accidentally. */
          <TierGatePanel
            need="PRO"
            surface={`Player Lab — ${view.label}`}
            blurb={
              view.requires === "fantasy"
                ? "The DFS salary board is part of the fantasy suite. Members see every slate row; the public view stops at a teaser."
                : "This lens reads the same licensed rows the API serves to members. Free accounts get the public surfaces; members get the full table."
            }
          />
        ) : loadError || !result || result.status === "source-error" ? (
          <SourceError
            variant="dark"
            reason={
              loadError
                ? `This view could not load. ${loadError}`
                : (result?.error ?? "UNKNOWN")
            }
          />
        ) : (
          <>
            <ViewFreshnessStamp result={result} />

            {view.slug === "production" && (
              <ProductionSpotlight result={result} season={result.windowLabel} />
            )}

            <PlayerLabTable sections={result.sections} variant="dark" />

            {result.sourceIds.length > 0 ? (
              <Attribution sourceIds={result.sourceIds} />
            ) : null}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
