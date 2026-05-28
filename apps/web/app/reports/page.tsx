import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { RiskDisclosure } from "@/components/ui/risk-disclosure";

// ─────────────────────────────────────────────
// Metadata
// ─────────────────────────────────────────────

export const metadata: Metadata = {
  title: "Galaxy Reports — Deep Sports Intelligence",
  description:
    "Orbit Reports, Edge Reports, Market Mirage, and Signal Reports. Published when the evidence is worth your time, not on a content calendar.",
  alternates: { canonical: "/reports" },
};

// ─────────────────────────────────────────────
// Data
// ─────────────────────────────────────────────

const REPORT_TYPES = [
  {
    id: "orbit",
    name: "Orbit Report",
    cadence: "Weekly",
    description:
      "Weekly intelligence synthesis. What the model saw, what it skipped, what changed.",
    accentClass: "border-blue-600/40 bg-blue-950/10",
    labelClass: "text-blue-400",
    dotClass: "bg-blue-500",
  },
  {
    id: "edge",
    name: "Edge Report",
    cadence: "Signal-triggered",
    description:
      "When a significant market opportunity appears that the model scored highly.",
    accentClass: "border-emerald-600/40 bg-emerald-950/10",
    labelClass: "text-emerald-400",
    dotClass: "bg-emerald-500",
  },
  {
    id: "mirage",
    name: "Market Mirage",
    cadence: "Irregular",
    description:
      "Identifying when public narrative diverges from actual market signals.",
    accentClass: "border-amber-600/40 bg-amber-950/10",
    labelClass: "text-amber-400",
    dotClass: "bg-amber-500",
  },
  {
    id: "signal",
    name: "Signal Report",
    cadence: "Monthly per sport",
    description:
      "Sport-specific deep dives: a single factor, explained with data.",
    accentClass: "border-violet-600/40 bg-violet-950/10",
    labelClass: "text-violet-400",
    dotClass: "bg-violet-500",
  },
  {
    id: "season",
    name: "Season Preview",
    cadence: "Pre-season",
    description:
      "Pre-season analysis: team changes, coaching shifts, market implications.",
    accentClass: "border-slate-600/40 bg-slate-900/40",
    labelClass: "text-slate-300",
    dotClass: "bg-slate-500",
  },
  {
    id: "nobet",
    name: "No-Bet Report",
    cadence: "As warranted",
    description:
      "Why the model passed. Transparent about what didn't clear the gate.",
    accentClass: "border-rose-600/30 bg-rose-950/10",
    labelClass: "text-rose-400",
    dotClass: "bg-rose-500",
  },
] as const;

const LATEST_REPORTS = [
  {
    id: "orbit-may-26-2026",
    type: "Orbit Report",
    title: "Orbit Report — Week of May 26, 2026",
    summary:
      "Weekly synthesis of model activity, gated slates, and factor shifts across the full slate.",
    typeLabel: "ORBIT",
    accentFrom: "from-blue-900/60",
    accentTo: "to-slate-900/60",
    borderClass: "border-blue-700/30",
    labelClass: "text-blue-400",
  },
  {
    id: "mirage-nba-playoffs",
    type: "Market Mirage",
    title: "Market Mirage — Public Narrative vs Lines, NBA Playoffs",
    summary:
      "Where public consensus and actual market signals diverged during the 2026 playoff bracket.",
    typeLabel: "MARKET MIRAGE",
    accentFrom: "from-amber-900/50",
    accentTo: "to-slate-900/60",
    borderClass: "border-amber-700/30",
    labelClass: "text-amber-400",
  },
  {
    id: "edge-mlb-early-season",
    type: "Edge Report",
    title: "Edge Report — MLB Early Season Line Values",
    summary:
      "Early-season market inefficiencies in MLB totals and first-five-inning lines.",
    typeLabel: "EDGE",
    accentFrom: "from-emerald-900/50",
    accentTo: "to-slate-900/60",
    borderClass: "border-emerald-700/30",
    labelClass: "text-emerald-400",
  },
] as const;

const SCHEDULE_ROWS = [
  { label: "Orbit Reports", cadence: "Weekly — every Sunday" },
  { label: "Edge Reports", cadence: "When the data warrants" },
  { label: "Market Mirage", cadence: "Irregular — narrative vs signal gaps" },
  { label: "Signal Reports", cadence: "Monthly per covered sport" },
  { label: "Season Previews", cadence: "Before each major season" },
  { label: "No-Bet Reports", cadence: "As warranted" },
] as const;

