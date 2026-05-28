import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { RiskDisclosure } from "@/components/ui/risk-disclosure";

// ─────────────────────────────────────────────
// Metadata
// ─────────────────────────────────────────────

export const metadata: Metadata = {
  title: "Bet Tracker — Galaxy Sports Edge",
  description:
    "Manual bet log with CLV tracking, ROI calculation, and alignment scoring against Galaxy's published signals. Track your edge, not just your wins.",
  alternates: { canonical: "/tracker" },
};

export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const PHASE_ROADMAP = [
  { phase: 1, label: "Manual bet entry", status: "preview" as const },
  { phase: 2, label: "Automatic grading when result available", status: "upcoming" as const },
  { phase: 3, label: "CLV calculation against closing lines", status: "upcoming" as const },
  { phase: 4, label: "Sportsbook sync (manual import)", status: "upcoming" as const },
  { phase: 5, label: "Behavioral analytics (tilt detection, over-betting flags)", status: "upcoming" as const },
] as const;

const STAT_CARDS = [
  {
    id: "bets-tracked",
    label: "Bets Tracked",
    value: "—",
    hint: "Add your first",
    accent: "text-gray-400",
  },
  {
    id: "win-rate",
    label: "Win Rate",
    value: "—",
    hint: "Min 20 to show",
    accent: "text-gray-400",
  },
  {
    id: "roi",
    label: "ROI",
    value: "—",
    hint: "Tracked vs opening line",
    accent: "text-gray-400",
  },
  {
    id: "clv",
    label: "CLV",
    value: "—",
    hint: "Coming soon",
    accent: "text-gray-400",
  },
] as const;

const TABLE_COLUMNS = [
  "Date",
  "Game",
  "Pick",
  "Type",
  "Odds",
  "Stake",
  "Result",
  "vs Galaxy Signal",
] as const;

// ─────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────

