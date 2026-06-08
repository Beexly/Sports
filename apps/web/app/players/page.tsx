import type { Metadata } from "next";
import Link from "next/link";
import { PlayerLabTable } from "@/components/players/player-lab-table";
import { Reveal } from "@/components/motion/reveal";
import { AmbientGlow, SignatureGrid } from "@/components/motion/signature-grid";
import { Attribution } from "@/components/ui/attribution";
import { Atmosphere } from "@/components/ui/atmosphere";
import { Footer } from "@/components/ui/footer";
import { Nav } from "@/components/ui/nav";
import { PageHero } from "@/components/ui/page-hero";
import { SourceError } from "@/components/ui/source-error";
import { Tabs } from "@/components/ui/tabs";
import { ACCESS, canAccess, getViewerTier } from "@/lib/access";
import { PLAYER_VIEWS, resolvePlayerView, type ViewResult } from "@/lib/players/views";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // heavy nflverse loads need headroom

export const metadata: Metadata = {
  title: "Player Lab — Production, Snaps, Next Gen, Edge & Market in One Surface",
  description:
    "One tabbed Player Lab over real nflverse + Sleeper data: season production & last-5 form, snap share, receiving/rushing opportunity, Next Gen tracking, pressure & coverage, combine, QBR, edge signals, injuries, market moves, and licensed DFS salaries. Settled facts, honest empty states — never fabricated.",
  alternates: { canonical: "/players" },
};

const PATHNAME = "/players";

interface PlayersPageProps {
  searchParams?: { view?: string };
}

export default async function PlayersPage({ searchParams }: PlayersPageProps): Promise<JSX.Element> {
  const requested = searchParams?.view;
  const view = resolvePlayerView(requested);

  // Resolve the viewer's tier on the server and decide the free/paid line for
  // THIS view from the single ACCESS config. A view is locked only for viewers
  // who can't clear PRO (FREE) AND when the view isn't on the free list —
  // ADMIN / PRO / ELITE always see everything. `locked` is a serializable
  // boolean handed to the client table; the gate presentation lives there.
  const tier = await getViewerTier();
  const isFreeView = (ACCESS.freePlayerViews as readonly string[]).includes(view.slug);
  const locked = !canAccess(tier, "PRO") && !isFreeView;

  // Load only the active view's data — the lab is one view at a time.
  let result: ViewResult | null = null;
  let loadError: string | null = null;
  try {
    result = await view.load();
  } catch (error) {
    loadError = error instanceof Error ? error.message : "UNKNOWN";
  }

  return (
    <div className="min-h-screen bg-surface-base text-ion-white">
      <Atmosphere />
      <Nav />
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        {/* Hero — framed in the cinematic chrome: a drifting ambient glow and the
            signature radar grid sit behind the title, masked to fade outward. */}
        <Reveal>
          <section className="relative isolate overflow-hidden rounded-ds-lg">
            <AmbientGlow className="-z-10" />
            <SignatureGrid className="-z-10" opacity={0.1} />
            <PageHero
              variant="dark"
              eyebrow={view.eyebrow}
              title={view.title}
              description={view.description}
              actions={
                <>
                  <Link
                    href="/nflverse"
                    className="inline-flex min-h-11 items-center justify-center rounded-ds-sm border border-surface-line px-5 py-3 text-sm font-semibold text-ion-white hover:border-surface-line-strong"
                  >
                    Usage Pulse
                  </Link>
                  <Link
                    href={view.jsonHref}
                    className="inline-flex min-h-9 items-center justify-center rounded-ds-sm border border-surface-line px-3 py-1.5 text-xs font-medium text-ion-2 hover:border-surface-line-strong hover:text-ion-1"
                  >
                    JSON
                  </Link>
                </>
              }
            />
          </section>
        </Reveal>

        <Reveal delay={80}>
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
        </Reveal>

        {loadError || !result || result.status === "source-error" ? (
          <SourceError
            reason={
              loadError
                ? `This view could not load. ${loadError}`
                : (result?.error ?? "UNKNOWN")
            }
          />
        ) : (
          <Reveal delay={140} className="flex flex-col gap-8">
            {result.windowLabel ? (
              <p className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-ion-2">
                Source window · {result.windowLabel}
              </p>
            ) : null}

            <PlayerLabTable sections={result.sections} locked={locked} unlockTier="PRO" />

            {result.sourceIds.length > 0 ? (
              <Attribution sourceIds={result.sourceIds} className="!text-ion-2" />
            ) : null}
          </Reveal>
        )}
      </main>
      <Footer />
    </div>
  );
}
