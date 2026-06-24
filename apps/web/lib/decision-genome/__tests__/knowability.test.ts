import { describe, expect, it } from "vitest";
import {
  assertNoLeakage,
  checkFact,
  isKnowableAtLock,
  isWindowCoherent,
  knowableFactsOnly,
  type DecisionWindow,
  type KnowableFact,
} from "../knowability";

const LOCK = 1_000_000;
const window: DecisionWindow = { decisionLockedAt: LOCK, eventStartedAt: LOCK + 1000, settledAt: LOCK + 5000 };

const fact = (id: string, over: Partial<KnowableFact["stamps"]>, perms?: KnowableFact["permissions"]): KnowableFact => ({
  id,
  value: id,
  stamps: { availableAt: LOCK - 100, ...over },
  ...(perms ? { permissions: perms } : {}),
});

describe("KnowabilityKernel", () => {
  it("accepts a fact available before lock", () => {
    expect(isKnowableAtLock(fact("a", {}), window)).toBe(true);
    expect(checkFact(fact("a", {}), window)).toBeNull();
  });

  it("rejects a fact that became available AFTER lock (leakage)", () => {
    const v = checkFact(fact("late", { availableAt: LOCK + 1 }), window);
    expect(v?.reason).toBe("available-after-lock");
    expect(v?.lateByMs).toBe(1);
  });

  it("fails safe when availableAt is missing/non-finite", () => {
    const v = checkFact(fact("noavail", { availableAt: Number.NaN }), window);
    expect(v?.reason).toBe("missing-available-at");
  });

  it("rejects a fact trusted after lock even if available before", () => {
    const v = checkFact(fact("trustlate", { availableAt: LOCK - 50, trustedAt: LOCK + 10 }), window);
    expect(v?.reason).toBe("trusted-after-lock");
  });

  it("rejects a fact not cleared for decision use", () => {
    const v = checkFact(fact("noperm", {}, { decisionUse: false, publicUse: false }), window);
    expect(v?.reason).toBe("not-cleared-for-decision-use");
  });

  it("assertNoLeakage returns every violation and knowableFactsOnly filters them", () => {
    const facts = [fact("ok", {}), fact("late", { availableAt: LOCK + 1 }), fact("ok2", {})];
    expect(assertNoLeakage(facts, window)).toHaveLength(1);
    expect(knowableFactsOnly(facts, window).map((f) => f.id)).toEqual(["ok", "ok2"]);
  });

  it("validates window ordering (lock <= event <= settle)", () => {
    expect(isWindowCoherent(window)).toBe(true);
    expect(isWindowCoherent({ decisionLockedAt: LOCK, eventStartedAt: LOCK - 1 })).toBe(false);
    expect(isWindowCoherent({ decisionLockedAt: LOCK, settledAt: LOCK - 1 })).toBe(false);
  });
});
