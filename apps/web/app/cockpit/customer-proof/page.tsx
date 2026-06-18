/**
 * Cockpit · Customer Proof — Workstream L3.
 *
 * Admin-only by virtue of the cockpit layout ADMIN gate. INTERNAL.
 *
 * HONESTY RULES (non-negotiable):
 * - Event-based funnel stages (views, checkouts) are NOT YET INSTRUMENTED.
 *   They are shown as "not yet instrumented — wire an analytics provider,"
 *   NEVER as 0 dressed as fact.
 * - DB-backed stages (Ask Galaxy, email signups) show real counts or "unknown."
 * - Paid/MRR lives on /cockpit/revenue — cross-link, never duplicate.
 * - The objection ledger and 14-day market-proof report are linked, not re-rendered.
 */
export const dynamic = "force-dynamic";

import Link from "next/link";
import {
  loadCustomerProofState,
  type CustomerProofState,
  type FunnelStage,
  type ClassificationBreakdown,
} from "@/lib/revenue/customer-proof";
import { RingGauge } from "@/components/ui/ring-gauge";

export default async function CockpitCustomerProofPage(): Promise<JSX.Element> {
  const state = await loadCustomerProofState();
  const { dataMode, loadedAtIso } = state;
  const partial = dataMode === "partial";

  return (
    <div className="flex flex-col gap-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-yellow-300">
              Monetization · Internal
            </p>
            <h1 className="mt-1 text-2xl font-bold text-white">
              Customer proof — the funnel
            </h1>
          </div>
          <Link
            href="/cockpit"
            className="rounded-lg border border-white/[0.06] px-3 py-1.5 text-xs text-ink-300 hover:bg-white/[0.03]"
          >
            ← Back to Jarvis
          </Link>
        </div>
        <p className="max-w-3xl text-sm text-ink-400">
          Decision-support for the owner: real funnel counts where DB-backed,
          honest &ldquo;not yet instrumented&rdquo; where an analytics provider
          is needed. MRR and paid subscriber counts live on{" "}
          <Link
            href="/cockpit/revenue"
            className="text-ink-200 underline underline-offset-2 hover:text-white"
          >
            /cockpit/revenue
          </Link>
          .
        </p>
        <p className="text-[11px] text-ink-600">
          Data mode: <DataModeBadge mode={dataMode} /> · loaded{" "}
          {new Date(loadedAtIso).toLocaleString("en-US")}
          {partial && (
            <span className="ml-2 text-amber-400/80">
              — some DB reads failed; affected counts shown as unknown
            </span>
          )}
        </p>
      </header>

      {/* ── Conversion funnel + gauge ───────────────────────────────────────── */}
      <FunnelSection state={state} />

      {/* ── Ask Galaxy classification breakdown ───────────────────────────── */}
      <ClassificationSection state={state} />

      {/* ── Committed reports ─────────────────────────────────────────────── */}
      <ReportsSection />

      {/* ── Caveat footer ─────────────────────────────────────────────────── */}
      <p className="text-[11px] text-ink-600">
        Internal operator surface — admin-gated, display-only. DB-backed counts
        are real or &ldquo;unknown&rdquo; on error. Analytics-event stages are
        &ldquo;not yet instrumented&rdquo; — connect an analytics provider to
        measure page views and checkout events. Nothing here is fabricated.
      </p>
    </div>
  );
}

// ── Conversion funnel ─────────────────────────────────────────────────────────

/**
 * Compute funnel bar widths.
 *
 * The widest DB-backed bar is always 100% visual width; others scale relative
 * to that. Analytics stages (not instrumented) get 0 visual width but show a
 * distinct "not instrumented" indicator — they are never shown as zero.
 *
 * Drop-off % is computed only between adjacent DB-backed stages with real counts
 * (both non-null). We never fabricate a drop-off from an uninstrumented stage.
 */
