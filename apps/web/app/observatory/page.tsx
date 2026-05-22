import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { BRAND_NAME, SURFACES } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Edge Map — Live Market Intelligence by Sport, Slate, Matchup",
  description:
    "Real-time line movement, sharp/public splits, and market depth across every active matchup. The same view the model is reading from. Opens after the readiness gate clears.",
  alternates: { canonical: "/observatory" },
};

/**
 * Observatory — placeholder for the launch window.
 *
 * The full live market intelligence panel ships after the public picks gate
 * opens. This page exists to (a) keep the IA referenced by the nav and
 * footer honest, and (b) explain to anyone who lands here what this surface
 * will be when it's ready.
 */
export default function ObservatoryPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Nav />

      <main className="flex-1">
        <section className="px-4 py-22 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <p className="eyebrow">{SURFACES.observatory.label}</p>
            <h1 className="mt-3 font-display text-display-xl text-balance text-white">
              Live market intelligence.
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-ink-300">
              {SURFACES.observatory.blurb} When the readiness gate opens, the
              Observatory streams line movement, sharp/public splits, and
              market depth across every active matchup — the same view the
              model reads from when proposing a signal.
            </p>

            <div className="mt-10 surface-card flex flex-col gap-3 p-6">
              <p className="eyebrow">Status · Pre-launch</p>
              <p className="text-sm leading-relaxed text-ink-300">
                The Observatory stays dark until {BRAND_NAME} has enough
                settled history to publish a calibrated live read. In the
                meantime, the methodology page explains exactly what feeds
                into it.
              </p>
              <div className="mt-2 flex flex-wrap gap-3">
                <Link href="/methodology" className="btn btn-primary">
                  How it works →
                </Link>
                <Link href="/picks" className="btn btn-ghost">
                  Today&apos;s picks
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
