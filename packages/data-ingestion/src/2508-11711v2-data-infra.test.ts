/**
 * Tests for ./2508-11711v2-data-infra (arXiv:2508.11711v2, lane=data_infra).
 *
 * ACCEPTANCE GATE: ADAPT the static-gate doctrine iff the 7-day log review shows >=1 credible malicious-shape request blocked per week with zero false positives on legitimate leads; reject any LLM-in-the-security-path component unconditionally.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./2508-11711v2-data-infra";

describe("2508.11711v2 deterministic GraphQL static gate", () => {
  it("blocks oversized, deep, and non-ASCII payload shapes", () => {
    const rateWindow = { startMs: 0, count: 0 };
    const oversized = mod.applyGraphQlStaticGate({ query: "x".repeat(70000) }, rateWindow, 1)!;
    const deep = mod.applyGraphQlStaticGate({ query: "{a{b{c{d{e{f{g{h{i}}}}}}}}" }, rateWindow, 1)!;
    const unicode = mod.applyGraphQlStaticGate({ query: "query { café }" }, rateWindow, 1)!;
    expect(oversized.reasons).toContain("payload-cap");
    expect(deep.reasons).toContain("depth-cap");
    expect(unicode.reasons).toContain("character-allowlist");
  });

  it("applies a deterministic edge rate window", () => {
    const first = mod.applyGraphQlStaticGate({ query: "{ health }" }, { startMs: 0, count: 0 }, 1, {
      maxBytes: 100,
      maxDepth: 2,
      maxAliases: 5,
      maxFragments: 5,
      rateLimit: 1,
      rateWindowMs: 100,
    })!;
    const second = mod.applyGraphQlStaticGate({ query: "{ health }" }, first.nextRateWindow, 2, {
      maxBytes: 100,
      maxDepth: 2,
      maxAliases: 5,
      maxFragments: 5,
      rateLimit: 1,
      rateWindowMs: 100,
    })!;
    expect(first.allowed).toBe(true);
    expect(second.reasons).toContain("edge-rate-limit");
    expect(second.staticOnly).toBe(true);
  });

  it("requires seven days and zero legitimate false positives", () => {
    expect(mod.evaluateSecurityLogReview(7, 1, 0).passes).toBe(true);
    expect(mod.evaluateSecurityLogReview(7, 1, 1).passes).toBe(false);
    expect(mod.evaluateSecurityLogReview(6, 1, 0).passes).toBe(false);
    expect(mod.ENABLED).toBe(false);
  });
});
