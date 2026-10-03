import { describe, it, expect } from "vitest";
import {
  buildRpcpConformalBridge,
  rpcpConformalBridgePosture,
} from "./rpcp-conformal-bridge";
import {
  buildRankingPowerControl,
  type RankingPowerRow,
} from "./ranking-power-control";

function rows(n: number): RankingPowerRow[] {
  const out: RankingPowerRow[] = [];
  for (let i = 0; i < n; i++) {
    const y = (i % 2 === 0 ? 1 : 0) as 0 | 1;
    out.push({
      pConfidence: 0.5 + ((i % 5) - 2) * 0.02,
      pIndependent: i % 3 === 0 ? 0.55 : null,
      y,
      groupKey: `g${i % 3}|ml`,
      marketP: null,
    });
  }
  return out;
}

describe("rpcp-conformal-bridge", () => {
  it("defaults offline (compute false)", () => {
    const r = rows(100);
    const control = buildRankingPowerControl(r);
    const b = buildRpcpConformalBridge({ rows: r, control });
    expect(b.computed).toBe(false);
    expect(b.unlocksProven).toBe(false);
    expect(b.raisesRes).toBe(false);
    expect(b.mapsStillOff).toBe(true);
    expect(b.conformalAbstainStillOff).toBe(true);
  });

  it("when compute=true, attaches residual threshold without flipping flags", () => {
    const r = rows(120);
    const control = buildRankingPowerControl(r);
    const b = buildRpcpConformalBridge({ rows: r, control, compute: true });
    expect(b.computed).toBe(true);
    expect(b.n).toBe(120);
    expect(b.residualThreshold).not.toBeNull();
    expect(b.unlocksProven).toBe(false);
    expect(b.raisesRes).toBe(false);
    expect(b.honesty).toMatch(/Coverage ≠ eligibility|coverage ≠ eligibility/i);
  });

  it("env posture never claims proven unlock", () => {
    const p = rpcpConformalBridgePosture({});
    expect(p.computeEnabled).toBe(false);
    expect(p.unlocksProven).toBe(false);
    expect(p.raisesRes).toBe(false);
    expect(p.productFlags.autoPublish).toBe(false);
  });
});
