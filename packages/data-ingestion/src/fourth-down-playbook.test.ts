/**
 * Tests for ./fourth-down-playbook (arXiv:1802.08765v1, lane=win_spread_total).
 *
 * ACCEPTANCE GATE: ADOPT the model-tree draft lane only if, on the 2019-2024 test drafts, the logistic model tree's
 * SRC beats draft-order SRC by >=0.10 AND beats the global logistic regression's SRC by >=0.05;
 * REJECT otherwise.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./fourth-down-playbook";

describe("fourth-down playbook (arXiv:1803.04760v3)", () => {
  const go = { value: 0.55, winProb: 0.62 };
  const kick = { value: 0.5, winProb: 0.58 };
  const punt = { value: 0.45, winProb: 0.5 };
  it("recommends go with delta", () => {
    const row = mod.playbookRow(40, 2, go, kick, punt)!;
    expect(row.recommendation).toBe("go");
    expect(row.deltaGo).toBeCloseTo(0.04, 10);
  });
  it("break-even rate solves the indifference point", () => {
    const be = mod.breakEvenRate({ value: 0.8, winProb: 0.7 }, { value: 0.2, winProb: 0.3 }, { value: 0.5, winProb: 0.5 })!;
    expect(be).toBeCloseTo(0.5, 10);
    expect(mod.breakEvenRate(go, go, kick)).toBeNull();
  });
  it("buildPlaybook covers the field", () => {
    const rows = mod.buildPlaybook((yd, d, play) => {
      if (play === "punt") return yd > 50 ? punt : { value: 0.1, winProb: 0.2 };
      if (play === "kick") return yd < 40 ? kick : { value: 0.1, winProb: 0.2 };
      return go;
    });
    expect(rows.length).toBeGreaterThan(2000);
  });
  it("aggressiveness index", () => {
    const rows = [{ yardline: 40, distance: 2, recommendation: "go" as const, deltaGo: 0.01, breakEven: null }];
    expect(mod.aggressivenessIndex(rows)).toBe(1);
    expect(mod.aggressivenessIndex([])).toBeNull();
  });
  it("null on malformed", () => {
    expect(mod.playbookRow(40, 2, { value: 1, winProb: 2 } as never, kick, punt)).toBeNull();
  });
});
