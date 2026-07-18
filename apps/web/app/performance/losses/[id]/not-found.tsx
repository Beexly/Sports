import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";

export default function LossRoomNotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-obsidian">
      <Nav />
      <main className="flex flex-1 items-center justify-center px-4 py-20">
        <div className="mx-auto max-w-lg text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-accent-300">
            404 / Loss room not found
          </p>
          <h1 className="mt-4 text-3xl font-bold text-white">That autopsy isn't on file.</h1>
          <p className="mt-4 text-sm text-ink-300">
            The loss room may have been removed or the link may be stale. The
            Decision Autopsy index has all documented losses.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/performance/losses" className="btn-primary px-5 py-2.5 text-sm">
              All Losses
            </Link>
            <Link href="/performance" className="btn-secondary px-5 py-2.5 text-sm">
              Calibration
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
