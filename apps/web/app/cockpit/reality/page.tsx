import Link from "next/link";
import {
  EDGE_TYPES,
  AUTOPSY_CLASSES,
  DEFAULT_MIN_CALIBRATION_SAMPLE,
  SOVEREIGN_MIN_CLV_SAMPLE,
  type EdgeType,
  type AutopsyClass,
} from "@sports/prediction-engine";
import { loadRealityDiagnostics } from "@/lib/reality/load-diagnostics";
import type {
  DiagnosticsReport,
  ClvSegmentReport,
  EdgeTypeCount,
  AutopsyCount,
} from "@/lib/reality/diagnostics";
import { loadRealityBacktest } from "@/lib/reality/load-backtest";
import type {
  BacktestReport,
  SliceMetrics,
  OutOfSampleResult,
  RollingWindowResult,
} from "@/lib/reality/backtest";
import { BREAK_EVEN_VIG_110 } from "@/lib/reality/backtest";

/**
 * Cockpit · Reality Engine (Workstream-K "win-rate truth machine").
 *
 * Admin-only by virtue of the cockpit layout's ADMIN gate; INTERNAL, not public.
 * This is a DISPLAY-ONLY mirror of the offline diagnostics: it reads the pure
 * `DiagnosticsReport` from the never-throw loader and renders it. It scores
 * nothing, flips no gate, changes no published pick, and asserts no public claim.
 * Every figure traces to the loader (real settled-pick rows) or to an explicit
 * honest empty state — never a fabricated number, never a silent zero dressed as
 * confidence.
 */
export const dynamic = "force-dynamic";

export default async function CockpitRealityPage(): Promise<JSX.Element> {
  const [diagnosticsResult, backtestResult] = await Promise.all([
    loadRealityDiagnostics(),
    loadRealityBacktest(),
  ]);
  const { dataMode, loadedAtIso, note, report } = diagnosticsResult;
  const live = dataMode === "live";

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-yellow-300">
              Reality Engine · Internal
            </p>
            <h1 className="mt-1 text-2xl font-bold text-white">Win-Rate Truth Machine</h1>
          </div>
          <Link
            href="/cockpit"
            className="rounded-lg border border-white/[0.06] px-3 py-1.5 text-xs text-ink-300 hover:bg-white/[0.03]"
          >
            Back to Jarvis
          </Link>
        </div>
        <p className="max-w-3xl text-sm text-ink-400">
          A read-only mirror of the offline diagnostics aggregator. It reports what the settled
          record actually shows — CLV by segment, edge-type and autopsy-class counts, and an honest
          calibration-readiness line.{" "}
          <span className="text-ink-200">
            Nothing here is wired into live confidence or any published pick.
          </span>{" "}
          Confidence remains the heuristic sum in scoring.ts; this is decision-support, not a pick
          driver.
        </p>
        <p className="text-[11px] text-ink-600">
          Data mode: <DataModeBadge live={live} /> · loaded {new Date(loadedAtIso).toLocaleString("en-US")}
        </p>
      </header>

      {/* ── Calibration-readiness banner ─────────────────────────────────────── */}
      <CalibrationBanner report={report} live={live} note={note} />

      {/* ── Headline counts ──────────────────────────────────────────────────── */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Settled records" value={String(report.totalRecords)} />
        <Metric label="Decided (WIN/LOSS)" value={String(report.decidedRecords)} />
        <Metric label="CLV-graded" value={String(report.clvGradedRecords)} />
        <Metric
          label="Calibration floor"
          value={`${report.calibration.eligibleSampleSize ?? "?"} / ${report.calibration.floor}`}
        />
      </section>

      {/* ── CLV by segment ───────────────────────────────────────────────────── */}
      <ClvSegmentSection report={report} />

      {/* ── Edge-type counts (from the registry) ─────────────────────────────── */}
      <EdgeTypeSection report={report} />

      {/* ── Autopsy-class counts ─────────────────────────────────────────────── */}
      <AutopsySection report={report} />

      {/* ── Sovereign Edge Index status (SHADOW / inert) ─────────────────────── */}
      <SovereignPanel report={report} />

      {/* ── A4 out-of-sample backtest (READ-ONLY, weight 0) ──────────────────── */}
      <BacktestSection
        report={backtestResult.report}
        dataMode={backtestResult.dataMode}
        loadedAtIso={backtestResult.loadedAtIso}
        note={backtestResult.note}
      />

      {/* ── Standing caveats ─────────────────────────────────────────────────── */}
      <section className="rounded-lg border border-white/[0.06] bg-obsidian/60 p-4">
        <h2 className="text-sm font-semibold text-white">Standing caveats</h2>
        <ul className="mt-3 flex flex-col gap-2">
          {report.caveats.map((caveat, i) => (
            <li key={i} className="text-xs text-ink-400">
              • {caveat}
            </li>
          ))}
        </ul>
      </section>

      <p className="text-[11px] text-ink-600">
        Internal operator surface — admin-gated, display-only. No fabricated numbers: every figure is
        read from the loader or shown as an explicit empty state. &ldquo;unknown&rdquo; means the value
        was unavailable (e.g. database unreachable), never silently treated as zero.
      </p>
    </div>
  );
}

