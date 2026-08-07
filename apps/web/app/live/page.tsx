import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { RiskDisclosure } from "@/components/ui/risk-disclosure";

export const metadata: Metadata = {
  title: "Live Board — Dark",
  description:
    "The live board is suppressed until readiness and calibration floors clear. No invented scores, no certainty theater.",
  alternates: { canonical: "/live" },
  robots: { index: false, follow: true },
};

/**
 * Soft landing for /live while LIVE_BOARD stays founder-gated OFF.
 * A raw 404 is worse than an honest dark state: visitors who follow old
 * links or nav history get a clear product position instead of a broken page.
 */
export default function LivePage() {
  return (
    <div className="flex min-h-screen flex-col bg-obsidian">
      <Nav />

      <main id="main-content" className="flex-1 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-orbital-cyan">
            Market Intelligence
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Live Board is Dark
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-ion-1">
            Galaxy Sports Edge only publishes live signals once the readiness
            gate clears and settled history is sufficient for calibration. Until
            then the board stays dark on purpose — empty and labelled beats
            invented lines.
          </p>

          <div className="mt-8 rounded-xl border border-mineral bg-carbon/60 p-6 text-left text-sm leading-relaxed text-ion-2">
            <p className="font-semibold text-ion-white">What this means</p>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>No live odds ticker, no in-game edges, no fabricated scores.</li>
              <li>
                Public picks remain gated until founder enable and calibration
                floors are met.
              </li>
              <li>
                Settlement and free-spine health continue in the background;
                the dark state is product policy, not an outage.
              </li>
            </ul>
          </div>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/picks"
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-orbital-cyan/30 bg-orbital-cyan/10 px-5 py-2.5 text-sm font-semibold text-orbital-cyan transition-colors hover:border-orbital-cyan hover:bg-orbital-cyan hover:text-eclipse"
            >
              Today&apos;s Board status
            </Link>
            <Link
              href="/methodology"
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-titanium bg-carbon px-5 py-2.5 text-sm font-semibold text-ion-1 transition-colors hover:border-plasma hover:text-ion-white"
            >
              Read methodology
            </Link>
          </div>

          <div className="mt-10">
            <RiskDisclosure variant="card" includePastPerformance />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
