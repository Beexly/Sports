import { StatusTile } from "@/components/cockpit/status-tile";

/**
 * AgentStatusRail — an honest, runnable four-tile read of agent capacity.
 *
 * Renders the real counts from `summarizeAgentHealth()` through the shared
 * StatusTile primitive. Every tone is earned, never assumed: Operational only
 * reads 'good' when there is actual real/partial capacity (else neutral — a 0
 * never renders fake-green), and 'Not wired' reads 'warn' (designed, not
 * capacity) rather than good. Each tile links to /cockpit/agents so the rail is
 * runnable.
 *
 * Pure presentation. Like CockpitPulse, it ACCEPTS the health summary as a prop
 * — it does NOT call the registry or DB itself; the caller (a server page)
 * passes already-derived data. Server-safe, no hooks. Ships standalone (no page
 * wire-in yet), exactly how StatusTile shipped inert.
 */

/** Mirrors the return shape of `summarizeAgentHealth()`. */
export interface AgentHealthSummary {
  readonly operationalCapacity: number;
  readonly draftOnly: number;
  readonly manual: number;
  readonly notWired: number;
  readonly externalActionsAllowed: number;
  readonly total: number;
}

export interface AgentStatusRailProps {
  readonly summary: AgentHealthSummary;
  /** Optional extra classes for layout composition by the parent. */
  readonly className?: string;
}

const AGENTS_HREF = "/cockpit/agents";

export function AgentStatusRail({
  summary,
  className,
}: AgentStatusRailProps) {
  return (
    <div
      data-testid="agent-status-rail"
      className={[
        "grid grid-cols-2 gap-3 sm:grid-cols-4",
        className ?? "",
      ].join(" ")}
    >
      <StatusTile
        label="Operational"
        value={String(summary.operationalCapacity)}
        tone={summary.operationalCapacity > 0 ? "good" : "neutral"}
        caption="real / partial"
        href={AGENTS_HREF}
      />
      <StatusTile
        label="Draft only"
        value={String(summary.draftOnly)}
        tone="info"
        caption="review-gated"
        href={AGENTS_HREF}
      />
      <StatusTile
        label="Manual"
        value={String(summary.manual)}
        tone="neutral"
        caption="human trigger"
        href={AGENTS_HREF}
      />
      <StatusTile
        label="Not wired"
        value={String(summary.notWired)}
        tone="warn"
        caption="designed · not capacity"
        href={AGENTS_HREF}
      />
    </div>
  );
}
