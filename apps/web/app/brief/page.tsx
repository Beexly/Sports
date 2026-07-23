import type { Metadata } from "next";
import Link from "next/link";
import { getReadinessGates } from "@sports/prediction-engine";
import { BRIEF_RESPONSIBLE_GAMING_NOTE } from "@/lib/brief/compose";
import { db, isStubMode, isDemoPicksEnabled } from "@sports/db";
import { GeneratedPlate } from "@/components/immersive/generated-plate";

// Composer is being rebuilt; keep the stub out of the index until it ships.
export const metadata: Metadata = {
  title: "Daily Brief",
  description:
    "The daily brief composer is being rebuilt. Published picks appear here after launch verification.",
  alternates: { canonical: "/brief" },
  robots: { index: false, follow: true },
};

/**
 * Public daily brief — stub during composer rebuild.
 *
 * Preserves source-level invariants:
 *   - renders the responsible-gaming note (incl. "1-800-GAMBLER")
 *   - guards performance details by brief.readiness.performance
 *
 * Now also shows today's pick count when picks are visible so the page
 * doesn't read as completely empty.
 */
export const dynamic = "force-dynamic";

export default async function BriefStub() {
  const gates = getReadinessGates();
  const demoActive = isStubMode() && isDemoPicksEnabled();
  const brief = {
    readiness: { performance: gates.canExposePerformanceStats },
  };

  const todayPickCount = await db.pick
    .count({ where: { isPublished: true, result: "PENDING" } })
    .catch(() => 0);

  return (
    <div className="relative isolate flex min-h-screen flex-col bg-obsidian">
      <GeneratedPlate assetId="brief-horizon" className="-z-10 opacity-25" />
      <main id="main-content" className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-2xl font-bold text-white">Daily brief</h1>
        <p className="mt-2 text-sm text-ion-2">
          The daily brief composer is being rebuilt. Verified picks will
          appear here after launch-night verification is complete.
        </p>

        {todayPickCount > 0 && (
          <div
            data-testid="brief-pick-count"
            className="mt-4 rounded-xl border border-titanium bg-carbon/40 p-4"
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-ion-3">
              Today's slate
            </p>
            <p className="mt-1 text-sm text-ion-1">
              {todayPickCount} pick{todayPickCount === 1 ? "" : "s"}{" "}
              published today
              {demoActive && (
                <span
                  className="ml-2 rounded bg-caution/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-caution"
                  title="Sample data"
                >
                  sample
                </span>
              )}
            </p>
            <p className="mt-1 text-[11px] text-ion-3">
              See the full slate at{" "}
              <Link href="/picks" className="text-brand-400 hover:text-brand-300">
                /picks
              </Link>
              .
            </p>
          </div>
        )}

        {brief.readiness.performance ? (
          <p data-testid="brief-performance-hidden" className="mt-3 text-xs text-ion-3">
            Performance summary will render here once the composer is restored.
          </p>
        ) : (
          <p data-testid="brief-performance-gated" className="mt-3 text-xs text-ion-3">
            Performance data is gated until canonical sample is sufficient.
          </p>
        )}
        <p className="mt-6 rounded-lg border border-titanium bg-carbon/40 px-4 py-3 text-xs text-ion-2">
          {BRIEF_RESPONSIBLE_GAMING_NOTE} For problem-gambling help in the US,
          call <strong>1-800-GAMBLER</strong>.
        </p>
        <Link href="/" className="mt-4 inline-block rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white">
          ← Home
        </Link>
      </main>
    </div>
  );
}
