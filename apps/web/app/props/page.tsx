import type { Metadata } from "next";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import board from "@/lib/week8/sealed-board.json";
import { SealedTable } from "@/components/week8/sealed-table";
import type { SealedBoard } from "@/lib/week8/types";

const card = board as unknown as SealedBoard;

export const metadata: Metadata = {
  title: "Week 8 Props | Galaxy Sports Edge",
  description: "Locked Week 8 props and the abstain watchlist from the sealed card.",
};

export default function PropsPage(): JSX.Element {
  const props = card.props.filter((row) => row.publishAllowed && row.decision === "PUBLISH");
  const watch = [...card.watch.one_q, ...card.watch.kicking, ...card.watch.idp, ...card.watch.atd].filter(
    (row) => row.decision === "ABSTAIN" && row.publishAllowed === false,
  );
  return (
    <div className="min-h-screen bg-[#08090C] text-[#EDE8E0]">
      <Nav />
      <main className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
        <p className="text-xs uppercase tracking-[0.16em] text-[#FF4D2E]">16-5 (76.2%) · +10.45u</p>
        <h1 className="mt-3 font-display text-5xl uppercase sm:text-7xl">Locked props</h1>
        <div className="mt-10">
          <SealedTable rows={props} />
        </div>
        <h2 className="mt-16 font-display text-4xl uppercase">360° watchlist</h2>
        <p className="mt-3 max-w-2xl text-[#C4BFB6]">Bet only at or better than the trigger. These are not locked official plays.</p>
        <div className="mt-6">
          <SealedTable rows={watch} watch />
        </div>
        <h2 className="mt-16 font-display text-4xl uppercase">Pass — do not bet</h2>
        <div className="mt-6">
          <SealedTable rows={card.passes} />
        </div>
      </main>
      <Footer />
    </div>
  );
}
