import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import board from "@/lib/week8/sealed-board.json";
import { SealedTable } from "@/components/week8/sealed-table";
import type { SealedBoard } from "@/lib/week8/types";

const card = board as unknown as SealedBoard;

export const metadata: Metadata = {
  title: "Locked NFL Board | Galaxy Sports Edge",
  description: "Official verified NFL record 47-19-1 (+24.92u; Base 38-13-1, +22.85u). Locked plays from the sealed card only.",
  alternates: { canonical: "/picks" },
};

export default function PicksPage(): JSX.Element {
  const locked = card.main.filter((row) => row.publishAllowed && row.decision === "PUBLISH");
  return (
    <div className="min-h-screen bg-[#08090C] text-[#EDE8E0]">
      <Nav />
      <main id="main-content" className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
        <p className="text-xs uppercase tracking-[0.16em] text-[#FF4D2E]">Official verified NFL record</p>
        <h1 className="mt-3 font-display text-5xl uppercase sm:text-7xl">47-19-1 (+24.92u; Base 38-13-1, +22.85u)</h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-[#C4BFB6]">
          {card.counts.evaluated} markets evaluated. These {locked.length} rows are the only publish-allowed main lines and priced derivative on the sealed card.
        </p>
        <p className="mt-2 font-mono text-[11px] text-[#8F8A82]">Seal {card.seal_digest}</p>
        <div className="mt-8 flex gap-4 text-sm">
          <Link href="/packages" className="inline-flex min-h-11 items-center text-[#FF4D2E]">Galaxy Picks packs</Link>
          <Link href="/props" className="inline-flex min-h-11 items-center text-[#EDE8E0]">Props and watchlist</Link>
        </div>
        <div className="mt-10">
          <SealedTable rows={locked} freeLimit={2} />
        </div>
      </main>
      <Footer />
    </div>
  );
}
