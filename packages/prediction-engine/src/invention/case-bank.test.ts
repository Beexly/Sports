import { describe, it, expect } from "vitest";
import {
  cosineSimilarity,
  retrieveTopK,
  reviseRank,
  retrieveCounterCase,
  retainGate,
  selectBestProductionCase,
  type DiscoveryCase,
} from "./case-bank.js";

// ============================================================
// arXiv 2402.17453v5 — DS-Agent case bank. Additive invention.
// ============================================================

const mk = (
  caseId: string,
  devScore: number,
  retainedFlag: boolean,
  embedding: number[],
  feedbackLog = "",
): DiscoveryCase => ({
  caseId,
  hypothesisText: `${caseId} hypothesis`,
  featureCode: "code()",
  backtestSpec: "spec",
  feedbackLog,
  devScore,
  stage3Score: null,
  retainedFlag,
  embedding,
});

describe("case bank — 2402.17453v5", () => {
  it("cosineSimilarity is 1 for identical embeddings", () => {
    expect(cosineSimilarity([1, 0], [1, 0])).toBeCloseTo(1, 10);
  });

  it("retrieveTopK ranks by similarity", () => {
    const bank = [mk("c1", 0.003, true, [1, 0]), mk("c2", 0.004, true, [0, 1])];
    const top = retrieveTopK(bank, [1, 0], 2);
    expect(top[0]!.caseId).toBe("c1");
    expect(top.length).toBe(2);
  });

  it("reviseRank demotes cases matching failure keywords", () => {
    const good = mk("good", 0.005, true, [1, 0], "clean run");
    const bad = mk("bad", 0.009, true, [1, 0], "leaky backtest: lookahead bias");
    const ranked = reviseRank([bad, good], ["leak", "lookahead"]);
    expect(ranked[0]!.caseId).toBe("good");
  });

  it("reviseRank falls back to devScore without keyword hits", () => {
    const a = mk("a", 0.003, true, [1, 0], "ok");
    const b = mk("b", 0.005, true, [1, 0], "ok");
    expect(reviseRank([a, b], ["leak"])[0]!.caseId).toBe("b");
  });

  it("retrieveCounterCase finds the most similar failure", () => {
    const success = mk("s", 0.005, true, [1, 0]);
    const failNear = mk("f1", -0.001, false, [0.9, 0.1], "overfit");
    const failFar = mk("f2", -0.002, false, [0, 1], "overfit");
    const other = mk("s2", 0.004, true, [0.95, 0.05]);
    const counter = retrieveCounterCase([success, failNear, failFar, other], success);
    expect(counter!.caseId).toBe("f1");
    expect(retrieveCounterCase([success, other], success)).toBeNull();
  });

  it("retainGate enforces the 0.002 Stage-2 bar", () => {
    expect(retainGate(0.002)).toBe(true);
    expect(retainGate(0.0019)).toBe(false);
  });

  it("selectBestProductionCase picks max devScore among retained", () => {
    const bank = [
      mk("a", 0.003, true, [1, 0]),
      mk("b", 0.009, false, [1, 0]),
      mk("c", 0.005, true, [1, 0]),
    ];
    expect(selectBestProductionCase(bank)!.caseId).toBe("c");
    expect(selectBestProductionCase([])).toBeNull();
  });
});
