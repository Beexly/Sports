import Link from "next/link";

import {
  loadPickAnalytics,
  type PickAnalyticsReport,
  type WinRateCell,
  type ReliabilityRow,
} from "@/lib/cockpit/load-pick-analytics";

/**
 * Cockpit · Pick Analytics & Grading (Wave A internal workbench).
 *
 * Admin-only by virtue of the cockpit layout's ADMIN gate; INTERNAL, not public.
 * This is a DISPLAY-ONLY surface that wires dormant pure analytics/math libraries
 * (statistics Wilson intervals, probability-distributions reliability, streak
 * analysis, bankroll/drawdown framing) onto REAL settled-pick data via the
 * never-throw loader. It scores nothing, flips no gate, changes no published
 * pick, and asserts no public claim. Every figure traces to the loader (real
 * settled-pick rows) or to an explicit honest empty state — never a fabricated
 * number, never a silent zero dressed as confidence.
 */
export const dynamic = "force-dynamic";

export default async function CockpitPickAnalyticsPage(): Promise<JSX.Element> {
  const { dataMode, loadedAtIso, note, report } = await loadPickAnalytics();
  const live = dataMode === "live";

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-yellow-300">
              Pick Analytics &amp; Grading · Internal
            </p>
            <h1 className="mt-1 text-2xl font-bold text-white">Pick Analytics Workbench</h1>
          </div>
          <Link
            href="/cockpit"
            className="rounded-lg border border-white/[0.06] px-3 py-1.5 text-xs text-ink-300 hover:bg-white/[0.03]"
          >
            Back to Jarvis
          </Link>
        </div>
        <p className="max-w-3xl text-sm text-ink-400">
          A read-only workbench that runs the pure analytics and math libraries over the settled
          record: tiered, per-sport, and confidence-bin win rates with Wilson 95% confidence
          intervals; reliability by confidence band; CLV beat-rate; a streak read; and a
          bankroll/drawdown shape over a flat-stake series.{" "}
          <span className="text-ink-200">
            Nothing here is wired into live confidence or any published pick.
          </span>{" "}
          It is decision-support, not a pick driver.
        </p>
        <p className="text-[11px] text-ink-600">
          Data mode: <DataModeBadge live={live} /> · loaded {new Date(loadedAtIso).toLocaleString("en-US")}
        </p>
        <p className="max-w-3xl text-[11px] leading-relaxed text-ink-600">
          Caveat: metrics count only canonical, settled, published, non-bootstrap picks, and only
          WIN/LOSS decide a rate. Gated, VOID, PENDING, and no-bet picks are excluded — they never
          inflate a denominator. A push breaks a streak but does not count toward win rate.
        </p>
      </header>

      {/* ── Status banner ────────────────────────────────────────────────────── */}
      <StatusBanner report={report} live={live} note={note} />

      {/* ── Headline counts ──────────────────────────────────────────────────── */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Settled records" value={String(report.totalRecords)} />
        <Metric label="Decided (WIN/LOSS)" value={String(report.decidedRecords)} />
        <Metric
          label="Calibration floor"
          value={`${report.decidedRecords} / ${report.floor}`}
        />
        <Metric
          label="Overall win rate"
          value={report.status === "OK" ? formatRate(report.overall.winRate) : "suppressed"}
        />
      </section>

      {/* The grading sections suppress below the floor — they would be noise. */}
      {report.status === "OK" ? (
        <>
          <OverallSection cell={report.overall} />
          <WinRateTableSection
            title="Win rate by tier"
            subtitle="Subscription gate (FREE / PREMIUM). Each rate is decided WIN/LOSS only, with a Wilson 95% interval. Tiers with zero settled picks are omitted."
            cells={report.byTier}
          />
          <WinRateTableSection
            title="Win rate by sport"
            subtitle="Per-sport decided win rate with a Wilson 95% interval. Sports with zero settled picks are omitted."
            cells={report.bySport}
          />
          <WinRateTableSection
            title="Win rate by confidence bin"
            subtitle="Decided win rate within each published-confidence band. Empty bins are omitted rather than shown as 0%."
            cells={report.byConfidenceBin}
          />
          <ReliabilitySection rows={report.reliability} />
          <ClvSection report={report} />
          <StreakSection report={report} />
          <BankrollSection report={report} />
        </>
      ) : (
        <BelowFloorPanel report={report} />
      )}

      <p className="text-[11px] text-ink-600">
        Internal operator surface — admin-gated, display-only. No fabricated numbers: every figure is
        read from the loader or shown as an explicit empty state. A win rate is reported with a
        confidence interval so a small sample is never read as precision it does not carry. The
        bankroll figures are a shape illustration on a documented flat −110 assumption, not realized
        profit.
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
  readonly report: PickAnalyticsReport;
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
            {report.decidedRecords} / {report.floor} decided settled picks
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
          ? "The decided sample clears the floor — segment grading below is populated. It remains decision-support, not a pick driver."
          : report.insufficientNote ??
            "Building the record — segment grading self-suppresses below the floor."}
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

function BelowFloorPanel({ report }: { readonly report: PickAnalyticsReport }): JSX.Element {
  return (
    <section className="rounded-lg border border-white/[0.06] bg-obsidian/60 p-4">
      <h2 className="text-sm font-semibold text-white">Grading suppressed below the floor</h2>
      <p className="mt-2 max-w-3xl text-xs leading-relaxed text-ink-400">
        {report.insufficientNote ??
          "Insufficient decided sample — accumulate more settled picks before win-rate grading produces signal."}
      </p>
      <div className="mt-3 flex flex-wrap gap-4">
        <Metric label="Settled records" value={String(report.totalRecords)} />
        <Metric label="Decided (WIN/LOSS)" value={String(report.decidedRecords)} />
        <Metric label="CLV-graded" value={String(report.clv.graded)} />
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-ink-600">
        Below-floor segment analysis is noise presented as signal, so it is withheld by design. The
        counts here are honest reads of where the record stands today, not an error.
      </p>
    </section>
  );
}

// ── Overall ──────────────────────────────────────────────────────────────────────

function OverallSection({ cell }: { readonly cell: WinRateCell }): JSX.Element {
  return (
    <section className="rounded-lg border border-white/[0.06] bg-obsidian/60 p-4">
      <h2 className="text-sm font-semibold text-white">Overall decided record</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Win rate" value={formatRate(cell.winRate)} />
        <Metric label="95% interval" value={formatCi(cell.ci95)} />
        <Metric label="Record (W–L–P)" value={`${cell.wins}–${cell.losses}–${cell.pushes}`} />
        <Metric label="Decided" value={String(cell.decided)} />
      </div>
      <p className="mt-3 text-[11px] text-ink-600">
        The Wilson 95% interval is the honest read — it widens on a small sample and tightens as the
        record grows. Raw win rate is not profit; CLV beat-close (below) is the leading edge indicator.
      </p>
    </section>
  );
}

// ── Generic win-rate table ─────────────────────────────────────────────────────────

function WinRateTableSection({
  title,
  subtitle,
  cells,
}: {
  readonly title: string;
  readonly subtitle: string;
  readonly cells: readonly WinRateCell[];
}): JSX.Element {
  return (
    <section className="overflow-hidden rounded-lg border border-white/[0.06] bg-obsidian/60">
      <div className="border-b border-white/[0.06] px-4 py-3">
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        <p className="mt-1 max-w-3xl text-xs text-ink-500">{subtitle}</p>
      </div>
      {cells.length === 0 ? (
        <p className="px-4 py-6 text-sm text-ink-500">
          No settled picks in any group yet. Rows appear here once the canonical settled record exists.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-titanium/30 text-sm">
            <thead className="text-left text-[11px] uppercase tracking-wider text-ink-500">
              <tr>
                <th className="px-4 py-3">Group</th>
                <th className="px-4 py-3">Decided</th>
                <th className="px-4 py-3">W–L–P</th>
                <th className="px-4 py-3">Win rate</th>
                <th className="px-4 py-3">95% interval</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-titanium/30">
              {cells.map((c) => (
                <tr key={c.label} className="text-ink-300">
                  <td className="px-4 py-3 font-mono text-xs text-white">{c.label}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono">{c.decided}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono">
                    {c.wins}–{c.losses}–{c.pushes}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono">{formatRate(c.winRate)}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-ink-400">
                    {formatCi(c.ci95)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

// ── Reliability ────────────────────────────────────────────────────────────────────

function ReliabilitySection({ rows }: { readonly rows: readonly ReliabilityRow[] }): JSX.Element {
  return (
    <section className="overflow-hidden rounded-lg border border-white/[0.06] bg-obsidian/60">
      <div className="border-b border-white/[0.06] px-4 py-3">
        <h2 className="text-sm font-semibold text-white">Reliability by confidence band</h2>
        <p className="mt-1 max-w-3xl text-xs text-ink-500">
          Observed decided win rate vs the band&apos;s mean published confidence. A well-calibrated
          band has the observed rate inside (and near) the claimed confidence. The interval is the
          honest read on the observed rate. This is diagnostic only — it does not recalibrate scoring.
        </p>
      </div>
      {rows.length === 0 ? (
        <p className="px-4 py-6 text-sm text-ink-500">
          No confidence-banded settled picks yet. Bands appear here once settled picks carry a
          published confidence.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-titanium/30 text-sm">
            <thead className="text-left text-[11px] uppercase tracking-wider text-ink-500">
              <tr>
                <th className="px-4 py-3">Band</th>
                <th className="px-4 py-3">Decided</th>
                <th className="px-4 py-3">Mean confidence</th>
                <th className="px-4 py-3">Observed win rate</th>
                <th className="px-4 py-3">95% interval</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-titanium/30">
              {rows.map((r) => (
                <tr key={r.label} className="text-ink-300">
                  <td className="px-4 py-3 font-mono text-xs text-white">{r.label}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono">{r.decided}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono">
                    {formatRate(r.meanConfidence)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono">
                    {formatRate(r.observedWinRate)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-ink-400">
                    {formatCi(r.ci95)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

// ── CLV ──────────────────────────────────────────────────────────────────────────

function ClvSection({ report }: { readonly report: PickAnalyticsReport }): JSX.Element {
  const { clv } = report;
  return (
    <section className="rounded-lg border border-sky-500/20 bg-obsidian/60 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-md border border-sky-500/30 bg-sky-950/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-sky-200">
          CLV
        </span>
        <h2 className="text-sm font-semibold text-white">Closing-line value</h2>
      </div>
      {clv.graded === 0 ? (
        <p className="mt-3 text-sm text-ink-500">
          No CLV-graded settled picks yet. CLV is graded at settlement against the closing line
          derived from the stored odds history; once settled picks carry a verdict it appears here.
        </p>
      ) : (
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Beat-close rate" value={formatRate(clv.beatRate)} />
          <Metric label="95% interval" value={formatCi(clv.beatRateCi95)} />
          <Metric label="Graded picks" value={`${clv.beatClose} / ${clv.graded}`} />
          <Metric label="Mean CLV value" value={formatSigned(clv.meanClvValue)} />
        </div>
      )}
      <p className="mt-3 text-[11px] leading-relaxed text-ink-600">
        CLV beat-close is the leading edge indicator: it measures whether we beat the closing line,
        independent of the win/loss scoreboard, which is subject to variance.
      </p>
    </section>
  );
}

// ── Streak ─────────────────────────────────────────────────────────────────────────

function StreakSection({ report }: { readonly report: PickAnalyticsReport }): JSX.Element {
  const s = report.streak;
  const cur = s.currentStreak;
  const curLabel = cur.type === "none" ? "—" : `${cur.length} ${cur.type}`;
  return (
    <section className="rounded-lg border border-white/[0.06] bg-obsidian/60 p-4">
      <h2 className="text-sm font-semibold text-white">Streak read</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Current streak" value={curLabel} />
        <Metric label="Longest win streak" value={String(s.longestWinStreak)} />
        <Metric label="Longest loss streak" value={String(s.longestLossStreak)} />
        <Metric label="Decided in series" value={String(s.settled)} />
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-ink-600">
        Streaks are read over the chronological decided series (a push breaks a run but is not a
        loss). Streaks are descriptive variance, not a forward-looking signal.
      </p>
    </section>
  );
}

// ── Bankroll / drawdown ──────────────────────────────────────────────────────────────

function BankrollSection({ report }: { readonly report: PickAnalyticsReport }): JSX.Element {
  const b = report.bankroll;
  const dd = b.drawdown;
  return (
    <section className="rounded-lg border border-white/[0.06] bg-obsidian/60 p-4">
      <h2 className="text-sm font-semibold text-white">Bankroll &amp; drawdown framing</h2>
      <p className="mt-1 max-w-3xl text-xs text-ink-500">
        A shape illustration over the chronological decided series at a flat 1-unit stake and the
        standard −110 price (decimal {b.assumedDecimalOdds.toFixed(3)}). The Pick table does not store
        the actual bet price per pick, so this uses one documented assumption — it is not realized
        profit.
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Final P/L (units)" value={formatSigned(b.finalUnits)} />
        <Metric label="Max drawdown" value={formatRate(dd.maxDrawdownPct)} />
        <Metric label="Longest losing run" value={String(dd.worstStreak)} />
        <Metric label="Series length" value={String(b.decided)} />
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-ink-600">
        Max drawdown is the deepest peak-to-trough decline of the running unit balance. This frames
        variance exposure; it asserts nothing about future results.
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

function formatSigned(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(3)}`;
}
