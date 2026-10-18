import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/ui/footer";
import { Nav } from "@/components/ui/nav";
import { OptimizerWorkspace } from "@/components/fantasy/optimizer-workspace";
import { resolveToolPoolAsync } from "@/lib/integrations/projections-server";
import { getViewerEntitlements } from "@/lib/pricing/tier-access";
import { poolForViewer } from "@/lib/fantasy/free-trial";

export const metadata: Metadata = {
  title: "The Optimizer: One Workspace for Every Lineup",
  description:
    "One door for every lineup: DFS optimizer, season start/sit, and the draft board. Pick your contest type and build. Opens on a Practice slate of sample players until a licensed projections feed is connected, never fake data as live advice.",
  alternates: { canonical: "/optimizer" },
};

// Render per-request so the founder-gated live-projections status is reflected at
// runtime (the provider is registered at server startup, not build time).
export const dynamic = "force-dynamic";
export const maxDuration = 60; // heavy nflverse load (pbp / graded pool) needs headroom beyond the default

export default async function OptimizerPage(): Promise<JSX.Element> {
  // Live graded pool for Start/Sit + Draft tabs when projections are on; DFS uses
  // its own slate seam regardless.
  const [pool, viewer] = await Promise.all([resolveToolPoolAsync(), getViewerEntitlements()]);
  // Server-side paywall enforcement (CLAUDE.md rule 3): a FREE viewer never receives the
  // paid rows of the live pool — only the trial subset is serialized to the client, so
  // the Draft tab's cap is real, not a bypassable client-side slice.
  const gatedPool = poolForViewer(pool, viewer.canUseFantasyFull);
  return (
    <div className="min-h-screen bg-carbon text-ion">
      <Nav />
      <main id="main-content" className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        {/* Compact header: the lineup result below is the hero, not this copy. */}
        <section className="flex flex-wrap items-end justify-between gap-x-8 gap-y-2">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-orbital-cyan">The Optimizer</p>
            <h1 className="mt-1 font-display text-3xl font-semibold leading-tight text-ion-white">
              One workspace. Every lineup.
            </h1>
          </div>
          <p className="max-w-md text-xs leading-5 text-ion-2">
            Runs on a Practice slate of sample players until a licensed feed is connected.{" "}
            <Link href="/data" className="text-orbital-cyan hover:text-ion-white">How we source data</Link>
          </p>
        </section>

        <OptimizerWorkspace pool={gatedPool} canUseFantasyFull={viewer.canUseFantasyFull} />
      </main>
      <Footer />
    </div>
  );
}
