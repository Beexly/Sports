import Link from "next/link";

import {
  loadCalibrationLearning,
  type CalibrationLearningReport,
  type SignalContingency,
  type ContingencyArm,
} from "@/lib/cockpit/load-calibration-learning";

/**
 * Cockpit · Calibration Learning (Wave A internal workbench).
 *
 * Admin-only by virtue of the cockpit layout's ADMIN gate; INTERNAL, not public.
 * This is a DISPLAY-ONLY surface that wires dormant pure analytics/math libraries
 * (statistics Pearson correlation, probability-distributions Wilson intervals)
 * onto the pick signal snapshots + settled outcomes we already store. It surfaces
 * — HONESTLY and as HYPOTHESIS-GENERATING ONLY — which active signals co-occur
 * with wins.
 *
 * THIS IS THE MOST HONESTY-SENSITIVE SURFACE IN THE COCKPIT. The learning-eligible
 * sample is tiny. Everything here is exploratory CORRELATION, not causation, not
 * proof, not predictive, and NOT a model input. It scores nothing, flips no gate,
 * changes no published pick, and changes no model weight. Every figure traces to
 * the loader (real learning-eligible snapshots) or to an explicit honest empty
 * state — never a fabricated number.
 */
export const dynamic = "force-dynamic";

export default async function CockpitCalibrationLearningPage(): Promise<JSX.Element> {
  const { dataMode, loadedAtIso, note, report } = await loadCalibrationLearning();
  const live = dataMode === "live";

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-yellow-300">
              Calibration Learning · Internal
            </p>
            <h1 className="mt-1 text-2xl font-bold text-white">Calibration Learning Workbench</h1>
          </div>
          <Link
            href="/cockpit"
            className="rounded-lg border border-white/[0.06] px-3 py-1.5 text-xs text-ink-300 hover:bg-white/[0.03]"
          >
            Back to Jarvis
          </Link>
        </div>
        <p className="max-w-3xl text-sm text-ink-400">
          A read-only exploration that runs the pure statistics and probability libraries over the
          learning-eligible pick signal snapshots: for each active signal, the win rate among picks
          where it was active versus where it was not, each with a Wilson 95% interval, plus an
          exploratory signal-count vs win correlation.
        </p>

        {/* The unmissable honesty frame — repeated on every view below as well. */}
        <div className="rounded-lg border border-rose-500/30 bg-rose-950/30 p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-rose-200">
            Read this first
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-relaxed text-rose-100/90">
            <li>
              <strong className="text-rose-100">Correlation, not causation.</strong> A signal
              co-occurring with wins does not mean it caused them.
            </li>
            <li>
              <strong className="text-rose-100">Exploratory / hypothesis-generating only.</strong>{" "}
              Nothing here is a model input, a confidence weight, or a published pick driver.
            </li>
            <li>
              The live decided learning-eligible sample is{" "}
              <span className="font-mono">{report.decidedRecords}</span> picks — far below the{" "}
              <span className="font-mono">{report.floor}</span> floor needed to infer anything.
            </li>
            <li>
              No number on this page changes any published pick or any model weight. It is for
              generating questions to study, nothing more.
            </li>
          </ul>
        </div>

        <p className="text-[11px] text-ink-600">
          Data mode: <DataModeBadge live={live} /> · loaded{" "}
          {new Date(loadedAtIso).toLocaleString("en-US")}
        </p>
        <p className="max-w-3xl text-[11px] leading-relaxed text-ink-600">
          Caveat: only learning-eligible (non-bootstrap, settlement-recorded, learning-gate admitted)
          picks enter the sample, and only WIN/LOSS decide a rate. A signal never observed active is
          omitted entirely rather than shown as a 0% row.
        </p>
      </header>

      {/* ── Status banner ────────────────────────────────────────────────────── */}
      <StatusBanner report={report} live={live} note={note} />

      {/* ── Headline counts ──────────────────────────────────────────────────── */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Learning-eligible records" value={String(report.totalRecords)} />
        <Metric label="Decided (WIN/LOSS)" value={String(report.decidedRecords)} />
        <Metric label="Sample floor" value={`${report.decidedRecords} / ${report.floor}`} />
        <Metric label="Signals observed active" value={String(report.contingencies.length)} />
      </section>

      {/* The contingency is always shown, but framed as exploratory below the floor. */}
      <ContingencySection report={report} />
      <CorrelationSection report={report} />

      <p className="text-[11px] leading-relaxed text-ink-600">
        Internal operator surface — admin-gated, display-only. No fabricated numbers: every figure is
        read from the loader or shown as an explicit empty state. The differences carry Wilson 95%
        intervals so the small sample is never read as precision it does not carry. This is
        exploratory correlation, hypothesis-generating only — it is not causation, not proof, not
        predictive, and not a model input. Nothing here changes any published pick or model weight.
      </p>
    </div>
  );
}

