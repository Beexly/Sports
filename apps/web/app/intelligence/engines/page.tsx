import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { EngineView } from "@/components/intelligence/engine-view";
import { IntelligenceSubnav } from "@/components/intelligence/intelligence-subnav";
import { Attribution } from "@/components/ui/attribution";
import { Footer } from "@/components/ui/footer";
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
    "Every advanced-data engine GSE runs in one browsable surface: QB, RB, WR/TE, team, and cross-position signals mined from cleared nflverse data, each read for the predictive edge, each with a live API and an honest empty state.",
  alternates: { canonical: "/intelligence/engines" },
};

const PATHNAME = "/intelligence/engines";

interface EnginesBrowserProps {
  searchParams?: { engine?: string };
}

export default async function EnginesBrowserPage({ searchParams }: EnginesBrowserProps): Promise<JSX.Element> {
  // Founder gate — the full engine browser exposes competitor-sensitive keys.
  // Only an ADMIN session sees it; everyone else is bounced to sign-in.
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/auth/signin?callbackUrl=/intelligence/engines");
  }

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
    <div className="min-h-screen bg-surface-base text-ion-white">
      <Nav />
      <IntelligenceSubnav />
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <PageHero
          variant="dark"
          eyebrow="Intelligence engines"
          title={active.title}
          description={active.description}
          actions={
            <Link
              href={active.api}
              className="inline-flex min-h-9 items-center justify-center rounded-ds-sm border border-surface-line px-3 py-2 text-xs font-semibold text-ion-2 hover:text-ion-white hover:border-surface-line-strong"
            >
              JSON
            </Link>
          }
        />

        <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
          {/* Engine directory — grouped, discoverable, URL-driven via ?engine= */}
          <aside className="flex flex-col gap-5 lg:sticky lg:top-24 lg:self-start" aria-label="Engine directory">
            {groups.map((g) => (
              <nav key={g.group} className="flex flex-col gap-2">
                <p className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-ion-2">{g.group}</p>
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
            <Attribution sourceIds={active.sourceIds} className="!text-ion-2" />
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
