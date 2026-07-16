/**
 * /glass-ledger — The Glass Ledger (handoff §2 Phase 2).
 *
 * Mounted BESIDE the existing /ledger Trust Ledger (per-pick receipts —
 * a live surface this build must not regress); this route is the new
 * season-aggregate, founder-gated Glass Ledger and stays additive until
 * the founder flips PUBLISH_LEDGER.
 *
 * Founder-gated public performance surface. `loadLedgerView()` (see
 * `@/lib/ledger/ledger-view`) is off by default — nothing real renders
 * until a founder sets `PUBLISH_LEDGER=true` in the deploy environment.
 *
 * Even once published, EVERY metric cell on this page is routed through
 * `renderableMetricOrNull()` (`@/lib/ledger/display-guard`, the §1
 * statutory guard): a number missing a coverage denominator, a Wilson or
 * Clopper-Pearson lower bound, CLV backing, or walk-forward provenance
 * never renders — the page shows an honest "not yet substantiated" state
 * in its place instead. `loadLedgerView()` today always resolves to an
 * empty shape (no live ledger-chain entries exist yet), so with the flag
 * on this page currently renders every cell in that honest empty state.
 * That is intentional, not a bug — see the header copy below.
 *
 * Copy rules (handoff §1/§3, repo rule #1 — no fake data, no fabricated
 * stats): lead with calibration, never win-rate; no ROI/accuracy claims;
 * no "proven", no bare percentages, no "edge" as a marketing noun. The
 * confidence-tier filter defaults to ALL PICKS — a transparency tool, not
 * a way to cherry-pick a favorable slice.
 */

import type { Metadata } from "next";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { loadLedgerView, type LedgerSeasonRow } from "@/lib/ledger/ledger-view";
import { renderableMetricOrNull, type SubstantiatedMetric } from "@/lib/ledger/display-guard";

export const dynamic = "force-dynamic";

const UNPUBLISHED_HEADLINE = "The Glass Ledger is being built — nothing is published yet.";

const ALL_PICKS_SENTENCE =
  "The record defaults to all picks, every tier, every sport we cover — a transparency tool, never a cherry-pick.";

const NOT_SUBSTANTIATED_TEXT =
  "Not yet substantiated (needs coverage + lower bound + CLV + provenance).";

const SEASON_COLUMNS = [
  { key: "suPct", label: "SU%", title: "Straight-up settle rate" },
  { key: "atsVsClose", label: "ATS vs. Close", title: "Against-the-spread rate measured against the closing line" },
  { key: "clv", label: "CLV", title: "Realized closing-line value" },
  { key: "mae", label: "MAE", title: "Mean absolute error between projected and settled confidence" },
] as const;

export async function generateMetadata(): Promise<Metadata> {
  const view = loadLedgerView();
  return {
    title: "The Glass Ledger",
    description: view.published
      ? "The public record of every graded pick: calibration first, scored on CLV vs the close, hash-chained and independently recomputable. Gated until each number is honestly substantiated."
      : "The Glass Ledger is being built. Nothing is published yet.",
    alternates: { canonical: "/glass-ledger" },
    ...(view.published ? {} : { robots: { index: false, follow: true } }),
  };
}

/** Renders a metric cell honestly: never a bare value without the guard. */
function MetricCell({ metric }: { metric: SubstantiatedMetric | null | undefined }): JSX.Element {
  const safe = metric ? renderableMetricOrNull(metric) : null;
  if (!safe) {
    return <span className="text-xs leading-5 text-ion-2">{NOT_SUBSTANTIATED_TEXT}</span>;
  }
  // Unreachable with today's data contract (every metric is null until the
  // ledger chain accumulates substantiated entries) — kept honest rather
  // than deleted, so the render path is already correct when data arrives.
  return <span className="font-mono text-sm text-ion-white">{safe.value}</span>;
}

function SeasonRow({ row }: { row: LedgerSeasonRow }): JSX.Element {
  return (
    <tr className="border-b border-mineral/60">
      <td className="px-4 py-3 text-sm text-ion-white">
        {row.season} <span className="text-ion-2">· {row.sport}</span>
      </td>
      {SEASON_COLUMNS.map((col) => (
        <td key={col.key} className="px-4 py-3">
          <MetricCell metric={row[col.key]} />
        </td>
      ))}
    </tr>
  );
}

