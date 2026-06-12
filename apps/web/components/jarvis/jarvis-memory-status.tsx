import type { MemoryProtocolStatus } from "@/lib/jarvis/memory-types";

/**
 * Jarvis Memory Status — honest posture of the memory protocol.
 * DESIGNED/FILE_BACKED until a queryable store is wired.
 */

export function JarvisMemoryStatus({ status }: { status: MemoryProtocolStatus }) {
  return (
    <section
      data-testid="jarvis-memory-status"
      className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-300">
          Memory Protocol
        </h2>
        <span className="rounded border border-purple-900/60 bg-purple-900/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-purple-400">
          {status.backingStatus}
        </span>
      </div>

      <p className="mt-2 text-[10px] leading-snug text-slate-400">{status.truth}</p>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-2">
          <p className="text-[9px] font-bold uppercase tracking-widest text-green-400">Can</p>
          <ul className="mt-1 list-disc pl-4 text-[10px] text-slate-400">
            {status.capabilities.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-2">
          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Cannot</p>
          <ul className="mt-1 list-disc pl-4 text-[10px] text-slate-400">
            {status.limitations.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </div>
      </div>

      <p className="mt-3 text-[10px] text-slate-400">
        <span className="font-bold uppercase tracking-widest text-slate-500">Next wiring step: </span>
        {status.nextWiringStep}
      </p>
    </section>
  );
}
