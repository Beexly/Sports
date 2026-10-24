import { describe, expect, it } from "vitest";
import {
  coordinatorTension,
  tensionCostAddendum,
  BASELINE_RATE,
  BREAKER_THRESHOLD,
  MIN_SAMPLE,
} from "../coordinator-psychology-tensor";

const counted = {
  team: "CIN",
  formation: "11",
  down: "1",
  rate: 0.78,
  sampleN: 145,
  source: "counted from nflverse ftn_charting_2026 personnel column, weeks 1-6",
};

describe("coordinator tensor — evidence-gated", () => {
  it("grudge is a NAMED GAP because the ledger file is not in the repo", () => {
    const r = coordinatorTension({ team: "CIN", opponentCoach: "Mike Tomlin" });
    expect(r.grudgeScore).toBeNull();
    expect(r.grudgeGap).toContain("coaching_tree_and_grudge_ledger.jsonl is not in the repository");
    expect(r.q4ProeOverrideFires).toBe(false);
  });

  it("Q4 PROE override does not fire even with a strong tendency, without a grudge", () => {
    const r = coordinatorTension({ team: "CIN", opponentFormationRate: counted, opponentCoach: "Mike Tomlin" });
    expect(r.tendencyBreakerFires).toBe(true);
    expect(r.q4ProeOverrideFires).toBe(false);
  });

  it("tendency breaker fires from a counted rate 25+ points off baseline", () => {
    expect(BREAKER_THRESHOLD).toBe(0.25);
    expect(BASELINE_RATE).toBe(0.5);
    const r = coordinatorTension({ team: "CIN", opponentFormationRate: counted });
    expect(r.tendencyTension).toBeCloseTo(0.28, 2);
    expect(r.tendencyBreakerFires).toBe(true);
  });

  it("stays silent when the counted sample is thin", () => {
    const thin = { ...counted, sampleN: 8 };
    const r = coordinatorTension({ team: "CIN", opponentFormationRate: thin });
    expect(r.tendencyTension).toBeNull();
    expect(r.tendencyBreakerFires).toBe(false);
  });

  it("cost addendum is capped and zero without tension", () => {
    expect(tensionCostAddendum(null)).toBe(0);
    expect(tensionCostAddendum(0.28)).toBe(0.028);
    expect(tensionCostAddendum(0.9)).toBe(0.05);
  });

  it("a real grudge ledger row unlocks the override when supplied", () => {
    const r = coordinatorTension({
      team: "CIN",
      opponentCoach: "Mike Tomlin",
      opponentFormationRate: counted,
      grudgeLedger: [{ coach: "Zac Taylor-staff", opponentCoach: "Mike Tomlin", grudgeScore: 0.8, source: "future ledger" }],
    });
    expect(r.q4ProeOverrideFires).toBe(true);
    expect(r.grudgeGap).toBeNull();
  });
});

describe("threshold integrity", () => {
  it("min sample is enforced exactly", () => {
    expect(MIN_SAMPLE).toBe(20);
    const at = coordinatorTension({ team: "CIN", opponentFormationRate: { ...counted, sampleN: 20 } });
    expect(at.tendencyBreakerFires).toBe(true);
  });
});
