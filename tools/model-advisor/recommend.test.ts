import { describe, expect, it } from "vitest";
import { MODEL_CATALOG } from "./catalog";
import { recommendModel } from "./recommend";
import type { TaskProfile } from "./types";

describe("recommendModel", () => {
  it("routes trivial local-only coding to a local model", () => {
    const rec = recommendModel({ kind: "coding", complexity: 2, privacy: "local-only" });
    expect(rec.tier).toBe("local");
    expect(rec.primary.localRunnable).toBe(true);
  });

  it("routes multimodal work to Muse Glimmer locally", () => {
    const rec = recommendModel({ kind: "multimodal", complexity: 4 });
    expect(rec.primary.id).toBe("muse-glimmer-30b");
    expect(rec.tier).toBe("local");
  });

  it("routes the hardest coding to an Anthropic frontier model", () => {
    const rec = recommendModel({ kind: "coding", complexity: 10 });
    expect(rec.tier).toBe("frontier");
    expect(rec.primary.provider).toBe("Anthropic");
  });

  it("routes bulk work to the batch tier", () => {
    const rec = recommendModel({ kind: "bulk", complexity: 5 });
    expect(rec.tier).toBe("batch");
  });

  it("routes very large contexts to a 1M-context model", () => {
    const rec = recommendModel({
      kind: "long-context",
      complexity: 6,
      contextTokens: 500_000,
    });
    expect(rec.primary.contextTokens).toBeGreaterThanOrEqual(1_000_000);
  });

  it("never returns a non-local model when privacy is local-only", () => {
    for (let complexity = 1; complexity <= 10; complexity++) {
      const kinds: TaskProfile["kind"][] = [
        "coding",
        "reasoning",
        "agentic",
        "long-context",
        "multimodal",
        "bulk",
      ];
      for (const kind of kinds) {
        const rec = recommendModel({ kind, complexity, privacy: "local-only" });
        expect(rec.primary.localRunnable).toBe(true);
        for (const fb of rec.fallbacks) expect(fb.localRunnable).toBe(true);
      }
    }
  });

  it("downgrades paid tiers to local when budget is free", () => {
    const rec = recommendModel({ kind: "coding", complexity: 9, budget: "free" });
    expect(rec.tier).toBe("local");
    expect(rec.primary.localRunnable).toBe(true);
  });
});

describe("MODEL_CATALOG integrity", () => {
  it("has complete, verified-or-known entries only", () => {
    expect(MODEL_CATALOG.length).toBeGreaterThan(0);
    for (const entry of MODEL_CATALOG) {
      expect(entry.id).not.toBe("");
      expect(entry.label).not.toBe("");
      expect(entry.license).not.toBe("");
      expect(entry.roles.length).toBeGreaterThan(0);
      expect(["verified", "known-real"]).toContain(entry.verification);
    }
  });

  it("has unique ids", () => {
    const ids = MODEL_CATALOG.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("keeps local entries priced null (no fabricated pricing)", () => {
    for (const entry of MODEL_CATALOG.filter((m) => m.localRunnable)) {
      expect(entry.reportedInputUsdPerM).toBeNull();
      expect(entry.reportedOutputUsdPerM).toBeNull();
    }
  });
});
