/**
 * Combine negative prior — tests (arXiv 2303.05774v1).
 *
 * ACCEPTANCE GATE: the blend caps the combine weight at 0.1 even when
 * asked for more; 3-cone is zeroed for RB/WR/TE while broad jump keeps
 * a small allowance; the trap score fades testing-driven rookies and
 * favors production-driven ones; negative weights throw.
 */
import { describe, expect, it } from "vitest";
import {
  capCombineWeight,
  combineTrapScore,
  constrainDrills,
  MAX_COMBINE_WEIGHT,
  rookieProjection,
  rookiePropVerdict,
} from "./rookie-combine-prior";

describe("capCombineWeight", () => {
  it("caps gamma at 0.1", () => {
    expect(MAX_COMBINE_WEIGHT).toBe(0.1);
    const capped = capCombineWeight({ alpha: 0.5, beta: 0.3, gamma: 0.4 });
    expect(capped.gamma).toBe(0.1);
    expect(capped.alpha).toBe(0.5);
    const ok = capCombineWeight({ alpha: 0.5, beta: 0.4, gamma: 0.05 });
    expect(ok.gamma).toBe(0.05);
    expect(() => capCombineWeight({ alpha: -0.1, beta: 0.3, gamma: 0.05 })).toThrow();
  });
});

describe("rookieProjection", () => {
  it("limits combine influence on the projection", () => {
    const signals = { production: 0.2, draftValue: 0.3, combine: 2.5 };
    const withCap = rookieProjection(signals, { alpha: 0.5, beta: 0.4, gamma: 0.4 });
    const withoutCap =
      0.5 * 0.2 + 0.4 * 0.3 + 0.4 * 2.5;
    // The combine standout moves the projection far less with the cap.
    expect(withCap).toBeLessThan(withoutCap - 0.5);
    expect(withCap).toBeCloseTo(0.5 * 0.2 + 0.4 * 0.3 + 0.1 * 2.5, 12);
  });
});

describe("constrainDrills", () => {
  it("zeroes 3-cone for skill positions, allows broad jump", () => {
    const raw = { fortyYd: 0.05, threeCone: 0.08, broadJump: 0.2, vertical: 0.05 };
    const wr = constrainDrills("WR", raw);
    expect(wr.threeCone).toBe(0);
    expect(wr.broadJump).toBe(0.1); // capped at the allowance
    expect(wr.fortyYd).toBe(0.05);
    const ol = constrainDrills("OL", raw);
    expect(ol.threeCone).toBe(0.08); // not a skill position: untouched
    const neg = constrainDrills("RB", { ...raw, broadJump: -0.05 });
    expect(neg.broadJump).toBe(0);
  });
});

describe("rookiePropVerdict", () => {
  it("fades testing-driven rookies, favors producers", () => {
    const trap = { production: -0.5, draftValue: 1.5, combine: 2.0 };
    expect(combineTrapScore(trap)).toBeCloseTo(2.5, 12);
    expect(rookiePropVerdict(trap)).toBe("fade");
    const producer = { production: 2.0, draftValue: 0.5, combine: -0.5 };
    expect(rookiePropVerdict(producer)).toBe("favor");
    const balanced = { production: 1.0, draftValue: 1.0, combine: 1.2 };
    expect(rookiePropVerdict(balanced)).toBe("neutral");
  });
});
