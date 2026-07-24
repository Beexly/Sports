/**
 * GSE Founding Waitlist page (server component).
 *
 * Public-safe, no-claim surface. It renders process-first copy plus the honest
 * backtest-truth statement, and the lead form. It does NOT depend on or flip any
 * `*_ENABLED` flag, show pricing, or make any performance claim.
 */

import type { Metadata } from "next";
import { WaitlistForm } from "@/components/gsn/waitlist-form";
import { WAITLIST_COPY, BACKTEST_TRANSPARENCY } from "@/lib/gse/waitlist-copy";
import { GeneratedPlate } from "@/components/immersive/generated-plate";

export const metadata: Metadata = {
  title: "Founding Decision-Process Lane · GSE",
  description: WAITLIST_COPY.subhead,
  robots: { index: false, follow: false },
};

export default function WaitlistPage(): JSX.Element {
  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-obsidian text-ion-white">
      {/* Atmosphere — calm deep-space plate, decorative only */}
      <GeneratedPlate assetId="intro-galaxy" className="-z-10 opacity-20" />

      <main id="main-content" className="mx-auto w-full max-w-2xl px-4 py-16 sm:px-6">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-orbital-cyan">
          {WAITLIST_COPY.eyebrow}
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-ion-white sm:text-4xl">
          {WAITLIST_COPY.headline}
        </h1>
        <p className="mt-3 text-lg leading-relaxed text-ion">{WAITLIST_COPY.subhead}</p>

        <div className="mt-6 space-y-3 text-sm leading-6 text-ion-1 sm:text-base sm:leading-7">
          {WAITLIST_COPY.body.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>

        <aside className="surface-card mt-8 p-5 text-sm leading-6 text-ion-1">
          {BACKTEST_TRANSPARENCY}
        </aside>

        <section className="mt-10 border-t border-mineral pt-8">
          <WaitlistForm />
        </section>
      </main>
    </div>
  );
}
