/**
 * Cockpit · Go-Live — the finish-line dashboard (capstone surface).
 *
 * Admin-only by virtue of the cockpit layout ADMIN gate. INTERNAL and
 * display-only — never exposed publicly, never changes any system state.
 *
 * HONESTY RULES (non-negotiable):
 * - Every check reports env PRESENCE (never values) or a live DB probe result.
 * - "ready" = confirmed passing. "action_needed" = owner must act.
 * - "unknown" = could not determine (DB unreachable, etc.).
 * - Nothing here is fabricated. No check is pre-marked ready.
 * - The framing is honest: "These are the switches only you can flip."
 */
export const dynamic = "force-dynamic";

import Link from "next/link";
import {
  loadGoLiveReadiness,
  type ReadinessCheck,
  type ReadinessGroup,
  type CheckStatus,
} from "@/lib/go-live/readiness";
import { summarizeAutonomy } from "@/lib/autonomy/autonomy-map";
import { evaluateSpendGovernor } from "@/lib/spend/spend-governor";

export default async function CockpitGoLivePage(): Promise<JSX.Element> {
  const readiness = await loadGoLiveReadiness();
  const { readyCount, totalCount, blocking, loadedAtIso } = readiness;
  const allReady = blocking.length === 0;
  const pct = totalCount > 0 ? Math.round((readyCount / totalCount) * 100) : 0;

  // Operating posture — pure, no extra DB: how self-driving + how cheap this runs.
  const autonomy = summarizeAutonomy();
  const spend = evaluateSpendGovernor();
  const autonomyPct = Math.round(autonomy.recurringAutonomyShare * 100);

  return (
    <div className="flex flex-col gap-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-yellow-300">
              Command · Go-Live
            </p>
            <h1 className="mt-1 text-2xl font-bold text-white">
              Go-Live checklist
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
          One honest finish-line view. These are the switches only you can flip —
          everything in code is built and green.{" "}
          <span className="text-ink-200">
            Reports env presence only (never values). Nothing here changes any system state.
          </span>
        </p>
        <p className="text-[11px] text-ink-600">
          Loaded {new Date(loadedAtIso).toLocaleString("en-US")}
        </p>
      </header>

      {/* ── Readiness header + progress bar ──────────────────────────────── */}
      <ReadinessHeader
        readyCount={readyCount}
        totalCount={totalCount}
        pct={pct}
        allReady={allReady}
        blockingCount={blocking.length}
      />

      {/* ── Operating posture — what runs itself + how cheap ──────────────── */}
      <PostureStrip
        autonomyPct={autonomyPct}
        zeroSpend={spend.zeroSpend}
        spendingCount={spend.spendingServices.length}
        selfDriving={autonomy.autonomous + autonomy.autonomousWithinBudget}
        ownerLevers={autonomy.ownerParked}
      />

      {/* ── Groups ────────────────────────────────────────────────────────── */}
      {readiness.groups.map((group) => (
        <GroupSection key={group.name} group={group} />
      ))}

      {/* ── Honest caveat footer ───────────────────────────────────────────── */}
      <p className="text-[11px] text-ink-600">
        Internal operator surface — admin-gated, display-only. Checks report env-var
        presence and a live DB reachability probe. Nothing is fabricated; nothing is
        pre-marked ready. &ldquo;unknown&rdquo; means the check could not be determined,
        not that it passed.
      </p>
    </div>
  );
}

// ── Operating posture strip ───────────────────────────────────────────────────

function PostureStrip({
  autonomyPct,
  zeroSpend,
  spendingCount,
  selfDriving,
  ownerLevers,
}: {
  autonomyPct: number;
  zeroSpend: boolean;
  spendingCount: number;
  selfDriving: number;
  ownerLevers: number;
}): JSX.Element {
  return (
    <section className="rounded-lg border border-white/[0.06] bg-obsidian/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-white">Operating posture</h2>
          <p className="mt-0.5 text-xs text-ink-500">
            Once the switches below are flipped, this is how the system runs.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/cockpit/autonomy"
            className="rounded-md border border-white/[0.06] px-2.5 py-1 text-[11px] text-ink-300 hover:bg-white/[0.03]"
          >
            Autonomy map →
          </Link>
          <Link
            href="/cockpit/spend"
            className="rounded-md border border-white/[0.06] px-2.5 py-1 text-[11px] text-ink-300 hover:bg-white/[0.03]"
          >
            Spend governor →
          </Link>
        </div>
      </div>
      <dl className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <PostureStat label="Recurring ops self-driving" value={`${autonomyPct}%`} good />
        <PostureStat
          label="Spend posture"
          value={zeroSpend ? "$0 / mo" : `${spendingCount} paid`}
          good={zeroSpend}
        />
        <PostureStat label="Self-driving loops" value={String(selfDriving)} good />
        <PostureStat label="Owner levers" value={String(ownerLevers)} />
      </dl>
    </section>
  );
}