export default async function LedgerPage(): Promise<JSX.Element> {
  const view = loadLedgerView();

  if (!view.published) {
    return (
      <div className="flex min-h-screen flex-col bg-obsidian text-ion-white">
        <Nav />
        <main id="main-content" className="mx-auto w-full max-w-3xl flex-1 px-4 py-16 sm:px-6">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-orbital-cyan">
            The Glass Ledger
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {UNPUBLISHED_HEADLINE}
          </h1>
          <p className="mt-5 text-sm leading-6 text-ion-1">
            This is an honest scoreboard, in progress. The plan: every pick is recorded before
            kickoff, sealed into a hash-chained record, and never rewritten after the fact. Once a
            pick settles, it gets scored first on how well its confidence number matched reality
            and against the closing line — calibration first, not a single headline stat.
          </p>
          <p className="mt-4 text-sm leading-6 text-ion-1">
            Anyone will be able to recompute the chain independently — nothing here is meant to
            take our word for it. {ALL_PICKS_SENTENCE}
          </p>
          <p className="mt-4 text-sm leading-6 text-ion-2">
            Nothing on this page is real yet, and we would rather ship it empty than ship it
            fabricated. No sample rows, no placeholder numbers, no premature performance
            teasers — just this note, until there is a real, substantiated record to show.
          </p>
        </main>
        <Footer />
      </div>
    );
  }

  const { seasons, calibration, significance, note } = view;

  return (
    <div className="flex min-h-screen flex-col bg-carbon text-ion">
      <Nav />
      <main id="main-content" className="mx-auto w-full max-w-5xl flex-1 px-4 py-16 sm:px-6">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-orbital-cyan">
          The Glass Ledger
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          The public, honest scoreboard — in progress.
        </h1>
        <p className="mt-5 max-w-2xl text-sm leading-6 text-ion-1">
          Every pick is recorded before kickoff, sealed into a hash-chained record, and never
          rewritten after the fact. This page leads with calibration — how well confidence numbers
          matched reality — and closing-line value, not a single headline stat. {note}
        </p>

        {/* Confidence-tier filter — a transparency tool, never a cherry-pick. */}
        <section aria-labelledby="ledger-filter-heading" className="mt-10">
          <h2 id="ledger-filter-heading" className="text-xs font-semibold uppercase tracking-widest text-ion-2">
            Confidence tier
          </h2>
          <p className="mt-2 text-sm leading-6 text-ion-1">{ALL_PICKS_SENTENCE}</p>
          <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Confidence tier filter">
            <span
              aria-current="true"
              className="rounded-full border border-orbital-cyan/60 bg-orbital-cyan/10 px-3 py-1 text-xs font-semibold text-orbital-cyan"
            >
              All picks (default)
            </span>
            <span className="rounded-full border border-mineral px-3 py-1 text-xs text-ion-2">High</span>
            <span className="rounded-full border border-mineral px-3 py-1 text-xs text-ion-2">Medium</span>
            <span className="rounded-full border border-mineral px-3 py-1 text-xs text-ion-2">Low</span>
          </div>
        </section>

        {/* Season table skeleton */}
        <section aria-labelledby="ledger-seasons-heading" className="mt-10">
          <h2 id="ledger-seasons-heading" className="text-xl font-bold text-white">
            By season
          </h2>
          <div className="mt-4 overflow-x-auto rounded-2xl border border-mineral">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-mineral bg-eclipse/50">
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-ion-2">
                    Season
                  </th>
                  {SEASON_COLUMNS.map((col) => (
                    <th
                      key={col.key}
                      scope="col"
                      title={col.title}
                      className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-ion-2"
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {seasons.length === 0 ? (
                  <tr>
                    <td colSpan={SEASON_COLUMNS.length + 1} className="px-4 py-8 text-sm leading-6 text-ion-2">
                      No seasons recorded yet. This table fills in as settled picks accumulate in
                      the ledger chain — nothing is backfilled or estimated.
                    </td>
                  </tr>
                ) : (
                  seasons.map((row) => <SeasonRow key={`${row.season}-${row.sport}`} row={row} />)
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Reliability / Brier calibration */}
        <section aria-labelledby="ledger-calibration-heading" className="mt-10">
          <h2 id="ledger-calibration-heading" className="text-xl font-bold text-white">
            Reliability &amp; calibration
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ion-1">
            The Brier score decomposition and the reliability curve (projected confidence vs.
            settled outcome, by confidence bucket) will render here once there is a substantiated
            sample to compute them from.
          </p>
          <div className="mt-4 rounded-2xl border border-mineral bg-eclipse/30 p-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-ion-2">Brier score</p>
            <div className="mt-2">
              <MetricCell metric={calibration?.brierScore ?? null} />
            </div>
          </div>
        </section>

        {/* n-toward-significance */}
        <section aria-labelledby="ledger-significance-heading" className="mt-10">
          <h2 id="ledger-significance-heading" className="text-xl font-bold text-white">
            Progress toward a substantiated sample
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ion-1">
            A result only counts once its lower bound clears breakeven with real coverage and CLV
            backing behind it. This panel tracks distance to that bar honestly, not a projected
            arrival date.
          </p>
          <div className="mt-4 rounded-2xl border border-mineral bg-eclipse/30 p-6">
            <MetricCell metric={significance?.lowerBoundClearsBreakeven ?? null} />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