function computeFunnelBars(funnel: readonly FunnelStage[]): {
  widthPct: number | null; // null = not instrumented
  dropOffPct: number | null; // % lost between this and the PREVIOUS real stage
}[] {
  // Find the maximum real count to normalize bar widths.
  const realCounts = funnel
    .filter((s): s is typeof s & { kind: "db"; count: number } =>
      s.kind === "db" && s.count !== null && !s.unknown
    )
    .map((s) => s.count);
  const maxCount = realCounts.length > 0 ? Math.max(...realCounts) : null;

  // Walk the funnel and track the last known real count for drop-off.
  let prevRealCount: number | null = null;

  return funnel.map((stage) => {
    if (stage.kind === "analytics") {
      return { widthPct: null, dropOffPct: null };
    }

    const count = stage.unknown ? null : stage.count;

    // Width
    const widthPct =
      maxCount === null || count === null || maxCount === 0
        ? count === null
          ? null
          : 0
        : Math.max(4, Math.round((count / maxCount) * 100)); // min 4% so bar is visible

    // Drop-off from previous real stage
    let dropOffPct: number | null = null;
    if (count !== null && prevRealCount !== null && prevRealCount > 0) {
      dropOffPct = Math.round(((prevRealCount - count) / prevRealCount) * 100);
    }

    if (count !== null) prevRealCount = count;

    return { widthPct, dropOffPct };
  });
}

