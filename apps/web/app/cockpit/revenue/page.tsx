/**
 * Cockpit · Revenue — the nervous system (Workstream M1).
 *
 * Admin-only by virtue of the cockpit layout ADMIN gate.  INTERNAL and
 * decision-support only — never exposed publicly and never changes pricing,
 * subscriptions, or any live system state.
 *
 * HONESTY RULES (non-negotiable, mirror the Reality Engine):
 * - Every figure is real Stripe data or explicitly "—" / "unknown".
 * - paidSubscribers / MRR / ARR are null when Stripe is unconfigured; we
 *   render "—" with a note, never 0 dressed as a metric.
 * - Lane status is the honest current state from the committed doctrine.
 * - Nothing here is wired into scoring, picks, or any public surface.
 */
export const dynamic = "force-dynamic";

import Link from "next/link";
import {
  loadRevenueState,
  type RevenueState,
  type RevenueLane,
  type LaneStatus,
  type ActivationItem,
} from "@/lib/revenue/revenue-loader";

export default async function CockpitRevenuePage(): Promise<JSX.Element> {
  const state = await loadRevenueState();
  const { dataMode, loadedAtIso, note, lanes, activation } = state;
  const live = dataMode === "live";

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
              Revenue — the nervous system
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
          Decision-support for the owner: what each revenue lane&rsquo;s status is, what the
          next action is, and what is blocked on an owner credential.{" "}
          <span className="text-ink-200">
            This surface changes nothing and charges nothing.
          </span>{" "}
          All figures are real Stripe data or explicitly unknown — nothing is fabricated.
        </p>
        <p className="text-[11px] text-ink-600">
          Data mode: <DataModeBadge live={live} /> · loaded{" "}
          {new Date(loadedAtIso).toLocaleString("en-US")}
        </p>
      </header>

      {/* ── Headline MRR/ARR/Subs ──────────────────────────────────────────── */}
      <HeadlineMetrics state={state} />

      {/* ── Stripe note / data-mode explanation ────────────────────────────── */}
      <NotePanel note={note} live={live} />

      {/* ── Revenue lanes table ────────────────────────────────────────────── */}
      <LanesSection lanes={lanes} />

      {/* ── Owner activation checklist ─────────────────────────────────────── */}
      <ActivationSection activation={activation} />

      {/* ── Honest caveat footer ───────────────────────────────────────────── */}
      <p className="text-[11px] text-ink-600">
        Internal operator surface — admin-gated, display-only. Subscriber counts and MRR are
        read live from Stripe or shown as &ldquo;unknown&rdquo; when Stripe is unconfigured or
        unreachable. Nothing here is fabricated, rounded up, or presented as confidence.
        &ldquo;unknown&rdquo; means the value was not available, never silently treated as zero.
      </p>
    </div>
  );
}

// ── Headline metrics ─────────────────────────────────────────────────────────

function HeadlineMetrics({ state }: { readonly state: RevenueState }): JSX.Element {
  const { subscriptions } = state;

  const subsDisplay =
    subscriptions.paidSubscribers === null
      ? "—"
      : subscriptions.paidSubscribers.toLocaleString("en-US");

  const mrrDisplay =
    subscriptions.mrr === null
      ? "—"
      : formatUsd(subscriptions.mrr);

  const arrDisplay =
    subscriptions.arr === null
      ? "—"
      : formatUsd(subscriptions.arr);

  const subsNote =
    subscriptions.paidSubscribers === null
      ? "Stripe not configured"
      : subscriptions.paidSubscribers === 0
      ? "confirmed zero"
      : "active subscriptions";

  const mrrNote =
    subscriptions.mrr === null
      ? "attach STRIPE_SECRET_KEY to measure"
      : "from real Stripe plan amounts";

  return (
    <section className="grid gap-3 sm:grid-cols-3">
      <RevenueMetric
        label="Paid subscribers"
        value={subsDisplay}
        sub={subsNote}
        unknown={subscriptions.paidSubscribers === null}
      />
      <RevenueMetric
        label="MRR"
        value={mrrDisplay}
        sub={mrrNote}
        unknown={subscriptions.mrr === null}
      />
      <RevenueMetric
        label="ARR run-rate"
        value={arrDisplay}
        sub="MRR × 12 — not a forecast"
        unknown={subscriptions.arr === null}
      />
    </section>
  );
}

function RevenueMetric({
  label,
  value,
  sub,
  unknown,
}: {
  readonly label: string;
  readonly value: string;
  readonly sub: string;
  readonly unknown: boolean;
}): JSX.Element {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-obsidian/60 px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-500">{label}</p>
      <p className={`mt-1 text-lg font-bold ${unknown ? "text-ink-400" : "text-white"}`}>
        {value}
      </p>
      <p className="mt-0.5 text-[11px] text-ink-600">{sub}</p>
    </div>
  );
}

// ── Note panel ───────────────────────────────────────────────────────────────

