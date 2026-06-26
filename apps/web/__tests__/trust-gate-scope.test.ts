/**
 * TRUST-GATE — scoped (identifier/context) exemptions, not whole-file skips.
 *
 * Proves the reviewer's exact requirement: in an exempt engine file, a technical "lock" identifier
 * (LOCK_NOW / lockTime / the domain noun) passes, but a PROMOTIONAL "lock" in the SAME file still fails;
 * and the disclaimer "no outcome guaranteed" passes while a promotional "guaranteed winner" fails.
 */

import { describe, it, expect } from "vitest";
// Import the live scanner (main() is guarded so importing does not run the FS scan).
import { scanText } from "../../../scripts/guardrails/trust-gate.mjs";

const EXEMPT_LOCK = "packages/engine/src/fantasy/fantasy-light-cone.ts";
const EXEMPT_GUARANTEED = "packages/engine/src/fantasy/trade-mri.ts";
const NON_EXEMPT = "apps/web/components/promo/banner.tsx";

const lockHits = (src: string, file: string): unknown[] => scanText(src, file).filter((h: { claim: string }) => h.claim === "banned.lock");
const guarHits = (src: string, file: string): unknown[] => scanText(src, file).filter((h: { claim: string }) => h.claim === "banned.guaranteed-outcome");

describe("lock exemption is scoped to technical use, not the whole file", () => {
  it("allows technical lock identifiers in an exempt file", () => {
    expect(lockHits('const decision = "LOCK_NOW"; const lock = ms(q.lockTime);', EXEMPT_LOCK)).toHaveLength(0);
    expect(lockHits("readonly lock: FantasyLock; // POST_LOCK_ONLY", EXEMPT_LOCK)).toHaveLength(0);
    expect(lockHits("reason: `Knowable, but only after the ${q.lock} lock at ${q.lockTime}.`", EXEMPT_LOCK)).toHaveLength(0);
  });

  it("STILL fails on a promotional lock in the SAME exempt file", () => {
    expect(lockHits('const copy = "today\'s guaranteed lock";', EXEMPT_LOCK).length).toBeGreaterThan(0);
    expect(lockHits('const copy = "free lock of the day";', EXEMPT_LOCK).length).toBeGreaterThan(0);
    expect(lockHits('const copy = "VIP lock alert";', EXEMPT_LOCK).length).toBeGreaterThan(0);
  });

  it("deny-by-default still holds in a non-exempt file (any standalone lock)", () => {
    expect(lockHits('const copy = "this is a lock";', NON_EXEMPT).length).toBeGreaterThan(0);
  });
});

describe("guaranteed exemption is scoped to the negative disclaimer", () => {
  it("allows the disclaimer in the exempt file", () => {
    expect(guarHits('const s = "buy-low candidate (no outcome guaranteed).";', EXEMPT_GUARANTEED)).toHaveLength(0);
  });
  it("STILL fails on a promotional guaranteed in the SAME exempt file", () => {
    expect(guarHits('const s = "guaranteed winner tonight";', EXEMPT_GUARANTEED).length).toBeGreaterThan(0);
  });
});
