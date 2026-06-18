"use client";

/**
 * AgentTheater — the live "watch the agents work" stream.
 *
 * Renders the Agent-Activity + Approval-Queue lanes from loadDailyCommand() as a
 * cinematic, motion-animated feed: each row reveals in sequence (Stagger), the
 * newest/owner-attention rows carry a soft live pulse, and every row honestly
 * states agent · action · risk · status. Nothing is fabricated — the rows are the
 * real CommandCards. When both lanes are empty (or unavailable) it shows the
 * honest "quiet — no activity in the window" empty state instead of inventing
 * motion.
 *
 * Client component purely for the entrance motion; the data is passed down from
 * the server page (the loaders ran server-side). prefers-reduced-motion is
 * honored by the Reveal/Stagger primitives.
 */

import { Reveal } from "@/components/motion/reveal";
import type { CommandCard, CommandLane, CardRisk } from "@/lib/cockpit/daily-command/types";

const RISK_STYLES: Record<CardRisk, { dot: string; chip: string; label: string }> = {
  CRITICAL: { dot: "bg-rose-400", chip: "border-rose-500/40 bg-rose-950/40 text-rose-200", label: "critical" },
  HIGH: { dot: "bg-amber-400", chip: "border-amber-600/40 bg-amber-950/40 text-amber-200", label: "high" },
  MEDIUM: { dot: "bg-sky-400", chip: "border-sky-500/30 bg-sky-950/40 text-sky-200", label: "medium" },
  LOW: { dot: "bg-emerald-400", chip: "border-emerald-500/30 bg-emerald-950/40 text-emerald-200", label: "low" },
  NONE: { dot: "bg-ink-500", chip: "border-white/[0.08] bg-white/[0.04] text-ink-400", label: "—" },
};

interface StreamRow {
  readonly card: CommandCard;
  readonly laneTitle: string;
  readonly transitionable: boolean;
}

function flatten(lanes: readonly CommandLane[]): StreamRow[] {
  const rows: StreamRow[] = [];
  for (const lane of lanes) {
    for (const card of lane.cards) {
      rows.push({ card, laneTitle: lane.title, transitionable: card.taskId !== null });
    }
  }
  return rows;
}

function ActivityRow({ row, pulse }: { readonly row: StreamRow; readonly pulse: boolean }) {
  const risk = RISK_STYLES[row.card.risk];
  return (
    <li className="surface-card gw-card-hover relative flex flex-col gap-2 px-4 py-3">
      {pulse && (
        <span
          aria-hidden
          className="absolute left-0 top-0 h-full w-0.5 animate-live-pulse rounded-l bg-amber-400/70"
        />
      )}
      <div className="flex flex-wrap items-center gap-2">
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${risk.dot}`} aria-hidden />
        <span className="font-mono text-[10px] uppercase tracking-widest text-accent-300">
          {row.card.agentOwner}
        </span>
        <span className="text-[9px] uppercase tracking-widest text-ink-600">{row.laneTitle}</span>
        <span className="ml-auto flex items-center gap-1.5">
          {row.transitionable ? (
            <span className="rounded-full border border-amber-600/40 bg-amber-950/40 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-amber-200">
              awaiting decision
            </span>
          ) : (
            <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-ink-500">
              read-only
            </span>
          )}
          <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest ${risk.chip}`}>
            {risk.label}
          </span>
        </span>
      </div>
      <p className="text-sm font-semibold leading-snug text-white">{row.card.title}</p>
      {row.card.whyItMatters && (
        <p className="text-[11px] leading-relaxed text-ink-400">{row.card.whyItMatters}</p>
      )}
      {row.card.evidence.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {row.card.evidence.slice(0, 4).map((e, i) => (
            <span key={i} className="font-mono text-[10px] text-ink-500">
              <span className="text-ink-600">{e.label}:</span> <span className="text-ink-300">{e.value}</span>
            </span>
          ))}
        </div>
      )}
    </li>
  );
}

export function AgentTheater({ lanes }: { readonly lanes: readonly CommandLane[] }) {
  const rows = flatten(lanes);
  // Owner-attention rows (real transitionable tasks, or critical/high risk) pulse.
  const isHot = (r: StreamRow) =>
    r.transitionable || r.card.risk === "CRITICAL" || r.card.risk === "HIGH";

  if (rows.length === 0) {
    return (
      <div className="surface-card flex flex-col items-center gap-2 px-6 py-12 text-center">
        <span className="text-2xl" aria-hidden>
          🌙
        </span>
        <p className="text-sm font-semibold text-ink-300">Quiet — no activity in the window.</p>
        <p className="max-w-md text-[11px] leading-relaxed text-ink-500">
          No agent drafts and no exceptions are awaiting a decision right now. Agents are roles in a
          governed registry, not always-on processes — an empty stream is honest, not a stall.
        </p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-2.5">
      {rows.map((row, i) => (
        <Reveal key={row.card.id} delay={Math.min(i * 70, 700)} direction="left" distance={20}>
          <ActivityRow row={row} pulse={isHot(row)} />
        </Reveal>
      ))}
    </ul>
  );
}
