/**
 * Tests for ./ens10-postprocess (arXiv:2206.14786, lane=weather).
 *
 * ACCEPTANCE GATE: ADOPT iff any NN baseline cuts CRPS >= 10% vs raw on wind speed AND the EECRPS ranking matches
 * the CRPS ranking (extreme skill not traded away); REJECT if Gaussian-CRPS post-processing can't
 * beat raw on wind speed — then go straight to the flow/LGBM recipes and this paper stays a metric
 * citation.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./ens10-postprocess";

describe("ENS-10 post-processing (arXiv:2206.14786)", () => {
  const rows = Array.from({ length: 10 }, (_, m) => ({
    gridpoint: "g1",
    validAt: "2024-01-01T00:00:00.000Z",
    member: m,
    t2m: 280 + m,
    tcc: 0.5,
  }));
  it("groups members", () => {
    const g = mod.groupEnsemble(rows);
    expect(g.size).toBe(1);
    expect(g.values().next().value).toHaveLength(10);
    expect(mod.isEnsMember({ ...rows[0], member: 10 })).toBe(false);
  });
  it("EMOS-lite", () => {
    const e = mod.emosLite(rows as never)!;
    expect(e.mean).toBeCloseTo(284.5, 10);
    expect(e.sd).toBeGreaterThan(0);
    expect(mod.emosLite([])).toBeNull();
  });
  it("CRPS", () => {
    const c = mod.crpsGaussian(284.5, 2, 284.5)!;
    expect(c).toBeGreaterThan(0);
    expect(mod.crpsGaussian(284.5, 2, 290)!).toBeGreaterThan(c);
    expect(mod.crpsGaussian(0, 0, 0)).toBeNull();
  });
});
