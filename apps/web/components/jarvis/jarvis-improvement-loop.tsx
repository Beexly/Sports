import type { ImprovementLoopStatus } from "@/lib/jarvis/improvement-loop";

/**
 * Jarvis Improvement Loop — proposals only, never autonomy.
 * The prediction engine can never be adjusted automatically.
 */

export function JarvisImprovementLoop({ status }: { status: ImprovementLoopStatus }) {
  return (
    <section
      data-testid="jarvis-improvement-loop"
      className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-300">
          Improvement Loop
        </h2>
        <span className="rounded border border-slate-700 bg-slate-800/40 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-slate-500">
          {status.isActive ? "ACTIVE" : "NOT WIRED"}
        </span>
      </div>

      <p className="mt-2 text-[10px] leading-snug text-slate-400">{status.truth}</p>

      <div className="mt-3 rounded-lg border border-red-900/40 bg-red-950/20 px-3 py-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-red-400">
          Hard invariant
        </p>
        <p className="mt-0.5 text-[10px] text-slate-400">
          canAutomaticallyAdjustPredictionEngine:{" "}
          <span className="font-mono font-bold text-red-400">
            {String(status.canAutomaticallyAdjustPredictionEngine)}
          </span>{" "}
          — calibration and model changes always require owner approval plus
          out-of-sample validation.
        </p>
      </div>

      <div className="mt-3">
        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">
          Standing proposals ({status.proposals.length})
        </p>
        <ul className="mt-1 space-y-1.5">
          {status.proposals.map((p) => (
            <li
              key={p.id}
              className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold text-slate-200">{p.title}</p>
                <span className="font-mono text-[9px] font-bold uppercase text-purple-400">
                  {p.status}
                </span>
              </div>
              <p className="mt-0.5 text-[10px] text-slate-400">{p.expectedGain}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
