import type { BoardStatePayload } from "@/lib/board/state";
import { NUMERIC_TEXT_CLASS, formatCount } from "@/lib/format/stat";

const TONE: Record<BoardStatePayload["meta"]["health"]["status"], string> = {
  DEGRADED: "border-caution/50 bg-caution/10 text-caution",
  HEALTHY: "border-orbital-cyan/50 bg-orbital-cyan/[0.08] text-orbital-cyan",
  UNAVAILABLE: "border-alert/50 bg-alert/10 text-alert",
};

function shortTrace(traceId: string): string {
  const parts = traceId.split("-");
  return parts.at(-1) ?? traceId;
}

export function BoardHealthBadge({ meta }: { readonly meta: BoardStatePayload["meta"] }) {
  const primaryDegradation = meta.degradations[0] ?? null;

  return (
    <div
      data-testid="board-health-badge"
      className={`min-w-0 border px-3 py-2 ${TONE[meta.health.status]}`}
      title={`Trace ${meta.traceId}`}
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em]">
          Board health
        </span>
        <span className="text-sm font-semibold text-ion-white">{meta.health.label}</span>
        <span className={`font-mono text-[11px] text-ion-2 ${NUMERIC_TEXT_CLASS}`}>
          {formatCount(meta.health.rowCount)} rows
        </span>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-ion-2">
        <span className="font-mono uppercase tracking-[0.16em]">Trace {shortTrace(meta.traceId)}</span>
        <span className="font-mono uppercase tracking-[0.12em]" data-testid="board-class-label">
          {meta.boardClass.state}
        </span>
        {meta.boardClass.refusePublicFire && (
          <span className="text-ion-3">public fire held</span>
        )}
        {primaryDegradation && <span>{primaryDegradation.message}</span>}
      </div>
    </div>
  );
}
