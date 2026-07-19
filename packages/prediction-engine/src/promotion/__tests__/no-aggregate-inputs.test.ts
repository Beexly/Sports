/**
 * Contract §5 invariant #4 — "No self-reports, structurally": the
 * evaluator's input types accept only row-level persisted records. This is
 * documentation-by-test: there is no runtime way to prove a TYPE has no
 * aggregate field, so this file asserts it two ways —
 *   (a) the row types (PairedBrierRow / ClvRow) expose exactly their
 *       documented row-level keys, none of which look aggregate-shaped, and
 *   (b) TypeScript itself rejects (at compile time, via @ts-expect-error)
 *       any attempt to hand PromotionInput a pre-aggregated object in place
 *       of a row array, or to smuggle an aggregate field onto the input.
 * DEC-062's hardcoded `computeClvMean()` returning 0.5 for every input is
 * unrepresentable against this type: there is no field for it to populate.
 */

import { describe, expect, it } from "vitest";
import type { ClvRow, PairedBrierRow, PromotionInput } from "../types.js";
import { baseWindow } from "./fixtures.js";

describe("PromotionInput — no aggregate self-reports, structurally (contract invariant 4)", () => {
  it("PairedBrierRow exposes only row-level fields", () => {
    const brierRow: PairedBrierRow = {
      eventId: "e",
      championProb: 0.5,
      challengerProb: 0.5,
      outcome: 1,
      lockedAt: "2026-01-01T00:00:00.000Z",
      settledAt: "2026-01-02T00:00:00.000Z",
    };
    expect(Object.keys(brierRow).sort()).toEqual(
      ["championProb", "challengerProb", "eventId", "lockedAt", "outcome", "settledAt"].sort(),
    );
    const forbidden = /mean|avg|average|^sum$|total|aggregate|improvement/i;
    for (const key of Object.keys(brierRow)) {
      expect(key).not.toMatch(forbidden);
    }
  });

  it("ClvRow exposes only row-level fields", () => {
    const clvRow: ClvRow = {
      pickId: "p",
      model: "champion",
      clv: 0.01,
      lockedAt: "2026-01-01T00:00:00.000Z",
      settledAt: "2026-01-02T00:00:00.000Z",
    };
    expect(Object.keys(clvRow).sort()).toEqual(["clv", "lockedAt", "model", "pickId", "settledAt"].sort());
    const forbidden = /mean|avg|average|^sum$|total|aggregate|improvement/i;
    for (const key of Object.keys(clvRow)) {
      expect(key).not.toMatch(forbidden);
    }
  });

  it("PromotionInput.clvRows must be an array of row records, not a pre-aggregated object (compile-time)", () => {
    const window = baseWindow();
    // clvRows must be `readonly ClvRow[]`, not a pre-aggregated summary
    // object. A hardcoded computeClvMean()-style stub is unrepresentable
    // here: there is no field for it to populate.
    const badInput: PromotionInput = {
      window,
      championId: "champion-v1",
      challengerId: "challenger-v1",
      codeRevision: "rev",
      brierRows: [],
      // @ts-expect-error — not a `readonly ClvRow[]`, a bare aggregate object.
      clvRows: { meanClv: 0.5 },
    };
    void badInput;
  });

  it("PromotionInput.brierRows must be an array of row records, not a scalar improvement (compile-time)", () => {
    const window = baseWindow();
    // brierRows must be `readonly PairedBrierRow[]`, not a pre-computed
    // scalar (e.g. the declined branch's tautological brierImprovement,
    // which read the same field for both sides).
    const badInput: PromotionInput = {
      window,
      championId: "champion-v1",
      challengerId: "challenger-v1",
      codeRevision: "rev",
      // @ts-expect-error — not a `readonly PairedBrierRow[]`, a bare scalar.
      brierRows: 0,
      clvRows: [],
    };
    void badInput;
  });

  it("PromotionInput rejects excess aggregate-shaped properties on the input itself (compile-time)", () => {
    const window = baseWindow();
    // PromotionInput has no aggregate field (e.g. brierImprovement) for a
    // caller to pre-populate and have trusted as-is; TypeScript's
    // excess-property check on the object literal catches it below.
    const badInput: PromotionInput = {
      window,
      championId: "champion-v1",
      challengerId: "challenger-v1",
      codeRevision: "rev",
      brierRows: [],
      clvRows: [],
      // @ts-expect-error — PromotionInput has no `brierImprovement` field.
      brierImprovement: 0,
    };
    void badInput;
  });
});
