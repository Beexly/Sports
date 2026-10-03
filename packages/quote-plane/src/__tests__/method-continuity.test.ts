import { describe, expect, it } from "vitest";
import {
  assertMethodContinuity,
  computeContinuousClv,
  publishableContinuousClv,
} from "../clv/method-continuity";

const open = {
  q: 0.48,
  methodTag: "multiplicative_devig_v1" as const,
  modelVersion: "fair.v1",
};
const close = {
  q: 0.52,
  methodTag: "multiplicative_devig_v1" as const,
  modelVersion: "fair.v1",
};

describe("assertMethodContinuity", () => {
  it("accepts matching method + modelVersion", () => {
    const r = assertMethodContinuity(open, close);
    expect(r.ok).toBe(true);
  });

  it("refuses method mismatch", () => {
    const r = assertMethodContinuity(open, {
      ...close,
      methodTag: "shin_v2",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("method_mismatch");
  });

  it("refuses modelVersion mismatch", () => {
    const r = assertMethodContinuity(open, {
      ...close,
      modelVersion: "fair.v2",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("model_version_mismatch");
  });

  it("refuses missing tags", () => {
    const r = assertMethodContinuity(
      { ...open, methodTag: "" },
      close,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("missing_method_tag");
  });
});

describe("computeContinuousClv", () => {
  it("computes long CLV when continuous", () => {
    const r = computeContinuousClv({ open, close, side: "long" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.clv).toBeCloseTo(0.04, 6);
      expect(r.methodTag).toBe("multiplicative_devig_v1");
      expect(r.interpretation).toBe("beat_close");
    }
  });

  it("refuses before CLV when methods differ", () => {
    const r = computeContinuousClv({
      open,
      close: { ...close, methodTag: "model_prior_v1" },
      side: "long",
    });
    expect(r.ok).toBe(false);
  });
});

describe("publishableContinuousClv", () => {
  it("refuses below nMin", () => {
    const row = computeContinuousClv({ open, close, side: "long" });
    const pub = publishableContinuousClv([row], 50);
    expect(pub.publishable).toBe(false);
    expect(pub.n).toBe(1);
  });
});