// ─────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────

export default function ReportsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-carbon">
      <Nav />

      <main className="flex-1 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">

          {/* ── Hero ─────────────────────────────────── */}
          <header className="mb-16">
            <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.22em] text-gray-500">
              Galaxy Reports
            </p>
            <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
              Deep analysis,{" "}
              <span className="text-gray-400">not daily noise.</span>
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-gray-400">
              Published when the evidence is worth your time.
            </p>
          </header>

          {/* ── Report types grid ─────────────────────── */}
          <section aria-label="Report types" className="mb-20">
            <p className="mb-6 font-mono text-[10px] uppercase tracking-[0.22em] text-gray-500">
              Report Types
            </p>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {REPORT_TYPES.map((report) => (
                <div
                  key={report.id}
                  className={[
                    "flex flex-col gap-3 rounded-2xl border p-6",
                    report.accentClass,
                  ].join(" ")}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={[
                          "h-1.5 w-1.5 rounded-full",
                          report.dotClass,
                        ].join(" ")}
                        aria-hidden="true"
                      />
                      <span
                        className={[
                          "font-mono text-[9px] font-semibold uppercase tracking-[0.2em]",
                          report.labelClass,
                        ].join(" ")}
                      >
                        {report.cadence}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h2 className="text-base font-semibold text-white">
                      {report.name}
                    </h2>
                    <p className="mt-1.5 text-sm leading-relaxed text-gray-400">
                      {report.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── Latest reports ────────────────────────── */}
          <section aria-label="Latest reports" className="mb-20">
            <p className="mb-6 font-mono text-[10px] uppercase tracking-[0.22em] text-gray-500">
              Latest Reports
            </p>

            <div className="flex flex-col gap-5">
              {LATEST_REPORTS.map((report) => (
                <div
                  key={report.id}
                  className={[
                    "relative overflow-hidden rounded-2xl border bg-gradient-to-r p-6",
                    report.borderClass,
                    report.accentFrom,
                    report.accentTo,
                  ].join(" ")}
                >
                  {/* Coming soon badge */}
                  <div className="absolute right-5 top-5">
                    <span className="rounded-full border border-slate-700 bg-gray-900/80 px-2.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-slate-500">
                      Coming soon
                    </span>
                  </div>

                  {/* Type label */}
                  <p
                    className={[
                      "mb-3 font-mono text-[9px] font-semibold uppercase tracking-[0.22em]",
                      report.labelClass,
                    ].join(" ")}
                  >
                    {report.typeLabel}
                  </p>

                  <h3 className="max-w-lg text-lg font-bold text-white">
                    {report.title}
                  </h3>
                  <p className="mt-2 max-w-lg text-sm leading-relaxed text-gray-400">
                    {report.summary}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* ── Subscribe CTA ─────────────────────────── */}
          <section
            aria-label="Subscription"
            className="mb-20 rounded-2xl border border-mineral bg-gray-900/50 p-8"
          >
            <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-gray-500">
              Access
            </p>
            <h2 className="text-xl font-bold text-white">
              Reports are included with Pro and Elite.
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-400">
              Free subscribers get one Orbit Report per month. Pro and Elite
              members receive all report types as published.
            </p>
            <div className="mt-6">
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-gray-900 transition-colors hover:bg-gray-100"
              >
                View plans
                <ChevronRightIcon />
              </Link>
            </div>
          </section>

          {/* ── Publishing schedule ───────────────────── */}
          <section aria-label="Publishing schedule" className="mb-16">
            <p className="mb-6 font-mono text-[10px] uppercase tracking-[0.22em] text-gray-500">
              Publishing Schedule
            </p>

            <div className="rounded-2xl border border-mineral overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-mineral bg-gray-900/60">
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Report
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Cadence
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {SCHEDULE_ROWS.map((row, i) => (
                    <tr
                      key={row.label}
                      className={[
                        "border-b border-mineral/60",
                        i % 2 === 0 ? "bg-gray-900/20" : "",
                        i === SCHEDULE_ROWS.length - 1 ? "border-b-0" : "",
                      ].join(" ")}
                    >
                      <td className="px-5 py-3 font-medium text-gray-300">
                        {row.label}
                      </td>
                      <td className="px-5 py-3 text-gray-500">{row.cadence}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="mt-4 text-xs leading-relaxed text-gray-600">
              Edge Reports and Market Mirage are published when the data warrants
              — not on a content calendar. Quality over output cadence.
            </p>
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