function PostureStat({
  label,
  value,
  good,
}: {
  label: string;
  value: string;
  good?: boolean;
}): JSX.Element {
  return (
    <div className="rounded-md border border-white/[0.06] bg-white/[0.02] px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-500">{label}</p>
      <p className={`mt-0.5 text-base font-bold ${good ? "text-emerald-200" : "text-white"}`}>
        {value}
      </p>
    </div>
  );
}

// ── Readiness header ─────────────────────────────────────────────────────────

function ReadinessHeader({
  readyCount,
  totalCount,
  pct,
  allReady,
  blockingCount,
}: {
  readonly readyCount: number;
  readonly totalCount: number;
  readonly pct: number;
  readonly allReady: boolean;
  readonly blockingCount: number;
}): JSX.Element {
  const barColor = allReady
    ? "bg-emerald-500"
    : pct >= 60
    ? "bg-sky-500"
    : "bg-amber-500";

  const borderColor = allReady
    ? "border-emerald-700/40"
    : "border-white/[0.06]";
  const bgColor = allReady ? "bg-emerald-950/20" : "bg-obsidian/60";

  return (
    <section
      className={`rounded-lg border ${borderColor} ${bgColor} px-5 py-4`}
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-500">
            Overall readiness
          </p>
          <p className="mt-1 text-3xl font-bold text-white">
            {readyCount}{" "}
            <span className="text-lg font-normal text-ink-400">
              / {totalCount} ready
            </span>
          </p>
          {allReady ? (
            <p className="mt-1 text-xs text-emerald-300">
              All checks passed — ready to ship.
            </p>
          ) : (
            <p className="mt-1 text-xs text-amber-300">
              {blockingCount} action{blockingCount !== 1 ? "s" : ""} needed —
              see highlighted rows below.
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="font-mono text-2xl font-bold text-white">{pct}%</p>
          <p className="text-[11px] text-ink-600">checks passing</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </section>
  );
}

// ── Group section ────────────────────────────────────────────────────────────

function GroupSection({
  group,
}: {
  readonly group: ReadinessGroup;
}): JSX.Element {
  const groupReady = group.checks.filter((c) => c.status === "ready").length;
  const allGroupReady = groupReady === group.checks.length;

  return (
    <section className="overflow-hidden rounded-lg border border-white/[0.06] bg-obsidian/60">
      <div className="border-b border-white/[0.06] px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-white">{group.name}</h2>
          <span
            className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
              allGroupReady
                ? "border-emerald-500/30 bg-emerald-950/40 text-emerald-200"
                : "border-amber-700/40 bg-amber-950/30 text-amber-300"
            }`}
          >
            {groupReady} / {group.checks.length}
          </span>
        </div>
      </div>
      <div className="divide-y divide-white/[0.04]">
        {group.checks.map((check) => (
          <CheckRow key={check.id} check={check} />
        ))}
      </div>
    </section>
  );
}

// ── Check row ────────────────────────────────────────────────────────────────

function CheckRow({ check }: { readonly check: ReadinessCheck }): JSX.Element {
  return (
    <div
      className={`flex flex-wrap items-start gap-3 px-4 py-3 hover:bg-white/[0.02] ${
        check.status === "action_needed" ? "bg-amber-950/10" : ""
      }`}
    >
      {/* Status icon */}
      <div className="mt-0.5 shrink-0">
        <StatusIcon status={check.status} />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-white">{check.label}</p>
          <StatusBadge status={check.status} />
        </div>
        <p className="mt-1 text-xs leading-relaxed text-ink-400">
          {check.detail}
        </p>
        {check.ownerAction !== null && (
          <div className="mt-2 rounded-md border border-amber-700/30 bg-amber-950/20 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-400">
              Owner action
            </p>
            <p className="mt-1 text-xs leading-relaxed text-amber-200/90">
              {check.ownerAction}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Status icon ──────────────────────────────────────────────────────────────

function StatusIcon({ status }: { readonly status: CheckStatus }): JSX.Element {
  if (status === "ready") {
    return (
      <span
        className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-900/60 text-[11px] font-bold text-emerald-300"
        aria-label="ready"
      >
        ✓
      </span>
    );
  }
  if (status === "action_needed") {
    return (
      <span
        className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-900/40 text-[11px] font-bold text-amber-300"
        aria-label="action needed"
      >
        ●
      </span>
    );
  }
  // unknown
  return (
    <span
      className="flex h-5 w-5 items-center justify-center rounded-full bg-white/[0.06] text-[11px] font-bold text-ink-500"
      aria-label="unknown"
    >
      ?
    </span>
  );
}

// ── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { readonly status: CheckStatus }): JSX.Element {
  const styles: Record<CheckStatus, string> = {
    ready: "border-emerald-500/30 bg-emerald-950/40 text-emerald-200",
    action_needed: "border-amber-700/40 bg-amber-950/30 text-amber-300",
    unknown: "border-white/[0.06] bg-white/[0.04] text-ink-500",
  };
  const labels: Record<CheckStatus, string> = {
    ready: "ready",
    action_needed: "action needed",
    unknown: "unknown",
  };

  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}
