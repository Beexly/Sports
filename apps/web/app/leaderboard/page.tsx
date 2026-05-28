import type { Metadata } from "next";
import Link from "next/link";
import { getReadinessGates } from "@sports/prediction-engine";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { RiskDisclosure } from "@/components/ui/risk-disclosure";

// ─────────────────────────────────────────────
// Metadata
// ─────────────────────────────────────────────

export const metadata: Metadata = {
  title: "Signal Leaderboard — Galaxy Sports Edge",
  description:
    "Galaxy's transparent model record by sport, confidence tier, and model version. Win rates published only after 30 canonical settled picks. No cherry-picking — the ledger is append-only.",
  alternates: { canonical: "/leaderboard" },
};

export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const CONFIDENCE_TIERS = [
  {
    id: "elite",
    label: "Elite Confidence",
    range: "80 – 100",
    description: "Highest-conviction signals — model alignment across all factors.",
    status: "pending" as const,
  },
  {
    id: "high",
    label: "High Confidence",
    range: "65 – 79",
    description: "Strong edge detected. Line movement confirms direction.",
    status: "pending" as const,
  },
  {
    id: "moderate",
    label: "Moderate",
    range: "50 – 64",
    description: "Edge identified. Noise present. Smaller implied advantage.",
    status: "pending" as const,
  },
] as const;

const MODEL_TABLE_COLUMNS = [
  "Model Version",
  "Sport",
  "Record (W-L-P)",
  "Win%",
  "Volume",
] as const;

const METHODOLOGY_RULES = [
  {
    term: "Canonical picks only",
    detail:
      "Bootstrap-era picks (isBootstrap=true) are excluded. They do not get to seed or inflate the record.",
  },
  {
    term: "Decisive results only",
    detail:
      "Win rate is computed as Wins ÷ (Wins + Losses). Only WIN and LOSS outcomes factor into the percentage.",
  },
  {
    term: "PUSH",
    detail: "Reported separately. Does not count for or against win rate.",
  },
  {
    term: "VOID",
    detail:
      "Excluded entirely — cancelled or invalid wagers do not enter any aggregate.",
  },
] as const;

// ─────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────

