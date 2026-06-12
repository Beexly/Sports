import {
  TOOL_REGISTRY,
  type ToolRouterStatus,
  type ToolStatus,
} from "@/lib/jarvis/tool-router";

/**
 * Jarvis Tool Router — registry status: wired vs not-wired tools, and the
 * hard rule that no write tool runs without approval.
 */

const TOOL_STATUS_STYLES: Readonly<Record<ToolStatus, string>> = {
  WIRED: "border-green-900/60 bg-green-900/20 text-green-400",
  ACTIVE: "border-blue-900/60 bg-blue-900/20 text-blue-400",
  PARTIAL: "border-yellow-900/60 bg-yellow-900/20 text-yellow-500",
  DESIGNED: "border-purple-900/60 bg-purple-900/20 text-purple-400",
  NOT_WIRED: "border-slate-700 bg-slate-800/40 text-slate-500",
};

export function JarvisToolRouter({ status }: { status: ToolRouterStatus }) {
  return (
    <section
      data-testid="jarvis-tool-router"
      className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-300">
          Tool Router
        </h2>
        <p className="font-mono text-[10px] text-slate-500">
          {status.totalTools} tools ·{" "}
          <span className="font-bold text-green-400">{status.wiredCount}</span> wired ·{" "}
          <span className="font-bold text-yellow-500">{status.partialCount}</span> partial ·{" "}
          <span className="font-bold text-slate-400">{status.notWiredCount}</span> not wired
        </p>
      </div>

      <div className="mt-3 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
        {TOOL_REGISTRY.map((t) => (
          <div
            key={t.id}
            className="rounded-lg border border-slate-800 bg-slate-950/60 px-2.5 py-1.5"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-semibold text-slate-200">{t.name}</p>
              <span
                className={[
                  "rounded border px-1 py-0.5 text-[8px] font-bold uppercase tracking-widest",
                  TOOL_STATUS_STYLES[t.status],
                ].join(" ")}
              >
                {t.status.replace("_", " ")}
              </span>
            </div>
            <p className="mt-0.5 font-mono text-[8px] uppercase tracking-wider text-slate-500">
              {t.readAllowed ? "read" : ""}
              {t.writeAllowed ? " · write" : ""}
              {t.approvalRequired ? " · approval required" : ""}
              {t.canRunNow ? " · runs now" : ""}
            </p>
          </div>
        ))}
      </div>

      <p className="mt-3 text-[10px] text-slate-500">
        Ready now (read-only):{" "}
        <span className="text-green-400">{status.readyToUseNow.join(", ") || "none"}</span>.
        No write tool runs without owner approval — the approval mechanism is not wired.
      </p>
    </section>
  );
}
