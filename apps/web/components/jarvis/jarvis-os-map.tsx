import type { JarvisOSState, OSPhaseStatus } from "@/lib/jarvis/os-state";

/**
 * Jarvis OS Map — the full operating loop with honest per-phase statuses.
 * Server component over the composed OS state.
 */

const STATUS_STYLES: Readonly<Record<OSPhaseStatus, string>> = {
  WIRED: "border-green-900/60 bg-green-900/20 text-green-400",
  PARTIAL: "border-yellow-900/60 bg-yellow-900/20 text-yellow-500",
  NOT_WIRED: "border-slate-700 bg-slate-800/40 text-slate-500",
  DESIGNED: "border-purple-900/60 bg-purple-900/20 text-purple-400",
  MANUAL: "border-orange-900/60 bg-orange-900/20 text-orange-400",
  DRAFT_ONLY: "border-amber-900/60 bg-amber-900/20 text-amber-400",
  ACTIVE: "border-blue-900/60 bg-blue-900/20 text-blue-400",
};

export function JarvisOSMap({ osState }: { osState: JarvisOSState }) {
  return (
    <section
      data-testid="jarvis-os-map"
      className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-300">
          Operating Loop Map
        </h2>
        <p className="font-mono text-[10px] text-slate-500">
          <span className="font-bold text-green-400">{osState.wiredCount}</span> wired ·{" "}
          <span className="font-bold text-yellow-500">{osState.partialCount}</span> partial ·{" "}
          <span className="font-bold text-slate-400">{osState.notWiredCount}</span> not wired
        </p>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {osState.operatingLoopPhases.map((p) => (
          <div
            key={p.phase}
            className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="font-mono text-[10px] font-bold tracking-wider text-slate-200">
                {p.phase}
              </p>
              <span
                className={[
                  "rounded border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-widest",
                  STATUS_STYLES[p.status],
                ].join(" ")}
              >
                {p.status.replace("_", " ")}
              </span>
            </div>
            <p className="mt-1 text-[10px] leading-snug text-slate-400">{p.truth}</p>
          </div>
        ))}
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-2">
          <p className="text-[9px] font-bold uppercase tracking-widest text-green-400">
            Safe to run now
          </p>
          <ul className="mt-1 list-disc pl-4 text-[10px] text-slate-400">
            {osState.safeToRunNow.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-2">
          <p className="text-[9px] font-bold uppercase tracking-widest text-yellow-500">
            Top blockers
          </p>
          <ul className="mt-1 list-disc pl-4 text-[10px] text-slate-400">
            {osState.topBlockers.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
