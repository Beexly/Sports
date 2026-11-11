import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { SealedTable } from "@/components/week8/sealed-table";
import { getCurrentWeek10Slate } from "@/lib/live-board/current-slate-loader";

export const metadata: Metadata = {
  title: "Locked NFL Board & Week 10 Slate | Galaxy Sports Edge",
  description:
    "Public Glass Ledger: Weeks 8-9 staked 43-17-1 (+22.20u, n=61) · Week 8 all-in 47-19-1 (+24.92u, n=67). Locked plays from the sealed card and Week 10 pre-kickoff commitments.",
  alternates: { canonical: "/picks" },
};

export default function PicksPage(): JSX.Element {
  const slate = getCurrentWeek10Slate();
  const card = slate.settledCardArchive;
  const locked = card.main.filter((row) => row.publishAllowed && row.decision === "PUBLISH");
  return (
    <div className="min-h-screen bg-[#08090C] text-[#EDE8E0]">
      <Nav />
      <main id="main-content" className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
        <p className="text-xs uppercase tracking-[0.16em] text-[#FF4D2E]">
          Public Glass Ledger · Week {slate.activeWeek} Active ({slate.tnfGame.matchup} TNF)
        </p>
        <h1 className="mt-3 font-display text-5xl uppercase sm:text-7xl">
          43-17-1 (+22.20u, n=61) · W8 All-In 47-19-1 (+24.92u)
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-[#C4BFB6]">
          {card.counts.evaluated} markets evaluated on the sealed card ({locked.length} publish-allowed main lines and priced derivatives), plus {slate.gamesCount} Week {slate.activeWeek} matchups pre-kickoff sealed under Merkle root {slate.merkleRootSha256.slice(0, 16)}.
        </p>
        <p className="mt-2 font-mono text-[11px] text-[#8F8A82]">
          Week {slate.activeWeek} Merkle Root {slate.merkleRootSha256} · Archive Seal {card.seal_digest}
        </p>
        <div className="mt-8 flex flex-wrap gap-4 text-sm">
          <Link href="/packages" className="inline-flex min-h-11 items-center text-[#FF4D2E]">
            Week 10 Galaxy Picks packs →
          </Link>
          <Link href="/games" className="inline-flex min-h-11 items-center text-[#EDE8E0]">
            Week 10 Games ({slate.tnfGame.matchup}) →
          </Link>
          <Link href="/props" className="inline-flex min-h-11 items-center text-[#EDE8E0]">
            Props and watchlist →
          </Link>
        </div>
        <div className="mt-10">
          <SealedTable rows={locked} freeLimit={2} />
        </div>
      </main>
      <Footer />
    </div>
  );
}
