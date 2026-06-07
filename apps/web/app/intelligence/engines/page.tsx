import type { Metadata } from "next";
import Link from "next/link";
import { EngineView } from "@/components/intelligence/engine-view";
import { Attribution } from "@/components/ui/attribution";
import { Footer } from "@/components/ui/footer";
import { MetricExplainer } from "@/components/ui/metric-explainer";
import { Nav } from "@/components/ui/nav";
import { PageHero } from "@/components/ui/page-hero";
import { SourceError } from "@/components/ui/source-error";
import { Tabs } from "@/components/ui/tabs";
import { getEngine, groupedEngines } from "./registry";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // heavy nflverse loads (scoring-zone / team / proof) need headroom

export const metadata: Metadata = {
  title: "Intelligence Engines — the advanced-data layer, browsable",
  description:
    "Every advanced-data engine GSE runs in one browsable surface: QB, RB, WR/TE, team, and cross-position signals mined from cleared nflverse data, each read for the predictive edge, each a live glass-box API with an honest empty state.",
  alternates: { canonical: "/intelligence/engines" },
};

const PATHNAME = "/intelligence/engines";

interface EnginesBrowserProps {
  searchParams?: { engine?: string };
}

/**
 * Engines that have no in-browser board — POST-only or founder-gated endpoints,
 * plus the three player engines whose boards live under /players/*. Listed here
 * so every engine stays discoverable and indexed even though it can't render a
 * standalone board in the ?engine= switcher. Names / summaries / links lifted
 * from the original /intelligence/engines catalog (git HEAD).
 */
interface MoreEngine {
  readonly name: string;
  readonly summary: string;
  readonly api: string;
  readonly apiLabel: string;
  readonly board?: string;
}
const MORE_ENGINES: readonly MoreEngine[] = [
  {
    name: "Roster Advice",
    summary: "Model → real add/drop/read decisions for a posted roster (composes with Sleeper sync).",
    api: "/api/intelligence/roster-advice",
    apiLabel: "API (POST)",
  },
  {
    name: "Graded Pool",
    summary:
      "Composes the model + xFP + team environment (real schemeFit from neutral-script offensive EPA) + QB-forward passing signal into a real graded pool that drives every fantasy tool when the founder enables it.",
    api: "/api/intelligence/graded-pool",
    apiLabel: "API (gated)",
  },
  {
    name: "QB Consensus",
    summary: "ESPN QBR (results) vs Next Gen CPOE (accuracy), triangulated — disagreement surfaced, not averaged.",
    api: "/api/intelligence/qb-consensus",
    apiLabel: "JSON",
    board: "/players/qbr",
  },
  {
    name: "Rushing Efficiency",
    summary: "RYOE/att vs volume with stacked-box context — bell-cow / buy-low / volume-dependent.",
    api: "/api/intelligence/rushing-efficiency",
    apiLabel: "JSON",
    board: "/players/opportunity",
  },
  {
    name: "Receiving Opportunity (WOPR)",
    summary: "Air-yards & target share → WOPR, with opportunity-vs-production buy/sell.",
    api: "/api/intelligence/receiving-opportunity",
    apiLabel: "JSON",
    board: "/players/opportunity",
  },
];

function MoreEnginesSection(): JSX.Element {
  return (
    <section className="flex flex-col gap-5 border-t border-paper-border pt-8">
      <div className="flex flex-col gap-1">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-orbital-cyan-on-light">
          More engines &amp; APIs
        </p>
        <h2 className="text-xl font-semibold text-ink">Engines without a standalone board</h2>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-ink-1">
          Some engines are POST-only or founder-gated, and three player engines render on the player boards under{" "}
          <Link href="/players" className="font-semibold text-orbital-cyan-on-light hover:text-ink">
            /players
          </Link>
          . They stay indexed and reachable here.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {MORE_ENGINES.map((e) => (
          <article
            key={e.name}
            className="flex flex-col rounded-ds-md border border-paper-border bg-paper-raised p-5"
          >
            <h3 className="text-base font-semibold leading-tight text-ink">{e.name}</h3>
            <p className="mt-2 flex-1 text-sm leading-6 text-ink-1">{e.summary}</p>
            <div className="mt-4 flex flex-wrap gap-4 text-sm font-semibold">
              <Link href={e.api} className="text-orbital-cyan-on-light hover:text-ink">
                {e.apiLabel}
              </Link>
              {e.board ? (
                <Link href={e.board} className="text-ultraviolet-on-light hover:text-ink">
                  Board →
                </Link>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default async function EnginesBrowserPage({ searchParams }: EnginesBrowserProps): Promise<JSX.Element> {
  const requested = searchParams?.engine;
  const active = getEngine(requested);
  const groups = groupedEngines();

  // Load only the active engine's data — the browser is one engine at a time.
  // The loader runs on the SERVER; we hand the plain, serializable result to the
  // client <EngineView> keyed on the engine slug. The per-engine render fns
  // (column render()/sortValue()) live in EngineView, never crossing the RSC
  // boundary from here.
  let body: JSX.Element;
  try {
    const data = await active.load();
    body = <EngineView engine={active.slug} data={data} />;
  } catch (error) {
    body = (
      <SourceError
        reason={`This engine could not load. ${error instanceof Error ? error.message : "UNKNOWN"}`}
      />
    );
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      <Nav />
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <PageHero
          eyebrow="Intelligence engines"
          title={active.title}
          description={active.description}
          actions={
            <>
              <Link href={active.api} className="btn-primary min-h-11 px-5 py-3">
                JSON
              </Link>
              <Link
                href="/intelligence/metrics"
                className="inline-flex min-h-11 items-center justify-center rounded-ds-sm border border-paper-border px-5 py-3 text-sm font-semibold text-ink hover:border-ink-1"
              >
                How we read each metric
              </Link>
            </>
          }
          aside={
            active.explainer && active.explainer.length > 0 ? (
              <MetricExplainer terms={active.explainer} />
            ) : undefined
          }
        />

        <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
          {/* Engine directory — grouped, discoverable, URL-driven via ?engine= */}
          <aside className="flex flex-col gap-5 lg:sticky lg:top-24 lg:self-start" aria-label="Engine directory">
            {groups.map((g) => (
              <nav key={g.group} className="flex flex-col gap-2">
                <p className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-ink-2">{g.group}</p>
                <Tabs
                  param="engine"
                  active={active.slug}
                  pathname={PATHNAME}
                  ariaLabel={g.group}
                  className="!flex !flex-col !items-stretch"
                  items={g.engines.map((e) => ({
                    value: e.slug,
                    label: e.label,
                  }))}
                />
              </nav>
            ))}
          </aside>

          {/* Active engine */}
          <section className="flex min-w-0 flex-col gap-6">
            {body}
            <Attribution sourceIds={active.sourceIds} className="!text-ink-2" />
          </section>
        </div>

        <MoreEnginesSection />
      </main>
      <Footer />
    </div>
  );
}