// ── Calibration-readiness banner ──────────────────────────────────────────────

function CalibrationBanner({
  report,
  live,
  note,
}: {
  readonly report: DiagnosticsReport;
  readonly live: boolean;
  readonly note: string;
}): JSX.Element {
  const { calibration } = report;
  const eligible = calibration.eligibleSampleSize;
  const floor = calibration.floor;
  const pct =
    eligible == null ? null : Math.min(100, Math.round((eligible / Math.max(1, floor)) * 100));

  return (
    <section className="rounded-lg border border-amber-700/40 bg-amber-950/30 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="rounded-md border border-amber-700/60 bg-amber-900/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-amber-300">
            Calibration readiness
          </span>
          <span className="font-mono text-sm font-semibold text-amber-100">
            {eligible ?? "unknown"} / {floor} eligible settled picks
          </span>
        </div>
        {pct != null && (
          <span className="font-mono text-xs text-amber-200/80">{pct}% of floor</span>
        )}
      </div>

      {pct != null && (
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-amber-950/60">
          <div
            className="h-full rounded-full bg-amber-500/70"
            style={{ width: `${pct}%` }}
            aria-hidden
          />
        </div>
      )}

      <p className="mt-3 text-xs leading-relaxed text-amber-100/90">{calibration.statusLine}</p>

      <p className="mt-2 text-xs leading-relaxed text-amber-200/70">
        Building the record — calibration is data-blocked below the floor and self-suppresses, so
        confidence stays uncalibrated. {note}
      </p>

      <div className="mt-3 rounded-md border border-amber-700/40 bg-amber-950/40 p-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-300">
          Owner unlock note
        </p>
        <p className="mt-1 text-xs leading-relaxed text-amber-100/90">
          To start accruing the eligible record: attach <code className="font-mono">THE_ODDS_API_KEY</code>{" "}
          so real settled outcomes flow in, then flip{" "}
          <code className="font-mono">OUTCOME_LEARNING_ENABLED</code> (data collection only — it does
          not change scoring). Crossing {floor} is EVIDENCE that an offline fit may be attempted; it is
          not authorization. Activation remains a separate owner-gated MODEL_VERSION step with held-out
          ECE validation.
        </p>
      </div>

      {!live && (
        <p className="mt-3 text-[11px] font-semibold text-amber-300">
          Database unreachable / stub mode — this is an honest-empty report. Restore the connection to
          populate it.
        </p>
      )}
    </section>
  );
}

// ── CLV-by-segment ─────────────────────────────────────────────────────────────

