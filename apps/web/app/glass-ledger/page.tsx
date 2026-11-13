import { redirect } from "next/navigation";

/**
 * /glass-ledger is retired. The single recomputable ledger now lives at
 * /record (verified by scripts/verify-ledger.ts straight from Neon) and the
 * published plays live at /picks. One record, one source of truth - no second
 * copy of the ledger to drift.
 */
export default function GlassLedgerRetiredPage(): never {
  redirect("/picks");
}