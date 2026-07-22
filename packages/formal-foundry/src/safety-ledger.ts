/**
 * GSE Formal Foundry — Safety Ledger
 * Records every proof-gated change and CTI.
 * Soundness role: audit trail for integrity.
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
    console.log("🛡️ SafetyLedger:", JSON.stringify(full, null, 2));
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
