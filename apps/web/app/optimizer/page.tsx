import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/ui/footer";
import { Nav } from "@/components/ui/nav";
import { Atmosphere } from "@/components/ui/atmosphere";
import { Reveal } from "@/components/motion/reveal";
import { AmbientGlow, SignatureGrid } from "@/components/motion/signature-grid";
import { OptimizerWorkspace } from "@/components/fantasy/optimizer-workspace";
import { canAccess, getViewerTier } from "@/lib/access";
import { resolveToolPoolAsync } from "@/lib/integrations/projections-server";

export const metadata: Metadata = {
  title: "The Optimizer — One Workspace for Every Lineup",
  description:
    "One door for every lineup: DFS optimizer, season start/sit, and the draft board — pick your contest type and build, on real data with the math shown.",
  alternates: { canonical: "/optimizer" },
};

// Render per-request so the founder-gated live-projections status is reflected at
// runtime (the provider is registered at server startup, not build time).
export const dynamic = "force-dynamic";
export const maxDuration = 60; // heavy nflverse load (pbp / graded pool) needs headroom beyond the default

export default async function OptimizerPage(): Promise<JSX.Element> {
  // Live graded pool for Start/Sit + Draft tabs when projections are on; DFS uses
  // its own slate seam regardless.
  //
  // FREE -> PRO -> ELITE gradient (tier resolved on the SERVER; only serializable
  // booleans cross into the client workspace):
  //  - FREE keeps the workspace shell + the "how the math works" teaser (ungated).
  //  - PRO unlocks the season Start/Sit board and the Draft board.
  //  - ELITE unlocks the DFS multi-lineup builder. (DFS output is additionally
  //    founder-gated on a licensed salary feed elsewhere, so the gate label stays
  //    neutral and never implies live salaries for ELITE.)
  const [pool, tier] = await Promise.all([resolveToolPoolAsync(), getViewerTier()]);
  const lockedPro = !canAccess(tier, "PRO");
  const lockedElite = !canAccess(tier, "ELITE");
  return (
    <div className="flex min-h-screen flex-col bg-surface-base text-ion-white">
      <Atmosphere />
      <Nav />
      <main className="flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
          <Reveal>
            <div className="relative isolate overflow-hidden rounded-ds-lg">
              <AmbientGlow className="-z-10" />
              <SignatureGrid className="-z-10" opacity={0.1} rotate />
              <div className="relative z-10 px-1 py-2">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-orbital-cyan">The Optimizer</p>
                <h1 className="mt-1.5 font-display text-3xl font-semibold leading-tight text-ion-white sm:text-4xl">
                  One workspace. Every lineup.
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-ion-1">
                  Pick a contest type and build — DFS, season start/sit, or the draft board, on the same real
                  data (snaps, usage, Next Gen, injuries, weather). Salaries are licensed and gated;
                  projections and ownership stay gated until a real feed is connected, never faked.{" "}
                  <Link href="/data" className="text-orbital-cyan hover:text-ion-white">How we source data</Link>.
                </p>
              </div>
            </div>
          </Reveal>

          <OptimizerWorkspace pool={pool} lockedPro={lockedPro} lockedElite={lockedElite} />
        </div>
      </main>
      <Footer />
    </div>
  );
}