export default function LeaderboardPage() {
  const gates = getReadinessGates();
  const minPicks = gates.minSettledPicksForLearning;
  const gateOpen = gates.canExposePerformanceStats;

  return (
    <div className="flex min-h-screen flex-col bg-carbon">
      <Nav />

      <main className="flex-1 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">

          {/* ── Hero ─────────────────────────────────── */}
          <header className="mb-16">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center rounded-full border border-amber-500/40 bg-amber-950/50 px-3 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-400">
                Transparent Record
              </span>
            </div>

            <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
              Signal Leaderboard
            </h1>

            <p className="mt-2 text-lg font-medium tracking-wide text-amber-400/80">
              Where the model&apos;s record is transparent.
            </p>

            <p className="mt-4 max-w-2xl text-base leading-relaxed text-gray-400">
              Win rates are only published after{" "}
              <span className="font-semibold text-white">
                30 canonical settled picks
              </span>{" "}
              per model version. Until then, the gate stays closed.
            </p>
          </header>

          {/* ── Model performance board ───────────────── */}
          <section aria-label="Model performance board" className="mb-12">
            <p className="mb-5 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
              Model Performance Board
            </p>

            <div className="overflow-hidden rounded-2xl border border-mineral">
              {/* Gate banner */}
              {!gateOpen && (
                <div className="border-b border-mineral bg-amber-950/20 px-6 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <CalibrationIcon />
                      <p className="text-xs font-semibold text-amber-400">
                        Calibration gate not yet cleared
                      </p>
                    </div>
                    <span className="rounded-full border border-amber-700/40 bg-amber-950/50 px-3 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest text-amber-500">
                      {minPicks} of 30 settled picks needed
                    </span>
                  </div>
                  <p className="mt-2 text-[11px] leading-relaxed text-gray-500">
                    Win rates and model records are suppressed until the canonical threshold is reached.
                    This prevents a misleading small-sample record from appearing on a public leaderboard.
                  </p>
                </div>
              )}

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm" role="table">
                  <thead>
                    <tr className="border-b border-mineral bg-gray-900/60">
                      {MODEL_TABLE_COLUMNS.map((col) => (
                        <th
                          key={col}
                          scope="col"
                          className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-wider text-slate-500"
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {gateOpen ? (
                      // Gate open: real data would populate here. Empty fallback shown
                      // until the data-fetching layer is wired to this component.
                      <tr>
                        <td
                          colSpan={MODEL_TABLE_COLUMNS.length}
                          className="px-6 py-12 text-center"
                        >
                          <p className="text-sm text-gray-500">
                            Performance data loading…
                          </p>
                        </td>
                      </tr>
                    ) : (
                      <tr>
                        <td
                          colSpan={MODEL_TABLE_COLUMNS.length}
                          className="px-6 py-12 text-center"
                        >
                          <div className="flex flex-col items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-amber-800/50 bg-amber-950/30">
                              <LockIcon />
                            </div>
                            <p className="text-sm text-gray-500">
                              Record suppressed — calibration gate not cleared.
                            </p>
                            <p className="text-[11px] text-slate-600">
                              {minPicks} of 30 canonical settled picks required before this
                              table populates.
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* ── Methodology ───────────────────────────── */}
          <section
            aria-label="How Galaxy's record is counted"
            className="mb-12 rounded-2xl border border-mineral bg-gray-900/40 p-7"
          >
            <p className="mb-5 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
              How Galaxy&apos;s Record Is Counted
            </p>

            <dl className="flex flex-col gap-4">
              {METHODOLOGY_RULES.map(({ term, detail }) => (
                <div key={term} className="grid grid-cols-1 gap-1 sm:grid-cols-[200px_1fr]">
                  <dt className="text-xs font-semibold text-gray-300">{term}</dt>
                  <dd className="text-sm leading-relaxed text-gray-500">{detail}</dd>
                </div>
              ))}
            </dl>
          </section>

          {/* ── Top picks by confidence tier ─────────── */}
          <section aria-label="Top picks by confidence tier" className="mb-12">
            <p className="mb-5 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
              Performance by Confidence Tier
            </p>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {CONFIDENCE_TIERS.map((tier) => (
                <div
                  key={tier.id}
                  className="flex flex-col gap-4 rounded-2xl border border-mineral bg-gray-900/60 p-5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-white">{tier.label}</p>
                      <p className="mt-0.5 font-mono text-[10px] text-slate-600">
                        Score {tier.range}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-slate-500">
                      Pending
                    </span>
                  </div>

                  <p className="text-[11px] leading-relaxed text-gray-600">
                    {tier.description}
                  </p>

                  <div className="border-t border-mineral/60 pt-3 text-center">
                    <p className="font-mono text-[10px] uppercase tracking-widest text-slate-600">
                      Record
                    </p>
                    <p className="mt-1 text-lg font-bold text-gray-600">— — —</p>
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-4 text-[11px] leading-relaxed text-gray-600">
              Tier records populate once the calibration gate clears and at least 10 settled
              picks exist per tier. Tiers with fewer than 10 picks display &ldquo;pending&rdquo; regardless
              of overall gate status.
            </p>
          </section>

          {/* ── Trust statement ───────────────────────── */}
          <section
            aria-label="Ledger integrity"
            className="mb-12 rounded-2xl border border-amber-900/40 bg-amber-950/10 p-7"
          >
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-amber-700/60 bg-amber-900/40">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              </span>
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-amber-500">
                Trust Statement
              </p>
            </div>

            <p className="max-w-3xl text-sm leading-relaxed text-gray-300">
              This table cannot be manipulated. Every row comes from the Signal Ledger — an
              append-only record that can only be added to, never edited. Cherry-picking is
              architecturally impossible. Bootstrap-era picks are stamped at write time and
              cannot be retroactively reclassified as canonical.
            </p>
          </section>

          {/* ── User leaderboard (Phase 2 teaser) ────── */}
          <section aria-label="User leaderboard — coming in Phase 2" className="mb-16">
            <p className="mb-5 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
              Community Leaderboard
            </p>

            <div className="flex flex-col items-start gap-5 rounded-2xl border border-slate-700/60 bg-gray-900/40 p-8">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700/60 bg-slate-900/80 text-slate-400">
                <TrophyIcon />
              </div>

              <div>
                <div className="mb-1 flex items-center gap-2">
                  <h2 className="text-base font-semibold text-white">
                    User Leaderboard
                  </h2>
                  <span className="rounded-full border border-slate-700 bg-gray-900 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-slate-500">
                    Phase 2
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-gray-400">
                  Coming in Phase 2: track your bets, opt into the public leaderboard, and see
                  how your record compares. Only users who opt in will appear. Records are based
                  on the same canonical methodology as Galaxy&apos;s own model board.
                </p>
              </div>

              <Link
                href="/tracker"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-gray-900/60 px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:border-slate-600 hover:text-white"
              >
                Start tracking your bets now
                <ChevronRightIcon />
              </Link>
            </div>
          </section>

          {/* ── Link to full ledger ───────────────────── */}
          <section aria-label="Public Signal Ledger" className="mb-12">
            <div className="flex flex-col items-start gap-3 rounded-2xl border border-mineral bg-gray-900/40 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
                  Want the raw record?
                </p>
                <p className="mt-1 text-sm text-gray-400">
                  The Public Signal Ledger shows every canonical pick and its settled result — no
                  aggregation, no filtering.
                </p>
              </div>
              <Link
                href="/ledger"
                className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-700 bg-gray-900/60 px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:border-slate-600 hover:text-white"
              >
                View Signal Ledger
                <ChevronRightIcon />
              </Link>
            </div>
          </section>

          <RiskDisclosure variant="compact" includePastPerformance className="mt-4" />
        </div>
      </main>

      <Footer />
    </div>
  );
}

// ─────────────────────────────────────────────
// Icons
// ─────────────────────────────────────────────

function ChevronRightIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-5 w-5 text-amber-700"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.75}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
      />
    </svg>
  );
}

function CalibrationIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-4 w-4 text-amber-500"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.75}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
      />
    </svg>
  );
}

function TrophyIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.75}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 0 0 2.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 0 1 2.916.52 6.003 6.003 0 0 1-5.395 4.972m0 0a6.726 6.726 0 0 1-2.749 1.35m0 0a6.772 6.772 0 0 1-3.044 0"
      />
    </svg>
  );
}
