import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";

export const metadata: Metadata = {
  title: { absolute: "Board Moved: Galaxy Picks & DFS | Galaxy Sports Edge" },
  description:
    "The public slate lives in GALAXY PICKS (PAID) and the DFS optimizer. This route no longer publishes a record.",
  alternates: { canonical: "/board" },
};

export default function BoardPage(): JSX.Element {
  return (
    <div className="relative min-h-screen w-full bg-obsidian text-white">
      <Nav />
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:px-8">
        <div
          data-testid="under-construction-notice"
          className="rounded-2xl border-2 border-caution/30/50 bg-obsidian p-8 sm:p-12 text-center shadow-2xl"
        >
          <span className="inline-block rounded-md bg-caution/20 border border-caution/30 px-3.5 py-1 text-xs font-bold uppercase tracking-widest text-caution">
            Under Construction · Galaxy Picks &amp; DFS Only
          </span>
          <h1 className="mt-4 text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
            The slate lives in Galaxy Picks and DFS
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base sm:text-lg leading-relaxed text-ion">
            This route no longer publishes a ledger. Every graded play, every prop, and every
            correlated ticket sits behind GALAXY PICKS (PAID), and the lineup work sits in the DFS
            optimizer. Nothing here is withheld to look mysterious: there is simply no second copy
            of the board.
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
          <h2 className="text-2xl font-extrabold tracking-tight">Where the record actually lives</h2>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-ion">
            Settlement is graded against the closing line and written to the sealed record once the
            evidence clears its own published bar. Until then the number stays unwritten rather than
            replaced with a softer one.
          </p>
          <Link
            href="/board/gate"
            className="mt-5 inline-block rounded-xl border-2 border-mineral-hi bg-titanium px-6 py-3 text-base font-bold text-white transition-colors hover:border-verify"
          >
            How the gate decides →
          </Link>
        </section>
      </main>
      <Footer />
    </div>
  );
}
