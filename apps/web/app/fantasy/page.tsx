import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";

export const metadata: Metadata = {
  title: { absolute: "Fantasy Tools Under Construction | Galaxy Sports Edge" },
  description:
    "Season-long fantasy tools are currently under construction while we focus full-time on GALAXY PICKS (PAID) and DFS.",
  alternates: { canonical: "/fantasy" },
};

export default function FantasyHubPage(): JSX.Element {
  return (
    <div className="relative min-h-screen w-full bg-obsidian text-white">
      <Nav />
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:px-8">
        <div
          data-testid="under-construction-notice"
          className="rounded-2xl border-2 border-caution/30/50 bg-obsidian p-8 sm:p-12 text-center shadow-2xl"
        >
          <span className="inline-block rounded-md bg-caution/20 border border-caution/30 px-3.5 py-1 text-xs font-bold uppercase tracking-widest text-caution">
            🚧 Under Construction · Galaxy Picks &amp; DFS Only
          </span>
          <h1 className="mt-4 text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
            Focused on Galaxy Picks &amp; Daily Fantasy (DFS)
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base sm:text-lg leading-relaxed text-ion">
            Season-long fantasy tools are currently under construction while we focus full-time on{" "}
            <strong className="text-white">GALAXY PICKS (PAID)</strong> and our{" "}
            <strong className="text-white">DFS</strong> lineup optimizer. Open the live DFS Optimizer or grab
            this week&apos;s NFL betting packs below.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/packages"
              className="rounded-xl bg-verify hover:bg-verify px-7 py-4 text-base font-extrabold text-black shadow-lg transition-colors"
            >
              Open GALAXY PICKS (PAID) →
            </Link>
            <Link
              href="/fantasy/dfs"
              className="rounded-xl border-2 border-mineral-hi bg-titanium hover:border-verify px-7 py-4 text-base font-bold text-white transition-colors"
            >
              Open DFS Lineup Optimizer →
            </Link>
          </div>
        </div>

        <section className="mt-10 rounded-2xl border border-mineral bg-obsidian p-8 sm:p-10">
          <h2 className="text-2xl font-extrabold tracking-tight">Real roster first</h2>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-ion">
            When season-long tools ship, they start from a real roster. League connection is read-only:
            no league writes, no autonomous moves against your team.
          </p>
          <Link
            href="/fantasy/connect"
            className="mt-5 inline-block rounded-xl border-2 border-mineral-hi bg-titanium px-6 py-3 text-base font-bold text-white transition-colors hover:border-verify"
          >
            Connect your league →
          </Link>
        </section>

        <section className="mt-6 rounded-2xl border border-mineral bg-obsidian p-8 sm:p-10">
          <h2 className="text-2xl font-extrabold tracking-tight">Projections stay gated</h2>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-ion">
            No fake projections. Until licensed player data is connected, Projections stay gated.
            projection-driven lineup, waiver, trade, DFS, or pick&apos;em advice stays gated rather than
            presenting invented numbers as live guidance.
          </p>
        </section>

        <section className="mt-6 rounded-2xl border border-mineral bg-obsidian p-8 sm:p-10">
          <h2 className="text-2xl font-extrabold tracking-tight">Baseline map</h2>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-ion">
            The LineStar / Elite baseline is the floor. Our competitive map lists each baseline module
            with its current truth (live proof, CSV-import-ready, or gated data), so nothing gated is
            dressed up as live.
          </p>
          <Link
            href="/fantasy/baseline"
            className="mt-5 inline-block rounded-xl border-2 border-mineral-hi bg-titanium px-6 py-3 text-base font-bold text-white transition-colors hover:border-verify"
          >
            Open the baseline map →
          </Link>
        </section>
      </main>
      <Footer />
    </div>
  );
}
