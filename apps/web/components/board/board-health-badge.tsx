import type { BoardStatePayload } from "@/lib/board/state";

const TONE: Record<BoardStatePayload["meta"]["health"]["status"], string> = {
  DEGRADED: "border-caution/50 bg-caution/10 text-caution",
  HEALTHY: "border-orbital-cyan/50 bg-orbital-cyan/[0.08] text-orbital-cyan",
  UNAVAILABLE: "border-alert/50 bg-alert/10 text-alert",
};

/**
 * Plain-language status for each board class. The raw enum, trace id and row
 * count are operator detail and stay off the public badge; the state is still
 * read from meta.boardClass.state so the badge cannot drift from the
 * classifier. Unknown future states read "Updating" rather than a raw token.
 */
const BOARD_STATE_LABEL: Readonly<Record<string, string>> = {
  HAS_ROWS: "Live",
  HONEST_EMPTY_LIVE_BOARD_OFF: "No picks on the board right now",
  HONEST_EMPTY_NO_ELIGIBLE: "No picks on the board right now",
  SUPPRESSED_DEMO: "No picks on the board right now",
  SUPPRESSED_STALE: "Board updating",
  DB_UNREACHABLE: "Board unavailable right now",
  BOOTSTRAP: "Board warming up",
};

export function boardStateLabel(state: string): string {
  return BOARD_STATE_LABEL[state] ?? "Updating";
}

export function BoardHealthBadge({ meta }: { readonly meta: BoardStatePayload["meta"] }) {
  return (
    <div
      data-testid="board-health-badge"
      className={`inline-flex min-w-0 items-center rounded-full border px-2.5 py-1 ${TONE[meta.health.status]}`}
    >
      <span
        className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-ion-white"
        data-testid="board-class-label"
      >
        {boardStateLabel(meta.boardClass.state)}
      </span>
    </div>
  );
}
