import { describe, it, expect } from "vitest";
import {
  classifyAutopsy,
  AUTOPSY_CLASSES,
  COMPUTABLE_NOW_CLASSES,
  NEEDS_MORE_SIGNAL_CLASSES,
  getAutopsyClassSpec,
  type AutopsyInput,
  type AutopsyClass,
} from "../pick-autopsy.js";

describe("AUTOPSY_CLASSES registry", () => {
  it("contains all 16 taxonomy classes", () => {
    expect(AUTOPSY_CLASSES).toHaveLength(16);
  });

  it("splits into 11 computable-now and 5 needs-more-signal classes", () => {
    expect(COMPUTABLE_NOW_CLASSES).toHaveLength(11);
    expect(NEEDS_MORE_SIGNAL_CLASSES).toHaveLength(5);
    // The two sets are disjoint and cover the registry.
    for (const cls of COMPUTABLE_NOW_CLASSES) {
      expect(NEEDS_MORE_SIGNAL_CLASSES).not.toContain(cls);
    }
  });

  it("getAutopsyClassSpec resolves classes with their learning update", () => {
    expect(getAutopsyClassSpec("good-loss")?.computability).toBe("computable-now");
    expect(getAutopsyClassSpec("good-win")?.learningUpdate.length).toBeGreaterThan(0);
  });
});

describe("classifyAutopsy — the result × CLV matrix (process not scoreboard)", () => {
  it("good-win: won AND beat the close", () => {
    const r = classifyAutopsy({ result: "WIN", clvVerdict: "BEAT_CLOSE" });
    expect(r.cls).toBe("good-win");
  });

  it("good-loss reads as CLV-win/result-loss: beat the close, lost the game → preserve edge", () => {
    const r = classifyAutopsy({ result: "LOSS", clvVerdict: "BEAT_CLOSE" });
    expect(r.cls).toBe("CLV-win/result-loss");
    expect(r.reason).toMatch(/preserve|right process|variance/i);
  });

  it("bad-win reads as CLV-loss/result-win: won the game, lost the close → flagged, not rewarded", () => {
    const r = classifyAutopsy({ result: "WIN", clvVerdict: "LOST_TO_CLOSE" });
    expect(r.cls).toBe("CLV-loss/result-win");
    expect(r.reason).toMatch(/do not reward|luck|flattered/i);
  });

  it("bad-loss: lost AND lost to the close, with no execution/timing excuse", () => {
    const r = classifyAutopsy({ result: "LOSS", clvVerdict: "LOST_TO_CLOSE" });
    expect(r.cls).toBe("bad-loss");
  });

  it("market-already-corrected: lost both but the close had reached our number", () => {
    const r = classifyAutopsy({
      result: "LOSS",
      clvVerdict: "LOST_TO_CLOSE",
      lineMovement: { closeReachedOurNumber: true },
    });
    expect(r.cls).toBe("market-already-corrected");
  });

  it("bad-price: lost both, locked a worse price than the opener (execution lesson)", () => {
    const r = classifyAutopsy({
      result: "LOSS",
      clvVerdict: "LOST_TO_CLOSE",
      lineMovement: { lockedWorseThanOpener: true },
    });
    expect(r.cls).toBe("bad-price");
  });

  it("matched close + win → on-process good-win; matched close + loss → volatility-ignored", () => {
    expect(classifyAutopsy({ result: "WIN", clvVerdict: "MATCHED_CLOSE" }).cls).toBe("good-win");
    expect(classifyAutopsy({ result: "LOSS", clvVerdict: "MATCHED_CLOSE" }).cls).toBe("volatility-ignored");
  });
});

describe("classifyAutopsy — honesty defaults (never force a label)", () => {
  it("stale lock-time data overrides the matrix → stale-data", () => {
    const r = classifyAutopsy({
      result: "WIN",
      clvVerdict: "BEAT_CLOSE",
      freshness: { stale: true },
    });
    expect(r.cls).toBe("stale-data");
  });

  it("missing CLV verdict → insufficient-data (cannot separate process from luck)", () => {
    expect(classifyAutopsy({ result: "WIN", clvVerdict: null }).cls).toBe("insufficient-data");
    expect(classifyAutopsy({ result: "LOSS" }).cls).toBe("insufficient-data");
  });

  it("PUSH / VOID / PENDING → insufficient-data", () => {
    for (const result of ["PUSH", "VOID", "PENDING"] as const) {
      expect(classifyAutopsy({ result, clvVerdict: "BEAT_CLOSE" }).cls).toBe("insufficient-data");
    }
  });

  it("never returns any of the needs-more-signal classes (unreachable by design)", () => {
    const inputs: AutopsyInput[] = [
      { result: "WIN", clvVerdict: "BEAT_CLOSE" },
      { result: "LOSS", clvVerdict: "LOST_TO_CLOSE", lineMovement: { lockedWorseThanOpener: true } },
      { result: "WIN", clvVerdict: "LOST_TO_CLOSE" },
      { result: "LOSS", clvVerdict: "MATCHED_CLOSE", freshness: { stale: false } },
      { result: "VOID" },
      { result: "PENDING", clvVerdict: null },
    ];
    const blocked = new Set<AutopsyClass>(NEEDS_MORE_SIGNAL_CLASSES);
    for (const input of inputs) {
      const r = classifyAutopsy(input);
      expect(blocked.has(r.cls)).toBe(false);
      expect(COMPUTABLE_NOW_CLASSES).toContain(r.cls);
    }
  });
});