// ── Status banner ───────────────────────────────────────────────────────────────

function StatusBanner({
  report,
  live,
  note,
}: {
  readonly report: CalibrationLearningReport;
  readonly live: boolean;
  readonly note: string;
}): JSX.Element {
  const pct = Math.min(100, Math.round((report.decidedRecords / Math.max(1, report.floor)) * 100));

  return (
    <section className="rounded-lg border border-amber-700/40 bg-amber-950/30 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="rounded-md border border-amber-700/60 bg-amber-900/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-amber-300">
            Sample readiness
          </span>
          <span className="font-mono text-sm font-semibold text-amber-100">
            {report.decidedRecords} / {report.floor} decided learning-eligible picks
          </span>
        </div>
        <span className="font-mono text-xs text-amber-200/80">{pct}% of floor</span>
      </div>

      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-amber-950/60">
        <div
          className="h-full rounded-full bg-amber-500/70"
          style={{ width: `${pct}%` }}
          aria-hidden
        />
      </div>

      <p className="mt-3 text-xs leading-relaxed text-amber-100/90">
        {report.status === "OK"
          ? "The decided sample clears the floor — but the contingency below is still only exploratory correlation, never a model input."
          : report.insufficientNote ??
            "Not enough learning-eligible data to infer anything — this is exploratory only."}
      </p>
      <p className="mt-2 text-xs leading-relaxed text-amber-200/70">{note}</p>

      {!live && (
        <p className="mt-3 text-[11px] font-semibold text-amber-300">
          Database unreachable / stub mode — this is an honest-empty report. Restore the connection to
          populate it.
        </p>
      )}
    </section>
  );
}

// ── Contingency table ──────────────────────────────────────────────────────────────

