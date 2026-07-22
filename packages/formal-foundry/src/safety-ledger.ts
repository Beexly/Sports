/**
 * GSE Formal Foundry — Safety Ledger
 * Records every proof-gated change and CTI.
 * Soundness role: audit trail for integrity.
 *
 * Silent by design (fixed: `record` used to `console.log` every entry as a
 * side effect — removed to match this repo's "dormant / lab-only ... zero
 * side effects" posture, the same stance `formal-heartbeat`
 * (branch labs/constellation-wave3-batch1-ext) documents for its own
 * monitoring code: "no writes, no alerts, no enforcement, no I/O". The
 * ledger's job is to RECORD, in memory, for a caller to read via
 * `getLog()`/`summary()` — not to narrate itself to the console on every
 * call).
 */

import type { ProofGatedChange } from "./types";

export class SafetyLedger {
  private log: ProofGatedChange[] = [];

  record(entry: Omit<ProofGatedChange, "timestamp">): void {
    const full: ProofGatedChange = {
      ...entry,
      timestamp: new Date().toISOString(),
    };
    this.log.push(full);
  }

  summary(): string {
    const passed = this.log.filter((e) => e.status === "PASSED").length;
    const ctiTotal = this.log.reduce((sum, e) => sum + e.ctiCount, 0);
    return `Proof-gated changes: ${passed} | CTIs recorded: ${ctiTotal} | Total entries: ${this.log.length}`;
  }

  getLog(): readonly ProofGatedChange[] {
    return this.log;
  }

  clear(): void {
    this.log = [];
  }
}

export const ledger = new SafetyLedger();
