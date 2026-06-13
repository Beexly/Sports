import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";

export default function GameRoomNotFound() {
  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <main className="flex flex-1 items-center justify-center px-4 py-20">
        <div className="mx-auto max-w-lg text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-accent-300">
            404 / Game not found
          </p>
          <h1 className="mt-4 text-3xl font-bold text-white">That game isn't in the feed.</h1>
          <p className="mt-4 text-sm text-gray-400">
            The game may have ended, been cancelled, or the link may be stale.
            Head to the Live Board to find current matchups.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/board" className="rounded-xl bg-white/10 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/15">
              Live Board
            </Link>
            <Link href="/picks" className="rounded-xl border border-gray-700 px-5 py-2.5 text-sm text-gray-300 hover:bg-gray-900">
              Today's Picks
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
