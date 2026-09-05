/**
 * D-10 (C11 BEFORE DEPLOY / C12 PART 5): the public board must SAY which
 * surface it is. "market" rows carry book prices; "signal" rows are model
 * signals and must never look like book prices. The policy module
 * (lib/board/board-surface-policy.ts) already resolves this for the ops
 * truth endpoint and the drafts cron — this is the customer-facing mount.
 *
 * The board-state layer carries no odds-freshness signal, so this mount
 * passes oddsFresh=null: auto mode resolves to "signal" (fail-honest —
 * never label model lines as book prices). An operator who sets
 * PUBLIC_BOARD_SURFACE=market gets the market chip explicitly.
 */
import { boardSurfacePosture } from "@/lib/board/board-surface-policy";

export function BoardSurfaceChip({
  oddsFresh,
}: {
  readonly oddsFresh?: boolean | null;
}): JSX.Element {
  const posture = boardSurfacePosture(process.env, { oddsFresh });
  const isSignal = posture.surface === "signal";
  return (
    <span
      data-testid="board-surface-chip"
      title={posture.operatorHint}
      className={`inline-flex items-center gap-1.5 border px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.18em] ${
        isSignal
          ? "border-caution/50 bg-caution/10 text-caution"
          : "border-orbital-cyan/50 bg-orbital-cyan/[0.08] text-orbital-cyan"
      }`}
    >
      {isSignal ? "Signal board — model lines, not book prices" : "Market board — book lines"}
    </span>
  );
}
