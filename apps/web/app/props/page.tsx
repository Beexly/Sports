import type { Metadata } from "next";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { SealedTable } from "@/components/week8/sealed-table";
import { getCurrentWeek10Slate } from "@/lib/live-board/current-slate-loader";

export const metadata: Metadata = {
  title: "NFL Player Props & Week 10 Watchlist | Galaxy Sports Edge",
  description:
    "Public Glass Ledger: Weeks 8-9 staked 43-17-1 (+22.20u, n=61) · Week 8 all-in 47-19-1 (+24.92u, n=67). Locked player props and the 360-degree watchlist from the sealed card.",
};

export default function PropsPage(): JSX.Element {
  const slate = getCurrentWeek10Slate();
  const card = slate.settledCardArchive;
  const props = card.props.filter((row) => row.publishAllowed && row.decision === "PUBLISH");
  const watch = [...card.watch.one_q, ...card.watch.kicking, ...card.watch.idp, ...card.watch.atd].filter(
    (row) => row.decision === "ABSTAIN" && row.publishAllowed === false,
  );
  return (
    <div className="min-h-screen bg-[#08090C] text-[#EDE8E0]">
      <Nav />
      <main className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
        <p className="text-xs uppercase tracking-[0.16em] text-[#FF4D2E]">
          Weeks 8–9 Staked 43-17-1 (+22.20u, n=61) · Week 8 All-In 47-19-1 (+24.92u, n=67) · Week {slate.activeWeek} ({slate.tnfGame.matchup})
        </p>
        <h1 className="mt-3 font-display text-5xl uppercase sm:text-7xl">Locked props</h1>
        <div className="mt-10">
          <SealedTable rows={props} freeLimit={2} />
        </div>
        <h2 className="mt-16 font-display text-4xl uppercase">360° watchlist</h2>
        <p className="mt-3 max-w-2xl text-[#C4BFB6]">Bet only at or better than the trigger. These are not locked official plays.</p>
        <div className="mt-6">
          <SealedTable rows={watch} watch />
        </div>
        <h2 className="mt-16 font-display text-4xl uppercase">Pass · do not bet</h2>
        <div className="mt-6">
          <SealedTable rows={card.passes} />
        </div>
      </main>
      <Footer />
    </div>
  );
}
