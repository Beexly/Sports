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

      {/* ── Conversion funnel ──────────────────────────────────────────────── */}
      <FunnelSection state={state} />

      {/* ── Ask Galaxy classification breakdown ───────────────────────────── */}
      <ClassificationSection state={state} />

      {/* ── Committed reports ─────────────────────────────────────────────── */}
      <ReportsSection />

      {/* ── Caveat footer ─────────────────────────────────────────────────── */}
      <p className="text-[11px] text-ink-600">
        Internal operator surface — admin-gated, display-only. DB-backed counts
        are real or &ldquo;unknown&rdquo; on error. Analytics-event stages are
        &ldquo;not yet instrumented&rdquo; — wire a provider at the single
        dispatch point in{" "}
        <code className="font-mono text-ink-400">
          lib/analytics/events.ts
        </code>{" "}
        to measure them. Nothing here is fabricated.
      </p>
    </div>
  );
}

// ── Conversion funnel ─────────────────────────────────────────────────────────

function FunnelSection({ state }: { readonly state: CustomerProofState }): JSX.Element {
  return (
    <section className="overflow-hidden rounded-lg border border-white/[0.06] bg-obsidian/60">
      <div className="border-b border-white/[0.06] px-4 py-3">
        <h2 className="text-sm font-semibold text-white">Conversion funnel</h2>
        <p className="mt-1 text-xs text-ink-500">
          Founding Desk view → sample → Ask Galaxy → email → checkout → paid.
          Event-based stages require an analytics provider (not yet instrumented).
          DB-backed stages show real counts.
        </p>
      </div>
      <div className="divide-y divide-white/[0.04]">
        {state.funnel.map((stage, idx) => (
          <FunnelStageRow key={idx} stage={stage} stepNumber={idx + 1} />
        ))}
      </div>
    </section>
  );
}

function FunnelStageRow({
  stage,
  stepNumber,
}: {
  readonly stage: FunnelStage;
  readonly stepNumber: number;
}): JSX.Element {
  if (stage.kind === "analytics") {
    return (
      <div className="flex flex-wrap items-center gap-4 px-4 py-3 hover:bg-white/[0.02]">
        <span className="w-5 shrink-0 font-mono text-xs text-ink-600">
          {stepNumber}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">{stage.label}</p>
          <p className="mt-0.5 text-[11px] text-ink-500">
            event:{" "}
            <code className="font-mono text-ink-400">{stage.eventName}</code>
          </p>
        </div>
        <span className="shrink-0 rounded-md border border-amber-700/40 bg-amber-950/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
          not yet instrumented
        </span>
        <p className="w-full pl-9 text-[11px] text-ink-600">
          Wire an analytics provider at{" "}
          <code className="font-mono">lib/analytics/events.ts</code> to
          measure this stage.
        </p>
      </div>
    );
  }

  // DB-backed stage
  const displayCount =
    stage.unknown ? "unknown" : stage.count === null ? "unknown" : stage.count.toLocaleString("en-US");

  return (
    <div className="flex flex-wrap items-center gap-4 px-4 py-3 hover:bg-white/[0.02]">
      <span className="w-5 shrink-0 font-mono text-xs text-ink-600">
        {stepNumber}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-white">{stage.label}</p>
        <p className="mt-0.5 text-[11px] text-ink-500">source: database</p>
      </div>
      <div className="shrink-0 text-right">
        <p
          className={`text-lg font-bold ${stage.unknown ? "text-ink-400" : "text-white"}`}
        >
          {displayCount}
        </p>
        {stage.unknown && (
          <p className="text-[10px] text-amber-400/80">DB error — unknown</p>
        )}
      </div>
    </div>
  );
}

// ── Ask Galaxy classification breakdown ───────────────────────────────────────

const CLASSIFICATION_LABELS: Record<
  keyof ClassificationBreakdown,
  { label: string; description: string }
> = {
  PENDING: {
    label: "Pending",
    description: "Awaiting SCOUT manual review.",
  },
  ACTION: {
    label: "Action signal",
    description: "SCOUT identified a meaningful signal worth acting on.",
  },
  CAUTION: {
    label: "Caution signal",
    description: "Something to watch — meaningful risk or uncertainty present.",
  },
  NO_BET: {
    label: "No-Bet",
    description: "SCOUT's honest read: no good edge here. No-Bet is a product value.",
  },
  INSUFFICIENT_DATA: {
    label: "Insufficient data",
    description: "Not enough signal to classify confidently.",
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
              Classification is MANUAL (SCOUT reviews every submission).
              Never auto-classified; never produces automated betting advice.
            </p>
          </div>
          <div className="text-right">
            <p
              className={`font-mono text-lg font-bold ${total === null ? "text-ink-400" : "text-white"}`}
            >
              {total === null ? "unknown" : total.toLocaleString("en-US")}
            </p>
            <p className="text-[11px] text-ink-600">
              {total === null
                ? "DB unavailable"
                : total === 0
                ? "confirmed zero"
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
            return (
              <div
                key={key}
                className="flex flex-wrap items-center gap-4 px-4 py-3 hover:bg-white/[0.02]"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white">
                    {meta.label}
                  </p>
                  <p className="mt-0.5 text-[11px] text-ink-500">
                    {meta.description}
                  </p>
                </div>
                <p
                  className={`shrink-0 font-mono text-lg font-bold ${count === null ? "text-ink-400" : "text-white"}`}
                >
                  {count === null
                    ? "unknown"
                    : count.toLocaleString("en-US")}
                </p>
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
          These reports are committed to the repo. Read them directly — they are
          not re-rendered here to avoid stale paraphrasing.
        </p>
      </div>
      <div className="divide-y divide-white/[0.04]">
        <ReportLink
          href="reports/customer-proof/objection-ledger.md"
          title="Objection Ledger"
          description="Every known objection to the Founding Desk offer, with honest responses. Updated as real objections surface."
        />
        <ReportLink
          href="reports/customer-proof/14-day-market-proof.md"
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
    <div className="flex flex-wrap items-start gap-3 px-4 py-3 hover:bg-white/[0.02]">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="mt-0.5 text-xs text-ink-500">{description}</p>
        <p className="mt-1 font-mono text-[10px] text-ink-600">{href}</p>
      </div>
      <span className="shrink-0 rounded-md border border-white/[0.06] px-2 py-0.5 text-[10px] text-ink-500">
        repo file — open in editor
      </span>
    </div>
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