function ClvSegmentSection({ report }: { readonly report: DiagnosticsReport }): JSX.Element {
  return (
    <section className="overflow-hidden rounded-lg border border-white/[0.06] bg-obsidian/60">
      <div className="border-b border-white/[0.06] px-4 py-3">
        <h2 className="text-sm font-semibold text-white">CLV by segment</h2>
        <p className="mt-1 text-xs text-ink-500">
          Closing-line value fanned out by sport × market × time-to-close × confidence band × unit.
          Points and probability are never averaged together. Segments under the minimum sample are
          shown as &ldquo;collecting&rdquo;, not hidden.
        </p>
      </div>
      {report.clvBySegment.length === 0 ? (
        <p className="px-4 py-6 text-sm text-ink-500">
          No CLV-graded segments yet. CLV is graded at settlement against the closing line derived
          from the stored odds history; once settled picks carry a graded verdict they appear here.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-titanium/30 text-sm">
            <thead className="bg-white/[0.04]/50 text-left text-[11px] uppercase tracking-wider text-ink-500">
              <tr>
                <th className="px-4 py-3">Segment</th>
                <th className="px-4 py-3">Unit</th>
                <th className="px-4 py-3">Sample</th>
                <th className="px-4 py-3">Beat rate</th>
                <th className="px-4 py-3">Mean CLV</th>
                <th className="px-4 py-3">State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-titanium/30">
              {report.clvBySegment.map((seg) => (
                <ClvSegmentRow key={seg.segmentKey} seg={seg} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function ClvSegmentRow({ seg }: { readonly seg: ClvSegmentReport }): JSX.Element {
  const s = seg.summary;
  return (
    <tr className="text-ink-300">
      <td className="px-4 py-3 font-mono text-xs text-white">{seg.segmentKey}</td>
      <td className="whitespace-nowrap px-4 py-3">{seg.unit}</td>
      <td className="whitespace-nowrap px-4 py-3">{s.sampleSize}</td>
      <td className="whitespace-nowrap px-4 py-3">{formatRate(s.beatCloseRate)}</td>
      <td className="whitespace-nowrap px-4 py-3">{formatSigned(s.averageClv)}</td>
      <td className="whitespace-nowrap px-4 py-3">
        {seg.suppressed ? (
          <span className="inline-flex rounded-full border border-white/[0.06] bg-white/[0.04]/70 px-2 py-1 text-[11px] text-ink-400">
            collecting
          </span>
        ) : (
          <span className="inline-flex rounded-full border border-sky-500/30 bg-sky-950/40 px-2 py-1 text-[11px] text-sky-200">
            measured
          </span>
        )}
      </td>
    </tr>
  );
}

// ── Edge-type counts ───────────────────────────────────────────────────────────

function EdgeTypeSection({ report }: { readonly report: DiagnosticsReport }): JSX.Element {
  const countByType = new Map<string, EdgeTypeCount>();
  for (const c of report.edgeTypeCounts) countByType.set(c.type, c);

  return (
    <section className="rounded-lg border border-white/[0.06] bg-obsidian/60">
      <div className="border-b border-white/[0.06] px-4 py-3">
        <h2 className="text-sm font-semibold text-white">Edge-type counts</h2>
        <p className="mt-1 text-xs text-ink-500">
          An edge type is a hypothesis about WHY there is an edge — never proof. Only the three
          detectable-now types fire from signals we already store; data-blocked types are shown with
          the signals they require, never as a zero dressed as confidence.
        </p>
      </div>
      <div className="divide-y divide-titanium/30">
        {EDGE_TYPES.map((spec) => {
          const tally = countByType.get(spec.type);
          return (
            <EdgeTypeRow
              key={spec.type}
              type={spec.type}
              definition={spec.definition}
              detectableNow={spec.detectableNow}
              dataStatus={spec.dataStatus}
              requiredSignals={spec.requiredSignals}
              count={tally?.count ?? 0}
            />
          );
        })}
      </div>
    </section>
  );
}

function EdgeTypeRow({
  type,
  definition,
  detectableNow,
  dataStatus,
  requiredSignals,
  count,
}: {
  readonly type: EdgeType;
  readonly definition: string;
  readonly detectableNow: boolean;
  readonly dataStatus: string;
  readonly requiredSignals: readonly string[];
  readonly count: number;
}): JSX.Element {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <code className="font-mono text-sm font-semibold text-white">{type}</code>
          <span
            className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
              detectableNow
                ? "border-emerald-500/30 bg-emerald-950/40 text-emerald-200"
                : "border-white/[0.06] bg-white/[0.04]/70 text-ink-400"
            }`}
          >
            {dataStatus}
          </span>
        </div>
        <p className="mt-1 max-w-2xl text-xs text-ink-400">{definition}</p>
        {!detectableNow && (
          <p className="mt-1 text-[11px] text-amber-200/70">
            requires data: {requiredSignals.join(", ")}
          </p>
        )}
      </div>
      <div className="shrink-0 text-right">
        {detectableNow ? (
          <span className="font-mono text-lg font-bold text-white">{count}</span>
        ) : (
          <span className="font-mono text-[11px] uppercase tracking-wider text-ink-500">
            data-blocked
          </span>
        )}
      </div>
    </div>
  );
}

// ── Autopsy-class counts ─────────────────────────────────────────────────────────

function AutopsySection({ report }: { readonly report: DiagnosticsReport }): JSX.Element {
  const countByClass = new Map<AutopsyClass, number>();
  for (const c of report.autopsyCounts) countByClass.set(c.cls, c.count);
  const total = report.autopsyCounts.reduce((sum: number, c: AutopsyCount) => sum + c.count, 0);

  return (
    <section className="rounded-lg border border-white/[0.06] bg-obsidian/60">
      <div className="border-b border-white/[0.06] px-4 py-3">
        <h2 className="text-sm font-semibold text-white">Autopsy-class counts</h2>
        <p className="mt-1 text-xs text-ink-500">
          Process, not scoreboard: a win that lost the close is a bad win; a loss that beat the close
          is a good loss. Classes needing signals we lack are unreachable by design and never forced
          onto the evidence.
        </p>
      </div>
      {total === 0 ? (
        <p className="px-4 py-6 text-sm text-ink-500">
          No settled picks classified yet. Autopsy classes are assigned at settlement from result ×
          CLV × line-movement × freshness; counts appear here once the record exists.
        </p>
      ) : (
        <div className="divide-y divide-titanium/30">
          {AUTOPSY_CLASSES.map((spec) => {
            const count = countByClass.get(spec.cls);
            // Only show classes that occurred OR are computable-now (a stable, honest shape).
            if (count == null && spec.computability !== "computable-now") return null;
            return (
              <AutopsyRow
                key={spec.cls}
                cls={spec.cls}
                definition={spec.definition}
                computable={spec.computability === "computable-now"}
                count={count ?? 0}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}

function AutopsyRow({
  cls,
  definition,
  computable,
  count,
}: {
  readonly cls: AutopsyClass;
  readonly definition: string;
  readonly computable: boolean;
  readonly count: number;
}): JSX.Element {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <code className="font-mono text-sm font-semibold text-white">{cls}</code>
          {!computable && (
            <span className="rounded-md border border-white/[0.06] bg-white/[0.04]/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ink-400">
              needs more signal
            </span>
          )}
        </div>
        <p className="mt-1 max-w-2xl text-xs text-ink-400">{definition}</p>
      </div>
      <span className="shrink-0 font-mono text-lg font-bold text-white">{count}</span>
    </div>
  );
}

// ── Sovereign Edge Index status (SHADOW / inert) ────────────────────────────────

function SovereignPanel({ report }: { readonly report: DiagnosticsReport }): JSX.Element {
  // The index is uncalibrated today (the settled sample is below the calibration
  // floor), so by its own honesty guard it can never return ATTACK.
  const uncalibrated = !report.calibration.meetsFloor;
  return (
    <section className="rounded-lg border border-violet-500/30 bg-violet-950/30 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="rounded-md border border-violet-500/40 bg-violet-900/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-violet-200">
            Sovereign Edge Index
          </span>
          <span className="rounded-md border border-violet-500/40 bg-violet-900/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-violet-200">
            SHADOW · weight 0
          </span>
        </div>
        <span className="font-mono text-xs text-violet-200/80">decision-support preview</span>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-violet-100/90">
        The Sovereign Edge Index is an inert shadow index: weight 0, decision-support only. It does not
        score, gate, tier, or price anything and is not imported by the live scoring path. It exists so
        the composition logic is written and tested, ready for the day the upstream engines (calibration
        especially) become real.
      </p>
      <p className="mt-2 text-xs leading-relaxed text-violet-100/90">
        Its non-negotiable honesty guard: while the probability is uncalibrated{" "}
        {uncalibrated ? "(the reality today — sample below the floor)" : ""}, the index can never return
        ATTACK. It caps at WATCH/PASS and says exactly why — ATTACK is a claim of a real, calibrated
        edge, and without a calibrated probability that claim cannot be made. A supporting CLV
        beat-rate needs at least {SOVEREIGN_MIN_CLV_SAMPLE} graded picks on a segment before it counts
        toward (never certifies) a higher label, and the calibration floor itself is{" "}
        {DEFAULT_MIN_CALIBRATION_SAMPLE} eligible settled picks.
      </p>
      <p className="mt-2 text-[11px] text-violet-200/70">
        This panel is a status preview, not a live pick driver. No published pick reads from this index.
      </p>
    </section>
  );
}

// ── A4 Backtest section ───────────────────────────────────────────────────────────

function BacktestSection({
  report,
  dataMode,
  loadedAtIso,
  note,
}: {
  readonly report: BacktestReport;
  readonly dataMode: "live" | "unavailable";
  readonly loadedAtIso: string;
  readonly note: string;
}): JSX.Element {
  const live = dataMode === "live";

  return (
    <section className="rounded-lg border border-sky-500/20 bg-obsidian/60">
      {/* Header */}
      <div className="border-b border-sky-500/20 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-sky-500/30 bg-sky-950/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-sky-200">
              A4 Backtest
            </span>
            <span className="rounded-md border border-white/[0.06] bg-white/[0.04]/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-ink-400">
              READ-ONLY · weight 0
            </span>
            <DataModeBadge live={live} />
          </div>
          <span className="font-mono text-[11px] text-ink-600">
            loaded {new Date(loadedAtIso).toLocaleString("en-US")}
          </span>
        </div>
        <h2 className="mt-2 text-sm font-semibold text-white">
          Out-of-sample / win-rate validation
        </h2>
        <p className="mt-1 max-w-3xl text-xs leading-relaxed text-ink-400">
          The offline A4 backtest harness, surfaced read-only for internal review. It computes
          win rate vs the −110 break-even (52.38%), CLV beat-close rate, Brier score, ECE, and
          an out-of-sample holdout split (chronological 20% tail). This is anti-delusion
          machinery: it changes no scoring, no schema, no gate, and no published pick. Every
          figure traces to real settled-pick rows or to an explicit honest empty state.
        </p>
        <p className="mt-2 text-xs text-ink-500">{note}</p>
      </div>

      {/* Body */}
      {report.status === "INSUFFICIENT_SAMPLE" ? (
        <BacktestInsufficientPanel report={report} />
      ) : (
        <BacktestOkPanel report={report} />
      )}

      {/* Standing caveat line */}
      <div className="border-t border-sky-500/20 px-4 py-3">
        <p className="text-[11px] leading-relaxed text-ink-600">
          Raw win rate is not profit — break-even at standard −110 juice is{" "}
          {formatRate(BREAK_EVEN_VIG_110)}. CLV beat-close is the leading edge indicator (we
          beat the closing line); win rate is the lagging scoreboard subject to variance.
          The holdout number is the honest one; in-sample is optimistic by construction. This
          panel is offline and read-only — it changes nothing in the live scoring path.
        </p>
      </div>
    </section>
  );
}

function BacktestInsufficientPanel({ report }: { readonly report: BacktestReport }): JSX.Element {
  return (
    <div className="px-4 py-6">
      <div className="rounded-md border border-amber-700/40 bg-amber-950/30 p-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-300">
          Building the record
        </p>
        <p className="mt-2 text-sm text-amber-100/90">
          {report.insufficientSampleNote ??
            "Insufficient sample — accumulate more settled picks before the backtest can produce signal."}
        </p>
        <div className="mt-3 flex gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-300/70">
              Total records
            </p>
            <p className="font-mono text-lg font-bold text-amber-100">{report.totalRecords}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-300/70">
              Decided (WIN/LOSS)
            </p>
            <p className="font-mono text-lg font-bold text-amber-100">{report.decidedRecords}</p>
          </div>
        </div>
        <p className="mt-3 text-xs text-amber-200/70">
          Below-floor analysis is noise presented as signal. The backtest self-suppresses at
          100 records to prevent misleading conclusions from a small sample. This is not an
          error — it is an honest reflection of where the record stands today.
        </p>
      </div>
    </div>
  );
}

function BacktestOkPanel({ report }: { readonly report: BacktestReport }): JSX.Element {
  const m = report.overallMetrics;
  const oos = report.overallOutOfSample;

  return (
    <div className="flex flex-col gap-6 px-4 py-5">
      {/* Headline metrics */}
      <div>
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-ink-500">
          Headline metrics — {report.totalRecords} settled · {report.decidedRecords} decided
        </p>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <BacktestMetric
            label="Win rate"
            value={formatRate(m.winRate)}
            sub={`break-even ${formatRate(BREAK_EVEN_VIG_110)}`}
            highlight={m.clearsBreakEven ? "positive" : m.winRate !== null ? "negative" : "neutral"}
          />
          <BacktestMetric
            label="Clears break-even"
            value={m.winRate === null ? "—" : m.clearsBreakEven ? "YES" : "NO"}
            sub="at −110 standard juice"
            highlight={m.clearsBreakEven ? "positive" : m.winRate !== null ? "negative" : "neutral"}
          />
          <BacktestMetric
            label="CLV beat-close rate"
            value={formatRate(m.clvBeatCloseRate)}
            sub="leading edge indicator"
            highlight="neutral"
          />
          <BacktestMetric
            label="ECE (calibration)"
            value={m.ece !== null ? m.ece.toFixed(4) : "—"}
            sub={m.calibrationHolds === null ? "insufficient data" : m.calibrationHolds ? "holds (< 0.05)" : "fails (≥ 0.05)"}
            highlight={m.calibrationHolds === null ? "neutral" : m.calibrationHolds ? "positive" : "negative"}
          />
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <BacktestMetric
            label="Brier score"
            value={m.brierScore !== null ? m.brierScore.toFixed(4) : "—"}
            sub="mean squared error of confidence vs outcome"
            highlight="neutral"
          />
          <BacktestMetric
            label="Edge over vig"
            value={m.edgeOverVig !== null ? formatSigned(m.edgeOverVig) : "—"}
            sub="raw win rate minus 52.38% — negative = under break-even"
            highlight={
              m.edgeOverVig === null
                ? "neutral"
                : m.edgeOverVig >= 0
                ? "positive"
                : "negative"
            }
          />
        </div>
      </div>

      {/* Out-of-sample block */}
      <OutOfSampleBlock oos={oos} />

      {/* Rolling windows table */}
      {report.overallRollingWindows.length > 0 && (
        <RollingWindowsTable windows={report.overallRollingWindows} />
      )}
    </div>
  );
}

function OutOfSampleBlock({ oos }: { readonly oos: OutOfSampleResult }): JSX.Element {
  const h = oos.holdoutMetrics;
  const s = oos.inSampleMetrics;

  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-500">
          Out-of-sample split
        </p>
        <span className="rounded-md border border-white/[0.06] px-2 py-0.5 text-[10px] text-ink-500">
          {Math.round(oos.holdoutFraction * 100)}% holdout · {oos.trainSize} train ·{" "}
          {oos.holdoutSize} holdout
        </span>
        {oos.calibrationHoldsOutOfSample !== null && (
          <span
            className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
              oos.calibrationHoldsOutOfSample
                ? "border-emerald-500/30 bg-emerald-950/40 text-emerald-200"
                : "border-red-500/30 bg-red-950/40 text-red-200"
            }`}
          >
            calibration {oos.calibrationHoldsOutOfSample ? "holds" : "degrades"} out-of-sample
          </span>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-ink-500">
              <th className="pb-2 pr-6">Partition</th>
              <th className="pb-2 pr-6">Size</th>
              <th className="pb-2 pr-6">Win rate</th>
              <th className="pb-2 pr-6">Clears b-e</th>
              <th className="pb-2 pr-6">CLV beat-close</th>
              <th className="pb-2 pr-6">ECE</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            <tr className="text-ink-300">
              <td className="py-2 pr-6">
                <span className="rounded-md border border-sky-500/30 bg-sky-950/40 px-2 py-0.5 text-[10px] font-bold text-sky-200">
                  holdout
                </span>
                <span className="ml-2 text-[11px] text-sky-200/60">the honest number</span>
              </td>
              <td className="py-2 pr-6 font-mono">{h.decidedSize}</td>
              <td className="py-2 pr-6 font-mono">{formatRate(h.winRate)}</td>
              <td className="py-2 pr-6 font-mono">
                {h.winRate === null ? "—" : h.clearsBreakEven ? "yes" : "no"}
              </td>
              <td className="py-2 pr-6 font-mono">{formatRate(h.clvBeatCloseRate)}</td>
              <td className="py-2 pr-6 font-mono">
                {h.ece !== null ? h.ece.toFixed(4) : "—"}
              </td>
            </tr>
            <tr className="text-ink-500">
              <td className="py-2 pr-6">
                <span className="rounded-md border border-white/[0.06] bg-white/[0.04]/70 px-2 py-0.5 text-[10px] font-bold text-ink-400">
                  in-sample
                </span>
                <span className="ml-2 text-[11px] text-ink-600">optimistic by construction</span>
              </td>
              <td className="py-2 pr-6 font-mono">{s.decidedSize}</td>
              <td className="py-2 pr-6 font-mono">{formatRate(s.winRate)}</td>
              <td className="py-2 pr-6 font-mono">
                {s.winRate === null ? "—" : s.clearsBreakEven ? "yes" : "no"}
              </td>
              <td className="py-2 pr-6 font-mono">{formatRate(s.clvBeatCloseRate)}</td>
              <td className="py-2 pr-6 font-mono">
                {s.ece !== null ? s.ece.toFixed(4) : "—"}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RollingWindowsTable({
  windows,
}: {
  readonly windows: readonly RollingWindowResult[];
}): JSX.Element {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-ink-500">
        Rolling windows — trailing-N chronological slices (drift detection)
      </p>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-ink-500">
              <th className="pb-2 pr-6">Window (N)</th>
              <th className="pb-2 pr-6">Decided</th>
              <th className="pb-2 pr-6">Win rate</th>
              <th className="pb-2 pr-6">Clears b-e</th>
              <th className="pb-2 pr-6">CLV beat-close</th>
              <th className="pb-2 pr-6">ECE</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {windows.map((w) => (
              <RollingWindowRow key={`${w.windowSize}-${w.modelVersion ?? "all"}`} w={w} />
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[11px] text-ink-600">
        Rolling windows surface recency drift hidden by full-sample averages. A degrading
        trailing window is a signal worth investigating — not proof of a failing strategy,
        but evidence worth taking seriously.
      </p>
    </div>
  );
}

function RollingWindowRow({ w }: { readonly w: RollingWindowResult }): JSX.Element {
  const m: SliceMetrics = w.metrics;
  return (
    <tr className="text-ink-300">
      <td className="py-2 pr-6 font-mono text-white">{w.windowSize}</td>
      <td className="py-2 pr-6 font-mono">{m.decidedSize}</td>
      <td className="py-2 pr-6 font-mono">{formatRate(m.winRate)}</td>
      <td className="py-2 pr-6 font-mono">
        {m.winRate === null ? "—" : m.clearsBreakEven ? "yes" : "no"}
      </td>
      <td className="py-2 pr-6 font-mono">{formatRate(m.clvBeatCloseRate)}</td>
      <td className="py-2 pr-6 font-mono">{m.ece !== null ? m.ece.toFixed(4) : "—"}</td>
    </tr>
  );
}

/**
 * A Metric tile variant for the backtest section — adds a sub-line and highlight
 * color without duplicating the shared `Metric` component (which takes only a string
 * value with no sub-line or color option).
 */
function BacktestMetric({
  label,
  value,
  sub,
  highlight,
}: {
  readonly label: string;
  readonly value: string;
  readonly sub: string;
  readonly highlight: "positive" | "negative" | "neutral";
}): JSX.Element {
  const valueColor =
    highlight === "positive"
      ? "text-emerald-300"
      : highlight === "negative"
      ? "text-red-300"
      : "text-white";

  return (
    <div className="rounded-lg border border-white/[0.06] bg-obsidian/60 px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-500">{label}</p>
      <p className={`mt-1 text-lg font-bold ${valueColor}`}>{value}</p>
      <p className="mt-0.5 text-[11px] text-ink-600">{sub}</p>
    </div>
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

function formatSigned(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(3)}`;
}
