import type { AuditLedgerStatus } from "@/lib/jarvis/audit-ledger";

/**
 * Jarvis Audit Ledger — honest status of the audit trail.
 * PARTIAL: picks versioning + settlement ledger exist; no unified action store.
 */

export function JarvisAuditLedger({ status }: { status: AuditLedgerStatus }) {
  return (
    <section
      data-testid="jarvis-audit-ledger"
      className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-300">
          Audit Ledger
        </h2>
        <span className="rounded border border-yellow-900/60 bg-yellow-900/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-yellow-500">
          {status.isWired ? "WIRED" : "PARTIAL"}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center font-mono text-[10px]">
        <div className="rounded-lg border border-slate-800 bg-slate-950/60 px-1 py-1.5">
          <p className="text-sm font-bold tabular-nums text-slate-300">{status.totalEntries}</p>
          <p className="text-[8px] uppercase tracking-widest text-slate-500">Entries</p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/60 px-1 py-1.5">
          <p className="text-sm font-bold tabular-nums text-yellow-500">{status.pendingReview}</p>
          <p className="text-[8px] uppercase tracking-widest text-slate-500">Pending review</p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/60 px-1 py-1.5">
          <p className="text-sm font-bold tabular-nums text-slate-400">
            {status.lastEventAt ?? "—"}
          </p>
          <p className="text-[8px] uppercase tracking-widest text-slate-500">Last event</p>
        </div>
      </div>

      <p className="mt-3 text-[10px] leading-snug text-slate-400">{status.truth}</p>
    </section>
  );
}
