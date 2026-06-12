import {
  buildActionQueueSummary,
  type ActionItem,
  type ActionState,
} from "@/lib/jarvis/action-queue";

/**
 * Jarvis Action Queue — proposed actions and the approval boundary.
 * Only READ_ONLY_CHECK can ever run without owner approval.
 */

const STATE_STYLES: Readonly<Record<ActionState, string>> = {
  PROPOSED: "text-slate-400",
  NEEDS_APPROVAL: "text-yellow-500",
  APPROVED: "text-blue-400",
  REJECTED: "text-red-400",
  RUNNING: "text-blue-400",
  COMPLETED: "text-green-400",
  FAILED: "text-red-400",
  SCRIBED: "text-slate-500",
};

export function JarvisActionQueue({ items }: { items?: readonly ActionItem[] }) {
  const queue = items ?? [];
  const summary = buildActionQueueSummary(queue);

  return (
    <section
      data-testid="jarvis-action-queue"
      className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-300">
          Action Queue
        </h2>
        <span className="rounded border border-green-900/60 bg-green-900/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-green-400">
          CODE BACKED
        </span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center font-mono text-[10px] sm:grid-cols-6">
        <Stat label="Proposed" value={summary.proposed} tone="text-slate-300" />
        <Stat label="Approval" value={summary.needsApproval} tone="text-yellow-500" />
        <Stat label="Approved" value={summary.approved} tone="text-blue-400" />
        <Stat label="Running" value={summary.running} tone="text-blue-400" />
        <Stat label="Done" value={summary.completed} tone="text-green-400" />
        <Stat label="Failed" value={summary.failed} tone="text-red-400" />
      </div>

      {queue.length === 0 ? (
        <p className="mt-3 rounded-lg border border-dashed border-slate-700 bg-slate-950/40 p-3 text-[10px] text-slate-500">
          Queue is empty. Actions are proposed here, gated by approval, and scribed
          when done. Only READ_ONLY_CHECK can execute without your sign-off — and no
          executor is wired yet.
        </p>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {queue.map((a) => (
            <li
              key={a.id}
              className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold text-slate-200">{a.title}</p>
                <span className={`font-mono text-[9px] font-bold uppercase ${STATE_STYLES[a.state]}`}>
                  {a.state.replace("_", " ")}
                </span>
              </div>
              <p className="mt-0.5 text-[10px] text-slate-400">
                {a.type} · risk {a.risk} · {a.approvalRequired ? "approval required" : "read-only"}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/60 px-1 py-1.5">
      <p className={`text-sm font-bold tabular-nums ${tone}`}>{value}</p>
      <p className="text-[8px] uppercase tracking-widest text-slate-500">{label}</p>
    </div>
  );
}
