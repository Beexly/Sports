import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";

export default function GameRoomNotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-obsidian">
      <Nav />
      <main className="flex flex-1 items-center justify-center px-4 py-20">
        <div className="mx-auto max-w-lg text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-accent-300">
            404 / Game not found
          </p>
          <h1 className="mt-4 text-3xl font-bold text-white">That game isn't in the feed.</h1>
          <p className="mt-4 text-sm text-ink-300">
            The game may have ended, been cancelled, or the link may be stale.
            Head to the Live Board to find current matchups.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/board" className="btn-primary px-5 py-2.5 text-sm">
              Live Board
            </Link>
            <Link href="/picks" className="btn-secondary px-5 py-2.5 text-sm">
              Today's Picks
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
