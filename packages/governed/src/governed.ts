import { randomUUID } from "node:crypto";
import { argsDigest } from "./digest";
import { signReceiptEd25519 } from "./receipt-sign-ed25519";
import type { GovernedResult, PolicyContext, GovernedReceipt, SignedGovernedReceipt } from "./receipt-types";

export type GateOutput = { decision: "ADMIT" | "REFUSE"; reasons: string[]; budget?: GovernedReceipt["budget"] };

export type GovernedDeps = {
  gate: (i: { tool: string; args: unknown; ctx: PolicyContext }) => Promise<GateOutput>;
  persistReceipt: (r: SignedGovernedReceipt) => Promise<{ controlEventId?: string }>;
  getSigner: () => Promise<{ kid: string; privateKeyPem: string }>;
  receiptBaseUrl?: string;
};

/**
 * Build the `governed()` wrapper. SHADOW is the safe default posture: unless
 * `ctx.mode === "ENFORCE"` is explicitly passed by the caller, a REFUSE from
 * the gate is downgraded to an effective ADMIT (tagged "SHADOW_WOULD_REFUSE"
 * in `reasons`) and `run()` still executes. Nothing here silently defaults
 * to ENFORCE.
 */
export function createGoverned(deps: GovernedDeps) {
  return async function governed<T>(
    tool: string,
    args: unknown,
    ctx: PolicyContext,
    run: () => Promise<T>,
  ): Promise<GovernedResult<T>> {
    const receiptId = randomUUID();
    const at = new Date().toISOString();
    const gateOut = await deps.gate({ tool, args, ctx });
    const effective = ctx.mode === "ENFORCE" ? gateOut.decision : ("ADMIT" as const);
    const base: GovernedReceipt = {
      receiptId,
      at,
      policyVersion: ctx.policyVersion,
      policyHash: ctx.policyHash,
      action: { tool, argsDigest: argsDigest(args), agentId: ctx.agentId },
      decision: effective === "REFUSE" ? "REFUSE" : "ADMIT",
      reasons:
        ctx.mode === "SHADOW" && gateOut.decision === "REFUSE"
          ? [...gateOut.reasons, "SHADOW_WOULD_REFUSE"]
          : gateOut.reasons,
      budget: gateOut.budget,
      receiptUrl: deps.receiptBaseUrl ? `${deps.receiptBaseUrl}/receipts/${receiptId}` : undefined,
    };

    if (effective === "REFUSE") {
      const signer = await deps.getSigner();
      const signed = signReceiptEd25519({ ...base, decision: "REFUSE" }, signer);
      const p = await deps.persistReceipt(signed);
      return { ok: false, decision: "REFUSE", receipt: { ...signed, controlEventId: p.controlEventId } };
    }

    // run() executes ONLY when the effective decision is ADMIT — in SHADOW
    // mode that's always true, even when the gate itself said it would
    // REFUSE (that's the shadow-observability point: nothing is blocked,
    // the would-be refusal is only recorded).
    const value = await run();
    const signer = await deps.getSigner();
    const signed = signReceiptEd25519(base, signer);
    const p = await deps.persistReceipt(signed);
    return { ok: true, decision: "ADMIT", value, receipt: { ...signed, controlEventId: p.controlEventId } };
  };
}
