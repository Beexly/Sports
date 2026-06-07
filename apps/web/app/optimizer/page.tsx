import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/ui/footer";
import { Nav } from "@/components/ui/nav";
import { OptimizerWorkspace } from "@/components/fantasy/optimizer-workspace";
import { resolveToolPool } from "@/lib/integrations/projections";

export const metadata: Metadata = {
  title: "The Optimizer — One Workspace for Every Lineup",
  description:
    "One door for every lineup: DFS optimizer, season start/sit, and the draft board — pick your contest type and build, on real data with the math shown.",
  alternates: { canonical: "/optimizer" },
};

// Render per-request so the founder-gated live-projections status is reflected at
// runtime (the provider is registered at server startup, not build time).
export const dynamic = "force-dynamic";

export default function OptimizerPage(): JSX.Element {
  // Live graded pool for Start/Sit + Draft tabs when projections are on; DFS uses
  // its own slate seam regardless.
  const pool = resolveToolPool();
  return (
    <div className="min-h-screen bg-carbon text-ion">
      <Nav />
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <section className="flex flex-col gap-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-orbital-cyan">The Optimizer</p>
          <h1 className="font-display text-3xl font-semibold leading-tight text-ion-white sm:text-4xl">
            One workspace. Every lineup.
          </h1>
          <p className="max-w-3xl text-sm leading-6 text-ion-1">
            Pick a contest type and build — DFS, season start/sit, or the draft board, on the same real
            data (snaps, usage, Next Gen, injuries, weather), with the math shown. Salaries are licensed
            and gated; projections and ownership stay gated until a real feed is connected, never faked.{" "}
            <Link href="/data" className="text-orbital-cyan hover:text-ion-white">How we source data</Link>.
          </p>
        </section>

        <OptimizerWorkspace pool={pool} />
      </main>
      <Footer />
    </div>
  );
}
