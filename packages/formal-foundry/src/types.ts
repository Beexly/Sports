/**
 * GSE Formal Foundry — Shared Types
 * Soundness role: common contracts for all modules.
 * Linear-only. Fail-closed. Silent-launch compatible.
 */

export type Frame = Record<string, unknown>;
export type Candidate = Record<string, unknown>;
export type State = Record<string, unknown>;

export type ProofStatus = "PASSED" | "REJECTED" | "MANUAL_REVIEW" | "PROCESSED";

export interface ProofGatedChange {
  pr: string;
  invariantsChecked: string[];
  ctiCount: number;
  status: ProofStatus;
  timestamp: string;
  verifier: "Apalache+IC3" | "Owner" | "Lifting";
}

export interface VelocityMetrics {
  changesUnderProof: number;
  ctiCaught: number;
  incidentRateProtected: number;
  averageProofLatencyMs: number;
  lastProofDate: string;
}

export class ApalacheRpcError extends Error {
  constructor(
    message: string,
    public readonly code?: number,
    public readonly data?: unknown
  ) {
    super(message);
    this.name = "ApalacheRpcError";
  }
}