function NotePanel({
  note,
  live,
}: {
  readonly note: string;
  readonly live: boolean;
}): JSX.Element {
  const border = live ? "border-emerald-700/40" : "border-amber-700/40";
  const bg = live ? "bg-emerald-950/20" : "bg-amber-950/20";
  const textColor = live ? "text-emerald-100/90" : "text-amber-100/90";
  const badgeBorder = live
    ? "border-emerald-500/40 bg-emerald-900/40 text-emerald-200"
    : "border-amber-700/60 bg-amber-900/40 text-amber-300";
  const badgeLabel = live ? "Stripe connected" : "Stripe not connected";

  return (
    <section className={`rounded-lg border ${border} ${bg} p-4`}>
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${badgeBorder}`}
        >
          {badgeLabel}
        </span>
      </div>
      <p className={`mt-2 text-xs leading-relaxed ${textColor}`}>{note}</p>
    </section>
  );
}

// ── Revenue lanes ─────────────────────────────────────────────────────────────

function LanesSection({ lanes }: { readonly lanes: readonly RevenueLane[] }): JSX.Element {
  return (
    <section className="overflow-hidden rounded-lg border border-white/[0.06] bg-obsidian/60">
      <div className="border-b border-white/[0.06] px-4 py-3">
        <h2 className="text-sm font-semibold text-white">Revenue lanes</h2>
        <p className="mt-1 text-xs text-ink-500">
          13 lanes from the doctrine. Status is honest today: nearly all are not_started or
          scaffolding. This is decision-support, not a scoreboard — the &ldquo;blocked on&rdquo;
          column names exactly what the owner must flip to go live.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-white/[0.04] text-sm">
          <thead className="text-left text-[11px] uppercase tracking-wider text-ink-500">
            <tr>
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Lane</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Owner agent</th>
              <th className="px-4 py-3 min-w-[220px]">Next action</th>
              <th className="px-4 py-3 min-w-[200px]">Blocked on</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {lanes.map((lane) => (
              <LaneRow key={lane.priority} lane={lane} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function LaneRow({ lane }: { readonly lane: RevenueLane }): JSX.Element {
  return (
    <tr className="text-ink-300 hover:bg-white/[0.02]">
      <td className="px-4 py-3 font-mono text-xs text-ink-500">{lane.priority}</td>
      <td className="whitespace-nowrap px-4 py-3 font-semibold text-white">{lane.name}</td>
      <td className="whitespace-nowrap px-4 py-3">
        <LaneStatusBadge status={lane.status} />
      </td>
      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-ink-400">
        {lane.ownerAgent}
      </td>
      <td className="px-4 py-3 text-xs leading-relaxed text-ink-400">{lane.nextAction}</td>
      <td className="px-4 py-3 text-xs leading-relaxed">
        {lane.blockedOn === null ? (
          <span className="text-ink-600">—</span>
        ) : (
          <span className="text-amber-200/80">{lane.blockedOn}</span>
        )}
      </td>
    </tr>
  );
}

function LaneStatusBadge({ status }: { readonly status: LaneStatus }): JSX.Element {
  const styles: Record<LaneStatus, string> = {
    not_started:
      "border-white/[0.06] bg-white/[0.04] text-ink-500",
    scaffolding:
      "border-amber-700/40 bg-amber-950/30 text-amber-300",
    in_progress:
      "border-sky-500/30 bg-sky-950/40 text-sky-200",
    active:
      "border-emerald-500/30 bg-emerald-950/40 text-emerald-200",
    paused:
      "border-violet-500/30 bg-violet-950/30 text-violet-300",
  };

  const labels: Record<LaneStatus, string> = {
    not_started: "not started",
    scaffolding: "scaffolding",
    in_progress: "in progress",
    active: "active",
    paused: "paused",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

// ── Owner activation checklist ────────────────────────────────────────────────

function ActivationSection({
  activation,
}: {
  readonly activation: readonly ActivationItem[];
}): JSX.Element {
  const allPresent = activation.every((a) => a.present);
  const presentCount = activation.filter((a) => a.present).length;

  return (
    <section className="overflow-hidden rounded-lg border border-white/[0.06] bg-obsidian/60">
      <div className="border-b border-white/[0.06] px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-white">Owner activation checklist</h2>
            <p className="mt-1 text-xs text-ink-500">
              These credentials require the owner&rsquo;s own accounts and cannot be done in-repo.
              Each public surface degrades to an honest inert state until its switch is flipped.
              This is the finish line, not a backlog.
            </p>
          </div>
          <div className="text-right">
            <p className="font-mono text-lg font-bold text-white">
              {presentCount} / {activation.length}
            </p>
            <p className="text-[11px] text-ink-600">
              {allPresent ? "fully configured" : "credentials configured"}
            </p>
          </div>
        </div>
      </div>

      <div className="divide-y divide-white/[0.04]">
        {activation.map((item) => (
          <ActivationRow key={item.key} item={item} />
        ))}
      </div>
    </section>
  );
}

function ActivationRow({ item }: { readonly item: ActivationItem }): JSX.Element {
  return (
    <div className="flex flex-wrap items-start gap-3 px-4 py-3 hover:bg-white/[0.02]">
      <div className="mt-0.5 shrink-0">
        {item.present ? (
          <span
            className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-900/60 text-[11px] text-emerald-300"
            aria-label="configured"
          >
            ✓
          </span>
        ) : (
          <span
            className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-900/40 text-[11px] text-amber-300"
            aria-label="not configured"
          >
            ·
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-mono text-xs font-semibold text-white">{item.key}</p>
        <p className="mt-1 text-xs leading-relaxed text-ink-400">{item.why}</p>
      </div>
      <div className="shrink-0">
        <span
          className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
            item.present
              ? "border-emerald-500/30 bg-emerald-950/40 text-emerald-200"
              : "border-amber-700/40 bg-amber-950/30 text-amber-300"
          }`}
        >
          {item.present ? "set" : "not set"}
        </span>
      </div>
    </div>
  );
}

// ── Shared primitives ─────────────────────────────────────────────────────────

function DataModeBadge({ live }: { readonly live: boolean }): JSX.Element {
  return live ? (
    <span className="rounded-md border border-emerald-500/30 bg-emerald-950/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-200">
      live
    </span>
  ) : (
    <span className="rounded-md border border-amber-700/40 bg-amber-950/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
      unavailable
    </span>
  );
}

function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}
