import { describe, expect, it } from "vitest";
import {
  checkNumericConsistency,
  evaluateNumericGate,
  extractNumbers,
  runExplanationPipeline,
  type DraftFn,
  type OptimizerJson,
} from "./llm-explanation-gate-2508.js";

const optimizer: OptimizerJson = { edge: 0.042, winProb: 0.58, ev: 12.5 };

describe("llm explanation gate", () => {
  it("extractNumbers finds numeric mentions", () => {
    const nums = extractNumbers("Edge is 4.2% with win prob 0.58 and EV 12.5 units.");
    expect(nums.map((n) => n.value)).toEqual([4.2, 0.58, 12.5]);
  });

  it("passes a faithful draft", () => {
    const report = checkNumericConsistency(optimizer, "Model edge 4.2%, win probability 0.58, EV 12.5.");
    expect(report.faithfulness).toBe(1);
    expect(report.publishable).toBe(true);
    expect(report.hallucinated).toEqual([]);
  });

  it("flags hallucinated numbers", () => {
    const report = checkNumericConsistency(optimizer, "Model edge 4.2% and a 99% lock of the century.");
    expect(report.faithfulness).toBeCloseTo(0.5, 9);
    expect(report.publishable).toBe(false);
    expect(report.hallucinated.map((h) => h.raw)).toEqual(["99%"]);
  });

  it("matches percentages against value*100", () => {
    const report = checkNumericConsistency({ p: 0.58 }, "Win probability 58%.");
    expect(report.publishable).toBe(true);
  });

  it("runExplanationPipeline wires the injected draft fn", () => {
    const draftFn: DraftFn = (opt, role) => `${role} pick: edge ${(opt["edge"] ?? 0) * 100}%`;
    const res = runExplanationPipeline(optimizer, "bettor", draftFn);
    expect(res.decision).toBe("publish");
    expect(res.role).toBe("bettor");
  });

  it("evaluateNumericGate scores the numeric half of the gate", () => {
    const faithful: DraftFn = (opt) => `edge ${(opt["edge"] ?? 0) * 100}%`;
    const evaled = evaluateNumericGate(
      [
        { optimizer, role: "bettor" },
        { optimizer, role: "analyst" },
      ],
      faithful,
    );
    expect(evaled.meanFaithfulness).toBe(1);
    expect(evaled.numericGatePasses).toBe(true);
    const sloppy: DraftFn = () => "a 99% lock";
    expect(evaluateNumericGate([{ optimizer, role: "bettor" }], sloppy).numericGatePasses).toBe(false);
  });

  it("handles empty and malformed input", () => {
    expect(extractNumbers("")).toEqual([]);
    expect(extractNumbers(null as unknown as string)).toEqual([]);
    const report = checkNumericConsistency(optimizer, "No numbers here.");
    expect(Number.isNaN(report.faithfulness)).toBe(true);
    expect(report.publishable).toBe(false); // vacuous drafts do not auto-publish
    const empty = evaluateNumericGate([], () => "");
    expect(Number.isNaN(empty.meanFaithfulness)).toBe(true);
  });
});