export default function TrackerPage() {
  return (
    <div className="flex min-h-screen flex-col bg-carbon">
      <Nav />

      <main className="flex-1 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">

          {/* ── Hero ─────────────────────────────────── */}
          <header className="mb-16">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center rounded-full border border-emerald-500/40 bg-emerald-950/50 px-3 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-400">
                Pro + Elite
              </span>
            </div>

            <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
              Bet Tracker
            </h1>

            <p className="mt-2 text-lg font-medium tracking-wide text-emerald-400/80">
              Your results. Your record. Your discipline.
            </p>

            <p className="mt-4 max-w-2xl text-base leading-relaxed text-gray-400">
              Track bets manually. Compare your picks against Galaxy&apos;s signals.
              Understand your edge — or your leak.
            </p>
          </header>

          {/* ── Summary stat cards ───────────────────── */}
          <section aria-label="Performance summary" className="mb-12">
            <p className="mb-5 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
              Your Record
            </p>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {STAT_CARDS.map((card) => (
                <div
                  key={card.id}
                  className="flex flex-col gap-2 rounded-2xl border border-mineral bg-gray-900/60 p-5"
                >
                  <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
                    {card.label}
                  </p>
                  <p className={["text-4xl font-extrabold", card.accent].join(" ")}>
                    {card.value}
                  </p>
                  <p className="text-[11px] text-gray-600">{card.hint}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ── Add Bet form (Phase 1 UI preview) ────── */}
          <section aria-label="Add a bet" className="mb-12">
            <p className="mb-5 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
              Add Bet
            </p>

            <div className="rounded-2xl border border-mineral bg-gray-900/60 p-6 sm:p-8">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-base font-semibold text-white">Log a Bet</h2>
                <span className="inline-flex items-center rounded-full border border-emerald-600/30 bg-emerald-950/40 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-emerald-500">
                  Pro feature
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {/* Sport */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
                    Sport
                  </label>
                  <div className="relative">
                    <select
                      disabled
                      aria-disabled="true"
                      className="w-full cursor-not-allowed appearance-none rounded-xl border border-slate-700 bg-gray-900/80 px-4 py-2.5 text-sm text-slate-600 opacity-60"
                    >
                      <option>NFL</option>
                      <option>NBA</option>
                      <option>MLB</option>
                      <option>NHL</option>
                      <option>Soccer</option>
                    </select>
                    <ChevronDownIcon />
                  </div>
                </div>

                {/* Pick type */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
                    Pick Type
                  </label>
                  <div className="relative">
                    <select
                      disabled
                      aria-disabled="true"
                      className="w-full cursor-not-allowed appearance-none rounded-xl border border-slate-700 bg-gray-900/80 px-4 py-2.5 text-sm text-slate-600 opacity-60"
                    >
                      <option>Spread</option>
                      <option>Moneyline</option>
                      <option>Total</option>
                      <option>Prop</option>
                    </select>
                    <ChevronDownIcon />
                  </div>
                </div>

                {/* Selection */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
                    Selection
                  </label>
                  <input
                    type="text"
                    disabled
                    aria-disabled="true"
                    placeholder="e.g. Chiefs -3.5"
                    className="w-full cursor-not-allowed rounded-xl border border-slate-700 bg-gray-900/80 px-4 py-2.5 text-sm text-slate-600 placeholder-slate-700 opacity-60"
                  />
                </div>

                {/* Odds */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
                    Odds
                  </label>
                  <input
                    type="text"
                    disabled
                    aria-disabled="true"
                    placeholder="-110"
                    className="w-full cursor-not-allowed rounded-xl border border-slate-700 bg-gray-900/80 px-4 py-2.5 text-sm text-slate-600 placeholder-slate-700 opacity-60"
                  />
                </div>

                {/* Stake */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
                    Stake ($)
                  </label>
                  <input
                    type="text"
                    disabled
                    aria-disabled="true"
                    placeholder="100"
                    className="w-full cursor-not-allowed rounded-xl border border-slate-700 bg-gray-900/80 px-4 py-2.5 text-sm text-slate-600 placeholder-slate-700 opacity-60"
                  />
                </div>

                {/* Log Bet CTA */}
                <div className="flex flex-col justify-end gap-1.5">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-transparent">
                    &nbsp;
                  </span>
                  <button
                    disabled
                    aria-disabled="true"
                    aria-label="Log bet — Pro feature required"
                    className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-emerald-700/30 bg-emerald-900/20 px-5 py-2.5 text-sm font-semibold text-emerald-600 opacity-60"
                  >
                    <LogIcon />
                    Log Bet
                  </button>
                </div>
              </div>

              <p className="mt-5 text-[11px] text-gray-600">
                Bet logging requires a Pro or Elite subscription. Manual entry goes live in Phase 2.
              </p>
            </div>
          </section>

          {/* ── Bet history table ─────────────────────── */}
          <section aria-label="Bet history" className="mb-12">
            <p className="mb-5 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
              Bet History
            </p>

            <div className="overflow-hidden rounded-2xl border border-mineral">
              <div className="overflow-x-auto">
                <table className="w-full text-sm" role="table">
                  <thead>
                    <tr className="border-b border-mineral bg-gray-900/60">
                      {TABLE_COLUMNS.map((col) => (
                        <th
                          key={col}
                          scope="col"
                          className={[
                            "px-4 py-3 text-left font-mono text-[10px] uppercase tracking-wider text-slate-500",
                            col === "vs Galaxy Signal"
                              ? "border-l border-mineral/60 text-emerald-600"
                              : "",
                          ].join(" ")}
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td
                        colSpan={TABLE_COLUMNS.length}
                        className="px-6 py-14 text-center"
                      >
                        <div className="flex flex-col items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 bg-slate-900">
                            <EmptyLogIcon />
                          </div>
                          <p className="text-sm text-gray-500">
                            No bets logged yet. Add your first bet above.
                          </p>
                          <p className="text-[11px] text-slate-600">
                            The{" "}
                            <span className="text-emerald-600">vs Galaxy Signal</span>{" "}
                            column shows whether Galaxy had a signal on this game — alignment tracking.
                          </p>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* ── CLV explainer ─────────────────────────── */}
          <section
            aria-label="Why track closing line value"
            className="mb-12 rounded-2xl border border-emerald-900/40 bg-emerald-950/20 p-7"
          >
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-emerald-700/60 bg-emerald-900/40">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-emerald-500">
                Why Track CLV?
              </p>
            </div>

            <p className="max-w-3xl text-sm leading-relaxed text-gray-300">
              Closing Line Value (CLV) is the most predictive metric for long-run betting success.
              It measures whether you got better odds than the market settled at. A positive CLV over
              200+ bets is a stronger signal of edge than win rate alone.
            </p>

            <div className="mt-5">
              <Link
                href="/academy"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-400 underline-offset-4 hover:underline"
              >
                Learn more in the Academy
                <ChevronRightIcon />
              </Link>
            </div>
          </section>

          {/* ── Phase roadmap ─────────────────────────── */}
          <section aria-label="Phase roadmap" className="mb-16">
            <p className="mb-5 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
              Phase Roadmap
            </p>

            <ol className="flex flex-col gap-3">
              {PHASE_ROADMAP.map(({ phase, label, status }) => (
                <li key={phase} className="flex items-start gap-3">
                  <span
                    aria-hidden="true"
                    className={[
                      "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold",
                      status === "preview"
                        ? "border-emerald-600/60 bg-emerald-900/30 text-emerald-400"
                        : "border-slate-700 bg-slate-900 text-slate-600",
                    ].join(" ")}
                  >
                    {phase}
                  </span>

                  <div className="flex flex-1 items-center gap-3">
                    <span
                      className={[
                        "text-sm",
                        status === "preview" ? "text-gray-200" : "text-gray-500",
                      ].join(" ")}
                    >
                      {label}
                    </span>
                    {status === "preview" && (
                      <span className="rounded-full border border-emerald-700/40 bg-emerald-950/50 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-emerald-500">
                        UI preview
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {/* ── Upgrade CTA ───────────────────────────── */}
          <section aria-label="Upgrade" className="mb-16">
            <div className="flex flex-col items-start gap-4 rounded-2xl border border-mineral bg-gray-900/60 p-8">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
                Access Required
              </p>
              <h2 className="text-xl font-bold text-white">
                Bet Tracker is a Pro + Elite feature.
              </h2>
              <p className="text-sm leading-relaxed text-gray-400">
                Upgrade to Pro or Elite to log bets, track ROI, and measure your performance
                against Galaxy&apos;s published signals. Your record, your edge.
              </p>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-600"
              >
                View plans
                <ChevronRightIcon />
              </Link>
            </div>
          </section>

          <RiskDisclosure variant="compact" className="mt-4" />
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

function ChevronDownIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </svg>
  );
}

function LogIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.75}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 4.5v15m7.5-7.5h-15"
      />
    </svg>
  );
}

function EmptyLogIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-5 w-5 text-slate-600"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.75}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z"
      />
    </svg>
  );
}