function FunnelSection({ state }: { readonly state: CustomerProofState }): JSX.Element {
  const bars = computeFunnelBars(state.funnel);

  // Compute view→paid conversion for the RingGauge. We only show a real gauge
  // when both ends are instrumented AND real. Analytics stages are not yet
  // instrumented, so the gauge renders an honest "awaiting data" state.

  // "Paid" is instrumented analytics — not yet available.
  const conversionKnown = false; // flip to true when checkout_completed is instrumented

  return (
    <section className="overflow-hidden rounded-lg border border-white/[0.06] bg-obsidian/60">
      <div className="border-b border-white/[0.06] px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-white">Conversion funnel</h2>
            <p className="mt-1 text-xs text-ink-500">
              Page-view and checkout stages require an analytics provider
              (not yet instrumented — shown explicitly). DB-backed stages show
              real counts. Bar widths are relative to the largest real count.
            </p>
          </div>

          {/* RingGauge — only when both ends are real */}
          {conversionKnown ? (
            <RingGauge value={0} display="0%" caption="view → paid" />
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div
                className="flex items-center justify-center rounded-full border border-white/[0.06] bg-obsidian/60"
                style={{ width: 96, height: 96 }}
              >
                <span className="text-[11px] text-ink-500 text-center leading-tight px-2">
                  awaiting<br />data
                </span>
              </div>
              <p className="text-center font-mono text-[10px] uppercase tracking-[0.2em] text-ink-500">
                view → paid
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="divide-y divide-white/[0.04]">
        {state.funnel.map((stage, idx) => (
          <FunnelStageRow
            key={idx}
            stage={stage}
            stepNumber={idx + 1}
            bar={bars[idx] ?? { widthPct: null, dropOffPct: null }}
          />
        ))}
      </div>
    </section>
  );
}

function FunnelStageRow({
  stage,
  stepNumber,
  bar,
}: {
  readonly stage: FunnelStage;
  readonly stepNumber: number;
  readonly bar: { widthPct: number | null; dropOffPct: number | null };
}): JSX.Element {
  if (stage.kind === "analytics") {
    return (
      <div className="px-4 py-3">
        {/* Drop-off connector */}
        <div className="flex items-center gap-3">
          <span className="w-6 shrink-0 font-mono text-xs text-ink-600">
            {stepNumber}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-white">{stage.label}</p>
              <span className="rounded-md border border-amber-700/40 bg-amber-950/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
                not instrumented
              </span>
            </div>
            {/* Dashed bar placeholder */}
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/[0.03]">
              <div
                className="h-full rounded-full border border-dashed border-amber-700/30 bg-transparent"
                style={{ width: "100%" }}
              />
            </div>
            <p className="mt-1.5 text-[11px] text-ink-600">
              Connect an analytics provider to measure this stage.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // DB-backed stage
  const count = stage.unknown ? null : stage.count;
  const displayCount =
    count === null
      ? "unknown"
      : count.toLocaleString("en-US");
  const widthPct = bar.widthPct ?? 0;

  return (
    <div className="px-4 py-3">
      {/* Drop-off badge from previous stage */}
      {bar.dropOffPct !== null && (
        <div className="mb-2 ml-9 flex items-center gap-1.5">
          <span className="h-px w-4 bg-white/[0.08]" aria-hidden="true" />
          <span
            className={`text-[10px] font-semibold ${
              bar.dropOffPct > 50
                ? "text-red-400/80"
                : bar.dropOffPct > 20
                ? "text-amber-400/80"
                : "text-ink-500"
            }`}
          >
            ↓ {bar.dropOffPct}% drop-off
          </span>
        </div>
      )}

      <div className="flex items-start gap-3">
        <span className="mt-0.5 w-6 shrink-0 font-mono text-xs text-ink-600">
          {stepNumber}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-semibold text-white">{stage.label}</p>
            <p
              className={`shrink-0 font-mono text-xl font-bold tabular-nums ${
                count === null ? "text-ink-500" : "text-white"
              }`}
            >
              {displayCount}
            </p>
          </div>

          {/* Horizontal bar */}
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
            {count === null ? (
              <div className="h-full w-full rounded-full bg-white/[0.04]" />
            ) : (
              <div
                className="h-full rounded-full bg-sky-500/70 transition-all"
                style={{ width: `${widthPct}%` }}
              />
            )}
          </div>

          <div className="mt-1 flex items-center justify-between">
            <p className="text-[11px] text-ink-600">source: database</p>
            {count === null && (
              <p className="text-[10px] text-amber-400/80">DB read failed — unknown</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Ask Galaxy classification breakdown ───────────────────────────────────────

const CLASSIFICATION_LABELS: Record<
  keyof ClassificationBreakdown,
  { label: string; description: string; color: string }
> = {
  PENDING: {
    label: "Pending",
    description: "Awaiting SCOUT manual review.",
    color: "bg-ink-500",
  },
  ACTION: {
    label: "Action signal",
    description: "SCOUT identified a meaningful signal worth acting on.",
    color: "bg-sky-400",
  },
  CAUTION: {
    label: "Caution signal",
    description: "Something to watch — meaningful risk or uncertainty present.",
    color: "bg-amber-400",
  },
  NO_BET: {
    label: "No-Bet",
    description: "SCOUT's honest read: no good edge here. No-Bet is a product value.",
    color: "bg-violet-400",
  },
  INSUFFICIENT_DATA: {
    label: "Insufficient data",
    description: "Not enough signal to classify confidently.",
    color: "bg-white/30",
  },
};

function ClassificationSection({
  state,
}: {
  readonly state: CustomerProofState;
}): JSX.Element {
  const total = state.askGalaxyTotal;
  const cls = state.classification;

  return (
    <section className="overflow-hidden rounded-lg border border-white/[0.06] bg-obsidian/60">
      <div className="border-b border-white/[0.06] px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-white">
              Ask Galaxy — submission breakdown
            </h2>
            <p className="mt-1 text-xs text-ink-500">
              Classification is manual — every submission reviewed individually.
              Never auto-classified; never produces automated betting advice.
            </p>
          </div>
          <div className="text-right">
            <p
              className={`font-mono text-2xl font-bold tabular-nums ${
                total === null ? "text-ink-500" : "text-white"
              }`}
            >
              {total === null ? "—" : total.toLocaleString("en-US")}
            </p>
            <p className="text-[11px] text-ink-600">
              {total === null
                ? "unknown — DB unavailable"
                : total === 0
                ? "confirmed zero submissions"
                : "total submissions"}
            </p>
          </div>
        </div>
      </div>

      {cls === null ? (
        <div className="px-4 py-6 text-center">
          <p className="text-sm text-ink-500">
            Classification breakdown unavailable — DB read failed.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-white/[0.04]">
          {(
            Object.entries(CLASSIFICATION_LABELS) as [
              keyof ClassificationBreakdown,
              (typeof CLASSIFICATION_LABELS)[keyof ClassificationBreakdown],
            ][]
          ).map(([key, meta]) => {
            const count = cls[key];
            const pct =
              count !== null && total !== null && total > 0
                ? Math.round((count / total) * 100)
                : null;

            return (
              <div
                key={key}
                className="flex flex-wrap items-center gap-4 px-4 py-3 hover:bg-white/[0.02]"
              >
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${meta.color}`}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white">
                    {meta.label}
                  </p>
                  <p className="mt-0.5 text-[11px] text-ink-500">
                    {meta.description}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p
                    className={`font-mono text-lg font-bold tabular-nums ${
                      count === null ? "text-ink-500" : "text-white"
                    }`}
                  >
                    {count === null
                      ? "unknown"
                      : count.toLocaleString("en-US")}
                  </p>
                  {pct !== null && (
                    <p className="text-[10px] text-ink-600">{pct}% of total</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

// ── Committed reports ─────────────────────────────────────────────────────────

function ReportsSection(): JSX.Element {
  return (
    <section className="overflow-hidden rounded-lg border border-white/[0.06] bg-obsidian/60">
      <div className="border-b border-white/[0.06] px-4 py-3">
        <h2 className="text-sm font-semibold text-white">Committed reports</h2>
        <p className="mt-1 text-xs text-ink-500">
          These reports are committed to the repo. Open them directly — they are
          not re-rendered here to avoid stale paraphrasing.
        </p>
      </div>
      <div className="divide-y divide-white/[0.04]">
        <ReportLink
          href="/reports/customer-proof/objection-ledger.md"
          title="Objection Ledger"
          description="Every known objection to the Founding Desk offer, with honest responses. Updated as real objections surface."
        />
        <ReportLink
          href="/reports/customer-proof/14-day-market-proof.md"
          title="14-Day Market Proof Report"
          description="The first 14-day proof-of-concept market analysis. Real methodology, honest conclusions, no fabricated wins."
        />
      </div>
    </section>
  );
}

function ReportLink({
  href,
  title,
  description,
}: {
  readonly href: string;
  readonly title: string;
  readonly description: string;
}): JSX.Element {
  return (
    <a
      href={href}
      className="flex flex-wrap items-start gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors"
      target="_blank"
      rel="noopener noreferrer"
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-white group-hover:text-sky-200">
          {title}
        </p>
        <p className="mt-0.5 text-xs text-ink-500">{description}</p>
      </div>
      <span className="shrink-0 rounded-md border border-sky-500/30 bg-sky-950/30 px-2 py-0.5 text-[10px] font-semibold text-sky-300">
        open ↗
      </span>
    </a>
  );
}

// ── Shared primitives ─────────────────────────────────────────────────────────

function DataModeBadge({
  mode,
}: {
  readonly mode: "live" | "partial" | "unavailable";
}): JSX.Element {
  if (mode === "live") {
    return (
      <span className="rounded-md border border-emerald-500/30 bg-emerald-950/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-200">
        live
      </span>
    );
  }
  if (mode === "partial") {
    return (
      <span className="rounded-md border border-amber-700/40 bg-amber-950/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
        partial
      </span>
    );
  }
  return (
    <span className="rounded-md border border-amber-700/40 bg-amber-950/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
      unavailable
    </span>
  );
}
