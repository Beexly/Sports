/**
 * AgentFleet — the governed agent roster as living cards.
 *
 * Projects AGENT_OS_REGISTRY (the 23-seat fleet) into hover-lifting cards with a
 * status dot. The dot is honest: a "wired" draft-only role gets a soft pulse so
 * the fleet reads as alive, but the label always tells the truth — agents are
 * roles, not running processes, and none take external action. No fabricated
 * "running"/"busy" states: status comes straight from the registry.
 *
 * Server-safe — pure CSS motion (animate-live-pulse + gw-card-hover), no client
 * JS. Reduced-motion is handled by the global rules on those classes.
 */

import { AGENT_OS_REGISTRY } from "@/lib/agents/agent-registry";
import type { AgentStatus } from "@/lib/agents/agent-status";

const STATUS_META: Record<
  string,
  { dot: string; chip: string; label: string; pulse: boolean }
> = {
  REAL: { dot: "bg-emerald-400", chip: "text-emerald-300", label: "wired", pulse: true },
  PARTIAL: { dot: "bg-emerald-400", chip: "text-emerald-300", label: "partial", pulse: true },
  DRAFT_ONLY: { dot: "bg-sky-400", chip: "text-sky-300", label: "draft-only", pulse: true },
  MANUAL: { dot: "bg-amber-400", chip: "text-amber-300", label: "manual", pulse: false },
  NOT_WIRED: { dot: "bg-ink-600", chip: "text-ink-500", label: "not wired", pulse: false },
};

function metaFor(status: AgentStatus) {
  return STATUS_META[status] ?? { dot: "bg-ink-600", chip: "text-ink-500", label: status.toLowerCase(), pulse: false };
}

export function AgentFleet() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {AGENT_OS_REGISTRY.map((agent) => {
        const meta = metaFor(agent.status);
        return (
          <div
            key={agent.id}
            className="surface-card gw-card-hover flex flex-col gap-2 px-4 py-3"
          >
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2" aria-hidden>
                {meta.pulse && (
                  <span className={`absolute inline-flex h-full w-full rounded-full opacity-60 ${meta.dot} animate-live-pulse`} />
                )}
                <span className={`relative inline-flex h-2 w-2 rounded-full ${meta.dot}`} />
              </span>
              <span className="text-sm font-semibold text-white">{agent.displayName}</span>
              <span className={`ml-auto font-mono text-[9px] uppercase tracking-widest ${meta.chip}`}>
                {meta.label}
              </span>
            </div>
            <p className="text-[11px] leading-snug text-ink-400">{agent.role}</p>
            <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 font-mono text-[9px] uppercase tracking-widest text-ink-600">
              <span>{agent.department}</span>
              <span className="text-ink-500">authority: {agent.authorityLevel}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
