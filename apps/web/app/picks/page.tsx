import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import board from "@/lib/week8/sealed-board.json";
import { SealedTable } from "@/components/week8/sealed-table";
import type { SealedBoard } from "@/lib/week8/types";

const card = board as SealedBoard;

export const metadata: Metadata = {
  title: "Week 8 Locked Board | Galaxy Sports Edge",
  description: "Official New Engine verified record 16-5 (76.2%) · +10.45u. Locked Week 8 plays from the sealed card only.",
  alternates: { canonical: "/picks" },
};

export default function PicksPage(): JSX.Element {
  const locked = card.main.filter((row) => row.publishAllowed && row.decision === "PUBLISH");
  return (
    <div className="min-h-screen bg-[#08090C] text-[#EDE8E0]">
      <Nav />
      <main id="main-content" className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
        <p className="text-xs uppercase tracking-[0.16em] text-[#FF4D2E]">Official New Engine verified record</p>
        <h1 className="mt-3 font-display text-5xl uppercase sm:text-7xl">16-5 (76.2%) · +10.45u</h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-[#C4BFB6]">
          {card.counts.evaluated} markets evaluated. These {locked.length} rows are the only publish-allowed main lines and priced derivative on the sealed card.
        </p>
        <p className="mt-2 font-mono text-[11px] text-[#8F8A82]">Seal {card.seal_digest}</p>
        <div className="mt-8 flex gap-4 text-sm">
          <Link href="/packages" className="text-[#FF4D2E]">Galaxy Picks packs</Link>
          <Link href="/props" className="text-[#EDE8E0]">Props and watchlist</Link>
        </div>
        <div className="mt-10">
          <SealedTable rows={locked} />
        </div>
      </main>
      <Footer />
    </div>
  );
}