function ContingencySection({
  report,
}: {
  readonly report: CalibrationLearningReport;
}): JSX.Element {
  const exploratory = report.status === "INSUFFICIENT";
  return (
    <section className="overflow-hidden rounded-lg border border-white/[0.06] bg-obsidian/60">
      <div className="border-b border-white/[0.06] px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-semibold text-white">Signal-vs-outcome contingency</h2>
          {exploratory && (
            <span className="rounded-md border border-rose-500/30 bg-rose-950/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-rose-200">
              Exploratory only
            </span>
          )}
        </div>
        <p className="mt-1 max-w-3xl text-xs text-ink-500">
          For each signal observed active, the decided win rate among picks where it was active
          versus where it was not, each with a Wilson 95% interval. The difference is a raw
          co-occurrence delta — it is correlation, not causation, and not a forward-looking edge.
          Signals never observed active are omitted.
        </p>
      </div>
      {report.contingencies.length === 0 ? (
        <p className="px-4 py-6 text-sm text-ink-500">
          No signals were observed active in any learning-eligible settled pick yet. Rows appear here
          once the learning-eligible record exists and carries active signal flags.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-titanium/30 text-sm">
            <thead className="text-left text-[11px] uppercase tracking-wider text-ink-500">
              <tr>
                <th className="px-4 py-3">Signal</th>
                <th className="px-4 py-3">With — decided</th>
                <th className="px-4 py-3">With — win rate (95%)</th>
                <th className="px-4 py-3">Without — decided</th>
                <th className="px-4 py-3">Without — win rate (95%)</th>
                <th className="px-4 py-3">Difference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-titanium/30">
              {report.contingencies.map((c) => (
                <ContingencyRow key={c.key} contingency={c} />
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="border-t border-white/[0.06] px-4 py-3 text-[11px] leading-relaxed text-ink-600">
        The difference column is a description of the loaded sample, not an effect size. On a sample
        this small the intervals overlap heavily, so a positive or negative difference is consistent
        with pure chance. It must not be read as a signal &ldquo;working&rdquo; — it is a question to
        study, not an answer, and it never feeds scoring.
      </p>
    </section>
  );
}

function ContingencyRow({
  contingency,
}: {
  readonly contingency: SignalContingency;
}): JSX.Element {
  const { withSignal, withoutSignal } = contingency;
  return (
    <tr className="text-ink-300">
      <td className="px-4 py-3 font-mono text-xs text-white">{contingency.label}</td>
      <td className="whitespace-nowrap px-4 py-3 font-mono">{withSignal.decided}</td>
      <td className="whitespace-nowrap px-4 py-3 font-mono">{formatArmRate(withSignal)}</td>
      <td className="whitespace-nowrap px-4 py-3 font-mono">{withoutSignal.decided}</td>
      <td className="whitespace-nowrap px-4 py-3 font-mono">{formatArmRate(withoutSignal)}</td>
      <td className="whitespace-nowrap px-4 py-3 font-mono text-ink-400">
        {formatSignedRate(contingency.winRateDifference)}
      </td>
    </tr>
  );
}

// ── Signal-count correlation ──────────────────────────────────────────────────────

function CorrelationSection({
  report,
}: {
  readonly report: CalibrationLearningReport;
}): JSX.Element {
  const { signalCountCorrelation } = report;
  return (
    <section className="rounded-lg border border-white/[0.06] bg-obsidian/60 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-semibold text-white">Signal-count vs win correlation</h2>
        <span className="rounded-md border border-rose-500/30 bg-rose-950/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-rose-200">
          Exploratory only
        </span>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Pearson r" value={formatCorrelation(signalCountCorrelation.r)} />
        <Metric label="Decided picks" value={String(signalCountCorrelation.decided)} />
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-ink-600">
        Pearson correlation between how many signals were active on a pick and whether it won (1) or
        lost (0), over the decided picks. This is exploratory correlation, not causation and not
        predictive. On a sample this small it is dominated by noise; it generates a hypothesis to
        study, nothing more, and it never feeds any scoring path.
      </p>
    </section>
  );
}

// ── shared primitives ───────────────────────────────────────────────────────────

function DataModeBadge({ live }: { readonly live: boolean }): JSX.Element {
  return live ? (
    <span className="rounded-md border border-emerald-500/30 bg-emerald-950/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-200">
      live
    </span>
  ) : (
    <span className="rounded-md border border-red-500/30 bg-red-950/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-200">
      unavailable
    </span>
  );
}

function Metric({ label, value }: { readonly label: string; readonly value: string }): JSX.Element {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-obsidian/60 px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-white">{value}</p>
    </div>
  );
}

function formatRate(rate: number | null | undefined): string {
  if (typeof rate !== "number" || !Number.isFinite(rate)) return "—";
  return `${(rate * 100).toFixed(1)}%`;
}

function formatCi(ci: readonly [number, number] | null | undefined): string {
  if (!ci) return "—";
  const [lo, hi] = ci;
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return "—";
  return `${(lo * 100).toFixed(1)}–${(hi * 100).toFixed(1)}%`;
}

/** Render one arm as "rate (lo–hi%)", or an en-dash when no decided picks. */
function formatArmRate(arm: ContingencyArm): string {
  if (arm.winRate === null) return "—";
  return `${formatRate(arm.winRate)} (${formatCi(arm.ci95)})`;
}

function formatSignedRate(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${(value * 100).toFixed(1)} pts`;
}

function formatCorrelation(r: number | null | undefined): string {
  if (typeof r !== "number" || !Number.isFinite(r)) return "—";
  const sign = r > 0 ? "+" : "";
  return `${sign}${r.toFixed(3)}`;
}
