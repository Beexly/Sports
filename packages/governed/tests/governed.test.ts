import { describe, expect, it, vi } from "vitest";
import { createGoverned, type GateOutput } from "../src/governed";
import { InMemoryKeyringStore } from "../src/keyring";
import { rotateReceiptSigningKey } from "../src/rotate-keys";
import type { PolicyContext, SignedGovernedReceipt } from "../src/receipt-types";

async function makeDeps(gateOut: GateOutput) {
  const store = new InMemoryKeyringStore();
  await rotateReceiptSigningKey(store, { now: () => new Date("2026-07-23T00:00:00.000Z") });
  const persisted: SignedGovernedReceipt[] = [];
  const deps = {
    gate: vi.fn(async () => gateOut),
    persistReceipt: vi.fn(async (r: SignedGovernedReceipt) => {
      persisted.push(r);
      return { controlEventId: `evt-${persisted.length}` };
    }),
    getSigner: async () => {
      const rec = await store.getActive();
      return { kid: rec.kid, privateKeyPem: rec.privateKeyPem as string };
    },
    receiptBaseUrl: "https://example.test",
  };
  return { deps, store, persisted };
}

const baseCtx = (mode: "SHADOW" | "ENFORCE"): PolicyContext => ({
  policyVersion: 1,
  policyHash: "hash-1",
  agentId: "agent-1",
  mode,
});

describe("createGoverned", () => {
  it("ENFORCE + REFUSE gate: run() is never called, result is REFUSE", async () => {
    const { deps } = await makeDeps({ decision: "REFUSE", reasons: ["budget_exceeded"] });
    const governed = createGoverned(deps);
    const run = vi.fn(async () => "should-not-run");

    const result = await governed("tool.spend", { amountCents: 500 }, baseCtx("ENFORCE"), run);

    expect(run).not.toHaveBeenCalled();
    expect(result.ok).toBe(false);
    expect(result.decision).toBe("REFUSE");
    expect(result.receipt.decision).toBe("REFUSE");
    console.log("REFUSE receipt (ENFORCE):\n" + JSON.stringify(result.receipt, null, 2));
  });

  it("SHADOW + REFUSE-deciding gate: run() IS called, result ok, reasons include SHADOW_WOULD_REFUSE", async () => {
    const { deps } = await makeDeps({ decision: "REFUSE", reasons: ["budget_exceeded"] });
    const governed = createGoverned(deps);
    const run = vi.fn(async () => ({ output: 42 }));

    const result = await governed("tool.spend", { amountCents: 500 }, baseCtx("SHADOW"), run);

    expect(run).toHaveBeenCalledTimes(1);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({ output: 42 });
      expect(result.receipt.reasons).toContain("SHADOW_WOULD_REFUSE");
      expect(result.receipt.decision).toBe("ADMIT");
      console.log("ADMIT receipt (SHADOW, would-refuse):\n" + JSON.stringify(result.receipt, null, 2));
    }
  });

  it("ADMIT-deciding gate produces a plain ADMIT receipt with no SHADOW tag", async () => {
    const { deps } = await makeDeps({ decision: "ADMIT", reasons: [] });
    const governed = createGoverned(deps);
    const run = vi.fn(async () => "ok");

    const result = await governed("tool.read", { id: "abc" }, baseCtx("SHADOW"), run);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.receipt.reasons).not.toContain("SHADOW_WOULD_REFUSE");
      console.log("ADMIT receipt (plain):\n" + JSON.stringify(result.receipt, null, 2));
    }
  });
});
