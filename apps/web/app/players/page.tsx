import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";

export const metadata: Metadata = {
  title: "Player Lab Under Construction | Galaxy Sports Edge",
  description:
    "This section is currently under construction while we focus full-time on GALAXY PICKS (PAID) and DFS.",
  alternates: { canonical: "/players" },
};

export default function PlayersPage(): JSX.Element {
  return (
    <div className="relative min-h-screen w-full bg-slate-950 text-white">
      <Nav />
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:px-8">
        <div
          data-testid="under-construction-notice"
          className="rounded-2xl border-2 border-amber-400/50 bg-slate-900 p-8 sm:p-12 text-center shadow-2xl"
        >
          <span className="inline-block rounded-md bg-amber-500/20 border border-amber-400 px-3.5 py-1 text-xs font-bold uppercase tracking-widest text-amber-300">
            🚧 Under Construction — Galaxy Picks &amp; DFS Only
          </span>
          <h1 className="mt-4 text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
            Focused on Galaxy Picks &amp; DFS Right Now
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base sm:text-lg leading-relaxed text-slate-100">
            This section is currently under construction while we focus full-time on{" "}
            <strong className="text-white">GALAXY PICKS (PAID)</strong> and our{" "}
            <strong className="text-white">DFS</strong> lineup optimizer. Get our top NFL Player Props inside
            Galaxy Picks or open the DFS Optimizer below.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/packages"
              className="rounded-xl bg-emerald-500 hover:bg-emerald-400 px-7 py-4 text-base font-extrabold text-black shadow-lg transition-colors"
            >
              Open GALAXY PICKS (PAID) →
            </Link>
            <Link
              href="/fantasy/dfs"
              className="rounded-xl border-2 border-slate-700 bg-slate-800 hover:border-emerald-400 px-7 py-4 text-base font-bold text-white transition-colors"
            >
              Open DFS Lineup Optimizer →
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
