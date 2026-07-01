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

export const metadata: Metadata = {
  title: "Founding Decision-Process Lane — GSE",
  description: WAITLIST_COPY.subhead,
  robots: { index: false, follow: false },
};

export default function WaitlistPage(): JSX.Element {
  return (
    <main id="main-content" className="mx-auto max-w-2xl px-4 py-12">
      <p className="text-sm uppercase tracking-wide text-white/60">{WAITLIST_COPY.eyebrow}</p>
      <h1 className="mt-2 text-3xl font-semibold">{WAITLIST_COPY.headline}</h1>
      <p className="mt-2 text-lg text-white/80">{WAITLIST_COPY.subhead}</p>

      <div className="mt-6 space-y-3 text-white/80">
        {WAITLIST_COPY.body.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>

      <aside className="mt-6 rounded-lg border border-white/15 bg-white/5 p-4 text-sm text-white/75">
        {BACKTEST_TRANSPARENCY}
      </aside>

      <section className="mt-8">
        <WaitlistForm />
      </section>
    </main>
  );
}
