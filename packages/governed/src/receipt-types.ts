// Public receipt shapes for the A++ Governed Receipts + Keyring package.
//
// NON-CLAIM: none of these types, or any code in this package, assert or
// imply regulatory certification or legal compliance with any framework.
// See README.md's NON-CLAIMS section.

export type AdmissionDecision = "ADMIT" | "REFUSE";
export type SrqcMode = "SHADOW" | "ENFORCE";

export type GovernedReceipt = {
  receiptId: string;
  at: string;
  policyVersion: number | null;
  policyHash: string | null;
  action: {
    tool: string;
    argsDigest: string;
    agentId: string;
    parentInvocationId?: string;
  };
  decision: AdmissionDecision;
  reasons: string[];
  budget?: { heldCents?: number; remainingCents?: number; unit?: string };
  controlEventId?: string;
  receiptUrl?: string;
};

export type ReceiptSignature = { alg: "ed25519"; sig: string; kid: string };
export type SignedGovernedReceipt = GovernedReceipt & { signature: ReceiptSignature };

export type GovernedResult<T> =
  | { ok: true; decision: "ADMIT"; value: T; receipt: SignedGovernedReceipt }
  | { ok: false; decision: "REFUSE"; receipt: SignedGovernedReceipt };

export type PolicyContext = {
  policyVersion: number | null;
  policyHash: string | null;
  agentId: string;
  mode: SrqcMode;
};
